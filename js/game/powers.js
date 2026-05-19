import { state, players } from '../core/state.js';
import { nextTurn, resolveVote } from './engine.js';
import { Logger } from '../ui/logger.js';
import { POWER_MAP } from '../core/constants.js';
import { render, syncTerminals, triggerWin, updatePlayerStatusUI, clearCouncilVisuals, updateCensureUI } from '../ui/renderer.js';

/**
 * Analyse biologique d'un joueur (Pouvoir du Docteur ou Case de Crise)
 */
export function testPlayerBlood(requester, targetName) {
    const target = players.find(p => p.name === targetName);
    if (!target) return;

    const isInfected = ['A', 'I', 'IM'].includes(target.role);
    const bloodResult = isInfected ? "INFECTÉ" : "SAIN";

    Logger.add(`POUVOIR : ${requester.name} a analysé ${targetName}.`);

    requester.conn.send({
        type: 'BLOOD_TEST_RESULT',
        target: targetName,
        result: bloodResult,
        isForced: state.currentPowerActive
    });
}

/**
 * Exécution (Pouvoir du Militaire ou Case de Crise)
 */
export function executePlayer(requester, targetName) {
    const target = players.find(p => p.name === targetName);
    if (!target || !target.isAlive) return;

    target.isAlive = false;

    // --- Synchronisation immédiate de la liste des vivants ---
    syncTerminals();

    // ✨ FIX CRITIQUE : Nettoyage du vote si la cible est abattue EN PLEIN SCRUTIN
    if (state.currentPhase === "VOTE") {
        const voteIdx = state.votes.list.findIndex(v => v.name.toLowerCase() === targetName.toLowerCase());
        if (voteIdx !== -1) {
            const oldVote = state.votes.list[voteIdx];
            
            // On retire l'influence de son vote (prend en compte Shérif, Fossoyeur, Suffrages...)
            // Vu que le poids dynamique est complexe, on recalcule ou on déduit. 
            // Pour faire simple et ultra-fiable, on va laisser handleVote gérer le poids global 
            // mais ici on nettoie directement les variables selon ce qu'il avait choisi :
            if (oldVote.choice === 'OUI') {
                // Si c'est un Shérif ou un passif complexe, on recalcule proprement la jauge globale
                // Pour éviter les approximations, on va simplement reconstruire les scores de zéro :
            }
            
            Logger.add(`SYSTÈME : Le sujet ${targetName} a été éliminé. Son vote est révoqué.`);
        }

        // --- RECALCUL PROPRE ET SÉCURISÉ DES VOTES TRANSMIS ---
        // On recalcule les scores de zéro sans le mort pour éviter tout décalage de variables
        state.votes.oui = 0;
        state.votes.non = 0;
        state.votes.total = 0;
        
        // On filtre la liste pour éjecter le mort s'il y était encore
        state.votes.list = state.votes.list.filter(v => v.name.toLowerCase() !== targetName.toLowerCase());
        
        // On simule une ré-application des votes restants pour reconstruire state.votes.oui / non / total
        state.votes.list.forEach(v => {
            const pVoter = players.find(p => p.name.toLowerCase() === v.name.toLowerCase());
            if (pVoter && pVoter.isAlive) {
                let weight = 1;
                if (pVoter.metier === 'Shérif') weight = 2;
                if (pVoter.metier === 'Fossoyeur') weight += players.filter(p => !p.isAlive).length;
                
                if (state.slotsSuffrageCard === 'conseil_restreint' && (pVoter.name === players[state.curG].name || v.name === state.currentProposedS)) weight = 2;
                if (state.slotsSuffrageCard === 'greve_zele' && v.choice === 'NON') weight = 2;
                if (state.slotsSuffrageCard === 'insurrection_populaire' && pVoter.metier === 'Civil') weight = 2;

                state.votes[v.choice.toLowerCase()] += weight;
                state.votes.total += weight;
            }
        });

        const eligibleCount = players.filter(p => p.isAlive && !p.isCensored).length;
        const totalJoueursAyantVote = state.votes.list.length;

        // Mise à jour de l'affichage PC central immédiatement
        const summary = document.getElementById('vote-summary');
        if (summary) {
            summary.innerText = `SCRUTIN EN COURS : Approuvez-vous ce conseil ?\nVOTES TRANSMIS : ${totalJoueursAyantVote} / ${eligibleCount}`;
        }

        if (totalJoueursAyantVote === eligibleCount) {
            Logger.add("SYSTÈME : La mort du dernier votant attendu clôture le scrutin.");
            resolveVote();
            return; // On coupe court pour éviter le double appel en bas
        }
    }

    // --- LE RESTE DE TON CODE EXECUTEPLAYER RESTE IDENTIQUE ---
    const isInfected = ['A', 'I', 'IM'].includes(target.role);
    const revealResult = isInfected ? "INFECTÉ" : "SAIN";

    Logger.add(`🚨 EXÉCUTION : ${requester.name} a éliminé ${targetName}.`);
    Logger.add(`SYSTÈME : Le sujet ${targetName} était ${revealResult}.`);
    
    target.conn.send({ type: 'YOU_ARE_DEAD', reveal: revealResult });

    players.forEach(p => {
        if (p.conn && p.conn.open && p.name.toLowerCase() !== requester.name.toLowerCase()) {
            p.conn.send({ type: 'REFRESH_INTERFACE' }); 
        }
    });

    updatePlayerStatusUI(target, revealResult);

    if (target.role === 'A') {
        return triggerWin("SURVIVANTS", "L'Alpha a été éliminé du complexe.");
    }

    requester.conn.send({
        type: 'EXECUTION_RESULT',
        target: targetName,
        result: revealResult,
        isForced: state.currentPowerActive
    });

    const targetIdx = players.findIndex(p => p.name === targetName);
    if (targetIdx === state.curG || targetIdx === state.curSIdx) {
        clearCouncilVisuals();
        Logger.add("🚨 SYSTÈME : Membre du conseil exécuté ! Dissolution et transition forcée.");
        state.currentPowerActive = false; 
        state.isProcessingAction = false;

        setTimeout(() => {
            state.curG = (state.curG + 1) % players.length;
            nextTurn();
        }, 2000);
    }
}

/**
 * Censure (Pouvoir du Décret Censure ou Case de Crise)
 */
export function applyCensure(requester, targetName) {
    const target = players.find(p => p.name === targetName);
    if (!target || !target.isAlive || target.isCensored) return;

    target.isCensored = true;
    target.censoredBy = requester.name;

    Logger.add(`🚫 CENSURE : ${requester.name} a réduit ${targetName} au silence.`);

    // Si un vote est en cours, on agit immédiatement sur le scrutin
    if (state.currentPhase === "VOTE") {
        const voteIdx = state.votes.list.findIndex(v => v.name.toLowerCase() === targetName.toLowerCase());
        if (voteIdx !== -1) {
            const oldVote = state.votes.list[voteIdx];
            state.votes[oldVote.choice.toLowerCase()]--;
            state.votes.total--;
            state.votes.list.splice(voteIdx, 1);
            Logger.add(`SYSTÈME : Le vote de ${targetName} a été retiré du scrutin.`);
        }
        
        // On envoie l'écran de censure au mobile ciblé immédiatement
        target.conn.send({ type: 'CENSORED_ALERT', by: requester.name });
        
        // --- SÉCURITÉ ANTI-BLOCAGE ---
        // On compte combien de joueurs éligibles doivent ENCORE voter physiquement
        const votesAttendusRestants = players.filter(p => 
            p.isAlive && 
            !p.isCensored && 
            !state.votes.list.some(v => v.name.toLowerCase() === p.name.toLowerCase())
        ).length;
    
        // Si plus personne ne peut ou ne doit voter, on clôture le scrutin immédiatement !
        if (votesAttendusRestants === 0) {
            Logger.add("SYSTÈME : Plus aucun vote n'est attendu. Clôture automatique du scrutin.");
            resolveVote();
        } else {
            // Sinon, on met juste à jour le compteur sur l'écran PC avec le nouveau total
            const eligibleCount = players.filter(p => p.isAlive && !p.isCensored).length;
            document.getElementById('vote-summary').innerText = `SCRUTIN EN COURS : Approuvez-vous ce conseil ?\nVOTES TRANSMIS : ${state.votes.total} / ${eligibleCount}`;
        }
    }

    updateCensureUI(target);
    syncTerminals();

    // On envoie le rapport de censure au Gardien
    requester.conn.send({
        type: 'CENSURE_RESULT',
        target: targetName,
        isForced: state.currentPowerActive
    });
}

/**
 * Vérification des pouvoirs lors de l'atteinte d'une case de crise
 */
export function checkCasePower(caseNumber) {
    const n = players.length;
    const config = POWER_MAP[n] || POWER_MAP['default'];
    const power = config[caseNumber];

    if (!power) return;

    state.currentPowerActive = true;
    const gardien = players[state.curG];
    Logger.add(`SYSTÈME : Case de Crise ${caseNumber} atteinte. Protocole : ${power}.`);

    switch (power) {
        case 'TEST':
            gardien.conn.send({ 
                type: 'FORCE_POWER_SELECT', 
                action: 'REQUEST_BLOOD_TEST', 
                title: 'ANALYSE BIOLOGIQUE (DÉCRET)' 
            });
            break;
        case 'CENSURE':
            gardien.conn.send({ 
                type: 'FORCE_POWER_SELECT', 
                action: 'REQUEST_CENSURE', 
                title: 'PROTOCOLE DE CENSURE' 
            });
            break;
        case 'EXEC':
            gardien.conn.send({ 
                type: 'FORCE_POWER_SELECT', 
                action: 'REQUEST_EXECUTION', 
                title: 'EXÉCUTION SOMMAIRE' 
            });
            break;
    }
}


export function purgeCriseCard(requester, cardId) {
    const idx = state.slotsCriseCards.indexOf(cardId);
    if (idx === -1) return;

    // 1. On retire physiquement la carte de la jauge et on baisse le score
    state.slotsCriseCards.splice(idx, 1);
    state.crise--;
    
    // 2. On envoie la carte purgée dans la défausse
    state.discard.push(cardId);
    
    Logger.add(`🧹 PURGE : ${requester.name} a purgé le décret '${cardId.toUpperCase()}' du plateau.`);
    Logger.add(`SYSTÈME : La jauge de Crise recule et passe à ${state.crise}/6.`);

    // 3. FIN DES EFFETS PERMANENTS : Si on a purgé une fuite d'air rouge, l'atmosphère se détend immédiatement
    // (L'oxygène max se recalculera tout seul au prochain reset ou rendu)
    
    // 4. On envoie le récapitulatif dédié à la purge au Gardien
    requester.conn.send({
        type: 'PURGE_RESULT',
        cardId: cardId,       // On passe explicitement l'ID de la carte
        isForced: state.currentPowerActive
    });

    // On rafraîchit l'écran PC central
    render();
    syncTerminals();
}

/**
 * Exécute l'effet immédiat (symbole ⚡) d'un décret promulgué
 * @param {string} cardId - L'identifiant unique du décret (ex: 'sabotage', 'censure')
 * @returns {boolean} - true si le décret demande une action interactive (sélection de cible), false sinon
 */
export function executeDecreetPower(cardId) {
    const gardien = players[state.curG];
    
    switch (cardId) {
        case 'sabotage':
            state.oxy--;
            Logger.add("🚨 SABOTAGE : Les systèmes de ventilation ont été ciblés. L'oxygène baisse de 1 !");
            return false; // Effet instantané, ne bloque pas le flux du tour

        case 'censure':
            state.currentPowerActive = true; 
            Logger.add(`🚫 DÉCRET DE CENSURE : Protocole activé. En attente de la cible du Gardien (${gardien.name}).`);
            
            // 1. On force le Gardien actuel à choisir sa cible
            if (gardien && gardien.conn && gardien.conn.open) {
                gardien.conn.send({ 
                    type: 'FORCE_POWER_SELECT', 
                    action: 'REQUEST_CENSURE', 
                    title: 'CENSURE GOUVERNEMENTALE (DÉCRET)' 
                });
            }
            // On met tous les AUTRES joueurs en attente avec l'écran violet
            players.forEach(p => {
                if (p.isAlive && p.name.toLowerCase() !== gardien.name.toLowerCase() && p.conn && p.conn.open) {
                    p.conn.send({ 
                        type: 'WAIT_POWER', 
                        gardienName: gardien.name, 
                        title: 'CENSURE GOUVERNEMENTALE' 
                    });
                }
            });
            return true;

        case 'test_sanguin':
            state.currentPowerActive = true; // On bloque la transition automatique de tour
            Logger.add(`🩸 DÉCRET TEST SANGUIN : Protocole d'analyse activé. En attente du choix du Gardien (${gardien.name}).`);
            
            // 1. On ouvre le sélecteur sur le téléphone du Gardien
            if (gardien && gardien.conn && gardien.conn.open) {
                gardien.conn.send({ 
                    type: 'FORCE_POWER_SELECT', 
                    action: 'REQUEST_BLOOD_TEST', 
                    title: 'ANALYSE BIOLOGIQUE (DÉCRET)' 
                });
            }
            // 2. On met tous les autres en attente (Écran violet d'immersion)
            players.forEach(p => {
                if (p.isAlive && p.name.toLowerCase() !== gardien.name.toLowerCase() && p.conn && p.conn.open) {
                    p.conn.send({ 
                        type: 'WAIT_POWER', 
                        gardienName: gardien.name, 
                        title: 'ANALYSE BIOLOGIQUE' 
                    });
                }
            });
            return true;

        case 'purge':
            state.currentPowerActive = true;
            Logger.add(`🧹 DÉCRET PURGE DES SYSTÈMES : Protocole activé. Le Gardien (${gardien.name}) va nettoyer une directive de crise.`);
            
            if (gardien && gardien.conn && gardien.conn.open) {
                gardien.conn.send({
                    type: 'FORCE_POWER_SELECT',
                    action: 'REQUEST_PURGE', // Nouveau type d'action
                    title: 'PURGE DES SYSTÈMES (DÉCRET)'
                });
            }
            
            players.forEach(p => {
                if (p.isAlive && p.name.toLowerCase() !== gardien.name.toLowerCase() && p.conn && p.conn.open) {
                    p.conn.send({
                        type: 'WAIT_POWER',
                        gardienName: gardien.name,
                        title: 'PURGE DES SYSTÈMES'
                    });
                }
            });
            return true;

        case 'court_circuit':
            Logger.add(`⚡ DÉCRET COURT-CIRCUIT : Dysfonctionnement électrique imminent !`);
            
            // 1. On vérifie s'il y a un suffrage actif sur le plateau
            if (state.slotsSuffrageCard) {
                const ancientCardId = state.slotsSuffrageCard;
                
                // On envoie le suffrage détruit dans la défausse
                state.discard.push(ancientCardId);
                Logger.add(`♻️ SYSTÈME : La carte de Suffrage active '${ancientCardId.toUpperCase()}' a été court-circuitée et envoyée à la défausse.`);
                
                // On nettoie les variables du State
                state.slotsSuffrageCard = null;
                state.suffrage = "Aucun";
            } else {
                // 2. Si aucun suffrage n'est en place, les générateurs d'oxygène prennent le choc
                state.oxy--;
                Logger.add(`📉 ATMOSPHÈRE : Aucune carte de Suffrage active. Le court-circuit endommage les épurateurs : l'Oxygène diminue de 1 (Reste : ${state.oxy}).`);
            }
            return false;

        case 'coup_etat':
            state.currentPowerActive = true; 
            Logger.add(`🚨 DÉCRET COUP D'ÉTAT : Instabilité politique ! Le Gardien (${gardien.name}) va nommer son successeur.`);
            
            // 1. On force le Gardien à choisir un joueur (hors lui-même, géré par le mobile)
            if (gardien && gardien.conn && gardien.conn.open) {
                gardien.conn.send({ 
                    type: 'FORCE_POWER_SELECT', 
                    action: 'REQUEST_COUP_ETAT', 
                    title: 'COUP D\'ÉTAT (DÉCRET)' 
                });
            }
            // 2. On met les autres en attente
            players.forEach(p => {
                if (p.isAlive && p.name.toLowerCase() !== gardien.name.toLowerCase() && p.conn && p.conn.open) {
                    p.conn.send({ 
                        type: 'WAIT_POWER', 
                        gardienName: gardien.name, 
                        title: 'COUP D\'ÉTAT INTERNE' 
                    });
                }
            });
            return true;

        case 'loi_493':
            state.loi493Active = true;
            Logger.add(`🔨 DECRET 49.3 : Protocole d'inversion enclenché. Au prochain conseil, le Gardien choisira lui-même le décret final !`);
            return false;

        case 'reelection':
            Logger.add(`🗳️ DÉCRET RÉÉLECTION : Le protocole fige le Conseil actuel pour le prochain tour.`);
            // on recule l'index de 1 en avance. Comme ça, après l'incrémentation, 
            // on retombe exactement sur le même Gardien.
            state.curG = (state.curG - 1 + players.length) % players.length;
            // On conserve aussi la même Sentinelle pour le tour suivant
            // (Si ton moteur réinitialise state.currentProposedS, cette ligne garantit qu'on garde la bonne)
            state.nextForcedS = state.currentProposedS; 
            return false;
            
        default:
            // Pour l'instant, les autres cartes n'ont pas d'effet immédiat codé
            return false;
    }
}
