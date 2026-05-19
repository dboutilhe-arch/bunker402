import { state, players, resetGameState } from '../core/state.js'; 
import { ROLE_COMPOSITIONS, JOBS_LIST, INITIAL_DECK_LIST, DECREETS_DATABASE } from '../core/constants.js';
import { 
    render, 
    updateTagsWithJobs,  
    displayComposition, 
    updateLastCouncil, 
    syncTerminals, 
    triggerWin,
    resetLobbyVisuals,
    clearCouncilVisuals,
    resetVoteColors,
    rebuildActivePlayerTags
} from '../ui/renderer.js';
import { Logger } from '../ui/logger.js';
import { checkCasePower, executeDecreetPower } from './powers.js';

// --- LOGIQUE DE JEU ---

/**
 * Fonction utilitaire de pioche sécurisée avec recyclage de la défausse
 */
function drawCard() {
    if (state.deck.length === 0) {
        if (state.discard.length === 0) {
            Logger.add("ALERTE CRITIQUE : Plus aucune carte disponible dans tout le complexe !");
            return null;
        }
        // Recyclage
        state.deck = [...state.discard].sort(() => Math.random() - 0.5);
        state.discard = [];
        Logger.add("🔊 SYSTÈME : Pioche épuisée. Défausse recyclée et remélangée.");
    }
    return state.deck.pop();
}

/**
 * Initialisation de la partie et distribution des rôles/métiers
 */
export async function initGame() {
    const n = players.length;

    for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [players[i], players[j]] = [players[j], players[i]];
    }
    rebuildActivePlayerTags();
    Logger.add("SYSTÈME : Ordre opérationnel du personnel mélangé.");

    // --- INITIALISATION DU PAQUET VIA L'ORDRE DES CARTES COMPLETS ---
    state.deck = [...INITIAL_DECK_LIST].sort(() => Math.random() - 0.5);
    state.discard = [];
    
    Logger.add(`SYSTÈME : Deck de décrets sécurisés initialisé (${state.deck.length} cartes).`);

    let roles = ROLE_COMPOSITIONS[n] ? [...ROLE_COMPOSITIONS[n]] : ROLE_COMPOSITIONS.default(n);
    roles.sort(() => Math.random() - 0.5);
    const alphaIndex = roles.indexOf('A');
    const alphaName = alphaIndex !== -1 ? players[alphaIndex].name : "Inconnu";

    let finalJobsDistribution = [];
    const availableJobs = [...JOBS_LIST].sort(() => Math.random() - 0.5);
    for (let i = 0; i < n; i++) {
        finalJobsDistribution.push(i < availableJobs.length ? availableJobs[i] : "Civil");
    }
    finalJobsDistribution.sort(() => Math.random() - 0.5);

    for (let i = 0; i < n; i++) {
        let p = players[i];
        p.role = roles[i];
        p.metier = finalJobsDistribution[i];
        p.jobPowerUsed = false;
        p.casePowerUsed = false;
        p.isAlive = true;
        p.blood = ['A', 'I', 'IM'].includes(p.role) ? "INFECTÉ" : "SAIN";

        const canSeeAlpha = ['I', 'A', 'M'].includes(p.role);
        p.conn.send({
            type: 'INIT',
            role: p.role,
            metier: p.metier,
            all: players.map(pl => pl.name),
            alphaName: canSeeAlpha ? alphaName : null 
        });
        await new Promise(r => setTimeout(r, 50));
    }

    updateTagsWithJobs();
    displayComposition(roles);
    document.getElementById('setup-zone').style.display = 'none';
    document.getElementById('game-info-row').style.display = 'flex';
    document.getElementById('game-zone').style.display = 'block';
    nextTurn();
}

/**
 * Début d'un nouveau tour (Désignation du conseil)
 */
export function nextTurn() {
    state.currentPhase = "DÉSIGNATION";
    render();

    // ✨ FIX RÉÉLECTION : Si une sentinelle est forcée par le décret, on restaure son index immédiatement
    if (state.nextForcedS) {
        state.curSIdx = players.findIndex(p => p.name === state.nextForcedS);
        state.currentProposedS = state.nextForcedS;
        state.nextForcedS = null; // Effet consommé, on vide l'ancre
    } else {
        // Flux normal : si pas de réélection, la Sentinelle repasse à -1 pour le nouveau Gardien
        state.curSIdx = -1;
        state.currentProposedS = null;
    }

    let attempts = 0;
    while (!players[state.curG].isAlive && attempts < players.length) {
        state.curG = (state.curG + 1) % players.length;
        attempts++;
    }
    
    const activeG = players[state.curG];
    const tags = document.querySelectorAll(`[id="tag-${activeG.name.toLowerCase()}"]`);
    tags.forEach(tag => {
        const nameDiv = tag.querySelector('.p-name');
        if (nameDiv) nameDiv.innerHTML = `⭐ ${activeG.name.toUpperCase()}`;
        tag.style.borderColor = "#f1c40f"; tag.style.borderWidth = "2px";
    });

    Logger.add(`SYSTÈME : Désignation du nouveau Gardien : ${activeG.name.toUpperCase()}`);
    state.votes.oui = 0; state.votes.non = 0; state.votes.total = 0; state.votes.list = [];
    
    document.getElementById('vote-summary').innerText = "DÉSIGNATION DU CONSEIL... ";
    document.getElementById('g-name').innerText = activeG.name;
    // ✨ Ajustement visuel : On affiche directement la Sentinelle reconduite au lieu du "?"
    document.getElementById('s-name').innerText = state.curSIdx !== -1 ? state.currentProposedS : "?";

    players.filter(p => p.isAlive).forEach(p => p.conn.send({ type: 'CLEAN_UI' }));
    players.filter(p => p.isAlive).forEach((p, index) => {
        if(index !== state.curG) p.conn.send({ type: 'WAIT_SENTINELLE', gardienName: activeG.name });
    });

    let eligiblePlayers = players.filter(p => p.isAlive).map(p => p.name).filter(name => {
        if (name === activeG.name) return false;
        if (name === state.lastSentinelle) return false;
        if (players.length > 5 && name === state.lastGardien) return false;
        if (state.vigileBannedPlayer && name.toLowerCase() === state.vigileBannedPlayer.toLowerCase()) return false;
        return true;
    });
    
    // RÉÉLECTION
    if (state.curSIdx !== -1 && state.currentPhase === "DÉSIGNATION") {
        const currentS = players[state.curSIdx];
        Logger.add(`⚖️ SYSTÈME : Réélection active. Passage direct à la législation pour ${activeG.name} & ${currentS.name}.`);
        
        state.currentPhase = "LÉGISLATION_G";
        
        const countToDraw = state.archivistePowerActive ? 4 : 3;
        state.currentLegislativeCards = [];
        for (let i = 0; i < countToDraw; i++) {
            state.currentLegislativeCards.push(drawCard()); 
        }
        state.currentLegislativeCards = state.currentLegislativeCards.filter(Boolean);
        
        if (state.archivistePowerActive) state.archivistePowerActive = false;

        players.filter(p => p.isAlive).forEach(p => p.conn.send({ type: 'WAIT_LEGISLATION', step: 'GARDIEN' }));
        
        setTimeout(() => {
            activeG.conn.send({ type: 'GARDIEN_PICK', cards: state.currentLegislativeCards });
        }, 100);

        syncTerminals(); 
        render();
        return; 
    }

    // --- FLUX NORMAL (Si pas de réélection) ---
    activeG.conn.send({ type: 'YOUR_TURN', eligible: eligiblePlayers });
    syncTerminals(); 
    render();
}

/**
 * Calcul du résultat du vote
 */
export function resolveVote() {
    // NETTOYAGE DES CENSURES : Le vote est fini, on réinitialise les statuts pour le prochain tour
    players.forEach(p => { 
        p.isCensored = false; 
        p.censoredBy = ""; 
    });

    // FIX VIGILE : Le ban expire dès que le vote est résolu
    state.vigileBannedPlayer = null;
    
    // 1. Gestion de l'affichage des couleurs (Prend en compte la Chambre Noire)
    state.votes.list.forEach(v => {
        const tags = document.querySelectorAll(`[id="tag-${v.name.toLowerCase()}"]`);
        if (state.slotsSuffrageCard === 'chambre_noire') {
            tags.forEach(t => t.classList.add('voted-secret'));
        } else {
            tags.forEach(t => t.classList.add(v.choice === 'OUI' ? 'voted-oui' : 'voted-non'));
        }
    });

    // 1.1. CALCUL DES PERSONNES PHYSIQUES AYANT VOTÉ OUI / NON
    const countPhysiqueOui = state.votes.list.filter(v => v.choice === 'OUI').length;
    const countPhysiqueNon = state.votes.list.filter(v => v.choice === 'NON').length;

    // 1.2. DÉTERMINATION DYNAMIQUE DU RÉSULTAT POUR LE LOG
    // Loi de la majorité : STRICTEMENT PLUS de voix POUR que de voix CONTRE
    const resultatText = (state.votes.oui > state.votes.non) ? "CONSEIL APPROUVÉ" : "CONSEIL REJETÉ";

    // 1.3. ENVOI DU LOG DÉTAILLÉ
    Logger.add(`🗳️ SCRUTIN CLOS — RÉSULTATS DU VOTE : ${resultatText}`);
    Logger.add(`   • INDIVIDUS : ${countPhysiqueOui} POUR vs ${countPhysiqueNon} CONTRE`);
    Logger.add(`   • INFLUENCE : ${state.votes.oui} VOIX vs ${state.votes.non} VOIX`);

    // 2. Calcul du résultat
    if (state.votes.oui > state.votes.non) {
        state.currentPhase = "LÉGISLATION_G";
        
        // EFFET ARCHIVISTE : On détermine combien de cartes piocher (4 si actif, sinon 3)
        const countToDraw = state.archivistePowerActive ? 4 : 3;
        state.currentLegislativeCards = [];
        
        for (let i = 0; i < countToDraw; i++) {
            state.currentLegislativeCards.push(drawCard());
        }
        state.currentLegislativeCards = state.currentLegislativeCards.filter(Boolean);

        // Si le pouvoir a été utilisé, on loggue l'intervention et on désactive le flag pour le prochain tour
        if (state.archivistePowerActive) {
            Logger.add(`📜 ARCHIVISTE : Les archives ont été ouvertes ! Le Gardien va devoir choisir parmi 4 cartes.`);
            state.archivistePowerActive = false; // Effet consommé
        }

        state.oxy = getOxygenMaxLimit();

        players.filter(p => p.isAlive).forEach(p => p.conn.send({ type: 'WAIT_LEGISLATION', step: 'GARDIEN' }));
        
        if (state.crise >= 3 && players[state.curSIdx].role === 'A' && !state.rebellionActive) {
            return triggerWin("INFECTES", "L'Alpha a été élu Sentinelle.");
        }

        setTimeout(() => {
            players[state.curG].conn.send({ type: 'GARDIEN_PICK', cards: state.currentLegislativeCards });
        }, 100);

    } else {
        // REJET CLASSIQUE
        state.oxy--;
        if (state.oxy <= 0) {
            applyForced();
        } else { 
            // COUP D'ETAT : Si le Gardien extraordinaire voit son gouvernement rejeté, 
            // le régime d'urgence prend fin et on retourne à la ligne temporelle normale.
            if (state.nextNormalGardien !== null) {
                state.curG = state.nextNormalGardien;
                state.nextNormalGardien = null; // Parenthèse fermée
                Logger.add("🔊 SYSTÈME : Vote rejeté. Fin du régime extraordinaire, retour à la programmation standard.");
            } else {
                // Passage normal au joueur suivant
                state.curG = (state.curG + 1) % players.length; 
            }
            setTimeout(nextTurn, 1500); 
        }
        clearCouncilVisuals();
    }
    syncTerminals(); 
    //render();
}

// Handler pour la défausse du Gardien
export function handleDiscardFromNet(cardId, remainingCards) {
    // On met la carte jetée par le Gardien dans la défausse générale
    state.discard.push(cardId); 
    state.currentLegislativeCards = remainingCards; // Contient les 2 cartes restantes

    // INTERCEPTION 49.3 ACTIVÉ
    if (state.loi493Active) {
        state.loi493Active = false; // Effet consommé !
        state.currentPhase = "LÉGISLATION_493"; // Nouvelle phase temporaire pour la synchro

        Logger.add(`⚖️ SYSTÈME [49.3] : Le Gardien transmet le visuel des 2 décrets restants à la Sentinelle.`);

        // 1. On donne le visuel "Lecture seule" à la Sentinelle
        if (players[state.curSIdx] && players[state.curSIdx].conn.open) {
            players[state.curSIdx].conn.send({ 
                type: 'SENTINELLE_493_VIEW', 
                cards: state.currentLegislativeCards 
            });
        }

        // 2. On met instantanément les AUTRES joueurs en attente
        players.forEach((p, idx) => {
            if (p.isAlive && idx !== state.curG && idx !== state.curSIdx) {
                p.conn.send({ type: 'WAIT_LEGISLATION', step: 'CHOIX FINAL GARDIEN (49.3)' });
            }
        });

        // 3. On rallume l'écran du Gardien pour qu'il choisisse la carte à PROMULGUER
        setTimeout(() => {
            players[state.curG].conn.send({ 
                type: 'GARDIEN_493_PICK', 
                cards: state.currentLegislativeCards 
            });
        }, 100);

    } else {
        // --- FLUX NORMAL STANDARD ---
        state.currentPhase = "LÉGISLATION_S";
        players.filter(p => p.isAlive).forEach(p => p.conn.send({ type: 'WAIT_LEGISLATION', step: 'SENTINELLE' }));
        setTimeout(() => {
            if (players[state.curSIdx] && players[state.curSIdx].conn.open) {
                players[state.curSIdx].conn.send({ type: 'SENTINELLE_PICK', cards: state.currentLegislativeCards });
            }
        }, 100);
    }

    syncTerminals();
    render();
}

/*
 * Application d'un décret (Survie, Crise ou Suffrage)
 * @param {string} cardId - L'ID du décret
 * @param {string} type - 'S', 'C' ou 'F'
 * @param {boolean} isForced - true si le décret est parachuté par manque d'oxygène
 */
export function applyDecret(cardId, type, isForced = false) {
    const card = DECREETS_DATABASE[cardId];
    clearCouncilVisuals();
    state.lastSentinelle = players[state.curSIdx].name;
    state.lastGardien = players[state.curG].name;
    updateLastCouncil();

    let decreetBloquant = false;

    if (type === 'S') {
        state.survie++;
        state.slotsSurvieCards.push(cardId);
        // On n'exécute le pouvoir QUE si le décret n'est pas forcé

        // On active l'effet du décret Rébellion
        if (cardId === 'rebellion') {
            state.rebellionActive = true;
            Logger.add("✊ SYSTÈME : Le décret RÉBELLION est promulgué. L'Alpha ne peut plus gagner par élection.");
        }
        
        if (!isForced) {
            decreetBloquant = executeDecreetPower(cardId);
        }
        
    } else if (type === 'C') {
        state.crise++;
        state.slotsCriseCards.push(cardId);
        
        // On n'exécute les pouvoirs QUE si le décret n'est pas forcé
        if (!isForced) {
            // 1. Effet de la carte
            decreetBloquant = executeDecreetPower(cardId);
            // 2. Pouvoir de la case jauge
            checkCasePower(state.crise);
        }

        // L'effet s'estompe, mais la carte reste sur le plateau pour le score bleu !
        if (state.rebellionActive) {
            state.rebellionActive = false;
            Logger.add("💥 SYSTÈME : Une Directive de Crise a été promulguée. L'effet du décret RÉBELLION est désormais obsolète (mais le point de Survie reste acquis).");
        }
        
    } else if (type === 'F') {
        // Si un suffrage était déjà actif, on remet son ID dans la défausse
        if (state.slotsSuffrageCard) {
            state.discard.push(state.slotsSuffrageCard);
            Logger.add(`🗳️ SUFFRAGE : L'ancien décret '${state.slotsSuffrageCard}' est écrasé et envoyé à la défausse.`);
        }
        
        // On installe le nouveau suffrage
        state.slotsSuffrageCard = cardId;
        state.suffrage = card.name;
    }

    // Si on vient de poser une fuite d'air, on bride l'oxygène actuel s'il dépasse le nouveau max
    const maxOxy = getOxygenMaxLimit();
    if (state.oxy > maxOxy) {
        state.oxy = maxOxy;
        Logger.add(`💨 ATMOSPHÈRE : Le niveau d'oxygène s'ajuste au nouveau plafond critique (${state.oxy}/3).`);
    }

    render();
    syncTerminals();

    // --- SÉCURITÉS CONDITIONS DE VICTOIRE ---
    if (state.survie >= 5) return triggerWin("SURVIVANTS", "Protocoles rétablis.");
    if (state.crise >= 6) return triggerWin("INFECTES", "Infection totale.");

    // --- SÉCURITÉ URGENCE OXYGÈNE À ZÉRO (Si un sabotage normal nous y a menés) ---
    if (state.oxy <= 0) {
        Logger.add("⚠️ ALERTE : Le niveau d'oxygène a atteint le seuil critique 0 !");
        state.isProcessingAction = false; 
        setTimeout(() => {
            applyForced();
        }, 1500);
        return;
    }

    // --- LOGIQUE DE TRANSITION DE TOUR ---
    if (!state.currentPowerActive && !decreetBloquant) {
        // COUP D'ÉTAT : Si un retour à l'ordre normal est planifié
        if (state.nextNormalGardien !== null) {
            state.curG = state.nextNormalGardien;
            state.nextNormalGardien = null; // Parenthèse fermée !
            Logger.add("🔊 SYSTÈME : Fin du régime extraordinaire. Retour à l'ordre de passage standard.");
        } else {
            // Passage normal au joueur suivant
            state.curG = (state.curG + 1) % players.length;
        }
        setTimeout(() => { 
            state.isProcessingAction = false; 
            nextTurn(); 
        }, 1000);
    } else {
        state.isProcessingAction = true;
    }
}

/**
 * Décret forcé (Oxygène à zéro)
 */
export function applyForced() {
    let cardId = drawCard(); 

    // On passe et défausse si c'est une carte de Suffrage
    while(cardId && DECREETS_DATABASE[cardId].type === 'F') {
        state.discard.push(cardId);
        cardId = drawCard();
    }

    state.oxy = getOxygenMaxLimit(); // Lors du reset d'urgence, on applique aussi le plafond des fuites
    
    if(cardId) {
        Logger.add(`URGENCE : Déploiement forcé du décret : ${DECREETS_DATABASE[cardId].name.toUpperCase()} (Pouvoirs désactivés)`);
        // --- ANCRE DE SÉCURITÉ : On passe true pour signaler le mode forcé ---
        applyDecret(cardId, DECREETS_DATABASE[cardId].type, true); 
    }
}

/**
 * Restauration de l'interface d'un joueur après reconnexion
 */
export function restorePlayerAction(player) {
    if (!player.isAlive) {
        const revealResult = ['A', 'I', 'IM'].includes(player.role) ? "INFECTÉ" : "SAIN";
        player.conn.send({ type: 'YOU_ARE_DEAD', reveal: revealResult });
        return;
    }
    const isGardien = (players[state.curG] === player);
    const isSentinelle = (state.curSIdx !== -1 && players[state.curSIdx] === player);

    switch(state.currentPhase) {
        case "VOTE":
            if (player.isCensored) {
                player.conn.send({ type: 'CENSORED_ALERT', by: player.censoredBy });
            } else {
                const aDejaVote = state.votes.list.some(v => v.name.toLowerCase() === player.name.toLowerCase());
                if (aDejaVote) player.conn.send({ type: 'CLEAN_UI' });
                else player.conn.send({ type: 'VOTE_START', g: players[state.curG].name, s: state.currentProposedS });
            }
            break;

        case "LÉGISLATION_G":
            if (isGardien) player.conn.send({ type: 'GARDIEN_PICK', cards: state.currentLegislativeCards });
            else player.conn.send({ type: 'WAIT_LEGISLATION', step: 'GARDIEN' });
            break;

        case "LÉGISLATION_S":
            if (isSentinelle) player.conn.send({ type: 'SENTINELLE_PICK', cards: state.currentLegislativeCards });
            else player.conn.send({ type: 'WAIT_LEGISLATION', step: 'SENTINELLE' });
            break;
        
        default:
            if (isGardien) {
                let eligible = players
                    .filter(p => p.isAlive)
                    .map(p => p.name)
                    .filter(name => {
                        if (name === players[state.curG].name) return false;
                        if (name === state.lastSentinelle) return false;
                        if (players.length > 5 && name === state.lastGardien) return false;
                        if (state.vigileBannedPlayer && name.toLowerCase() === state.vigileBannedPlayer.toLowerCase()) return false;
                        return true;
                    });
                player.conn.send({ type: 'YOUR_TURN', eligible: eligible });
            }
            else player.conn.send({ type: 'WAIT_SENTINELLE', gardienName: players[state.curG].name });
    }
}

export function globalReset() {
    if (!confirm("Réinitialiser la partie et renvoyer tout le monde au lobby ?")) return;
    // 1. On prévient les téléphones de changer d'écran SANS couper la connexion
    players.forEach(p => {
        if (p.conn && p.conn.open) {
            p.conn.send({ type: 'RESET_TO_LOBBY' });
        }
    });
    // 2. On remet les variables de jeu à zéro (via state.js)
    resetGameState(); 
    // 3. Mise à jour de l'interface PC (On repasse en mode Lobby)
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('game-zone').style.display = 'none';
    document.getElementById('game-info-row').style.display = 'none';
    document.getElementById('setup-zone').style.display = 'block';
    document.getElementById('lobby-active').style.display = 'block';
    // On réactive le bouton start si on a assez de monde
    document.getElementById('start-btn').disabled = (players.length < 5);
    document.getElementById('count').innerText = players.length;
    // 4. On nettoie les visuels (on enlève les métiers et étoiles)
    resetLobbyVisuals();
    Logger.clear();
    Logger.add("Réinitialisation réussie. Les joueurs sont toujours connectés.");
}

export function showGov(g, s) {
    state.currentPhase = "VOTE"; 
    state.currentProposedS = s;  
    const sTags = document.querySelectorAll(`[id=\"tag-${s.toLowerCase()}\"]`);
    sTags.forEach(tag => { 
        tag.style.borderColor = "#3498db"; 
        tag.style.borderWidth = "2px"; 
    });
    
    document.getElementById('game-info-row').style.display = 'flex';
    document.getElementById('g-name').innerText = g; 
    document.getElementById('g-name').style.color = "#f1c40f";
    document.getElementById('s-name').innerText = s; 
    document.getElementById('s-name').style.color = "#3498db";

    const eligibleCount = players.filter(p => p.isAlive && !p.isCensored).length;
    document.getElementById('vote-summary').innerText = `SCRUTIN EN COURS : Approuvez-vous ce conseil ?\nVOTES TRANSMIS : 0 / ${eligibleCount}`;
    document.getElementById('vote-summary').style.color = "#f1c40f"; 
    Logger.add(`Ouverture du scrutin : Gouvernement proposé ${g} & ${s}`);

    syncTerminals();
    
    // On envoie les bonnes interfaces (Vote ou Alerte de censure)
    players.filter(p => p.isAlive).forEach(p => {
        if (p.isCensored) {
            p.conn.send({ type: 'CENSORED_ALERT', by: p.censoredBy });
        } else {
            p.conn.send({ type: 'VOTE_START', g: g, s: s });
        }
    });
}

/**
 * Calcule le niveau d'oxygène par défaut en fonction des fuites d'air actives
 * 0 fuite : Niveau 3 | 1 fuite : Niveau 2 | 2 fuites : Niveau 1
 */
export function getOxygenMaxLimit() {
    let fuiteCount = 0;
    if (state.slotsSurvieCards.includes('fuite_air_s')) fuiteCount++;
    if (state.slotsCriseCards.includes('fuite_air_c')) fuiteCount++;
    
    return Math.max(1, 3 - fuiteCount);
}
