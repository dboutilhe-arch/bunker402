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

    // --- CORRECTION VOTE BLOQUÉ ---
    if (state.currentPhase === "VOTE") {
        const aliveCount = players.filter(p => p.isAlive).length;
        if (state.votes.total >= aliveCount) {
            Logger.add("SYSTÈME : L'exécution a clos le scrutin.");
            resolveVote();
        }
    }

    const isInfected = ['A', 'I', 'IM'].includes(target.role);
    const revealResult = isInfected ? "INFECTÉ" : "SAIN";

    Logger.add(`🚨 EXÉCUTION : ${requester.name} a éliminé ${targetName}.`);
    Logger.add(`SYSTÈME : Le sujet ${targetName} était ${revealResult}.`);

    // On envoie le signal de mort au joueur éliminé
    target.conn.send({ type: 'YOU_ARE_DEAD', reveal: revealResult });

    // On demande de rafraîchir l'interface à TOUT LE MONDE... SAUF au tueur !
    players.forEach(p => {
        if (p.conn && p.conn.open && p.name.toLowerCase() !== requester.name.toLowerCase()) {
            p.conn.send({ type: 'REFRESH_INTERFACE' }); 
        }
    });

    updatePlayerStatusUI(target, revealResult);

    // ─── PRIORITÉ 1 : CONDITION DE VICTOIRE (SI C'EST L'ALPHA) ──────────────────
    // On le vérifie AVANT toute chose, même si l'Alpha était au Conseil !
    if (target.role === 'A') {
        return triggerWin("SURVIVANTS", "L'Alpha a été éliminé du complexe.");
    }

    // ─── PRIORITÉ 2 : ENVOI DU RÉCAPITULATIF AU TUEUR (MILITAIRE OU GARDIEN) ────
    // On l'envoie TOUJOURS pour que le Militaire ou le Gardien voit les rôles s'afficher
    requester.conn.send({
        type: 'EXECUTION_RESULT',
        target: targetName,
        result: revealResult,
        isForced: state.currentPowerActive // Permet au mobile de savoir si c'est un décret bloquant
    });

    // ─── PRIORITÉ 3 : SÉCURITÉ CONSEIL FOUDROYÉ ─────────────────────────────────
    // Si la cible était au conseil, on dissout immédiatement et on court-circuite le clic sur "OK"
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
    
    // 4. On envoie le récapitulatif standard au Gardien pour qu'il ait son bouton OK
    requester.conn.send({
        type: 'CENSURE_RESULT', // On réutilise le template visuel violet "TERMINAL VERROUILLÉ / OK"
        target: cardId,         // On détourne la variable target pour afficher le nom de la carte
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
            
        default:
            // Pour l'instant, les autres cartes n'ont pas d'effet immédiat codé
            return false;
    }
}
