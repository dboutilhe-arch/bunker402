import { state, players, resetGameState } from '../core/state.js'; 
import { ROLE_COMPOSITIONS, JOBS_LIST, INITIAL_DECK_LIST } from '../core/constants.js';
import { 
    render, 
    updateTagsWithJobs,  
    displayComposition, 
    syncTerminals, 
    triggerWin,
    resetLobbyVisuals,
    clearCouncilVisuals,
    rebuildActivePlayerTags
} from '../ui/renderer.js';
import { Logger } from '../ui/logger.js';
import { drawCard, applyForced, getOxygenMaxLimit } from './decrees.js';

// --- LOGIQUE DE ROUTAGE ET PHASES DE JEU ---

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

    if (state.nextForcedS) {
        state.curSIdx = players.findIndex(p => p.name === state.nextForcedS);
        state.currentProposedS = state.nextForcedS;
        state.nextForcedS = null; 
    } else {
        state.curSIdx = -1;
        state.currentProposedS = null;
    }

    let attempts = 0;
    // 🔮 SÉCURITÉ PROPHÈTE : On saute le joueur s'il est mort OU s'il est le Prophète
    while ((!players[state.curG].isAlive || state.curG === state.propheteIdx) && attempts < players.length) {
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
    
    document.getElementById('vote-summary').innerText = "DÉSIGNATION DU CONSEIL... ";
    document.getElementById('g-name').innerText = activeG.name.toUpperCase();
    document.getElementById('s-name').innerText = state.curSIdx !== -1 ? state.currentProposedS.toUpperCase() : "?";

    players.filter(p => p.isAlive).forEach(p => p.conn.send({ type: 'CLEAN_UI' }));
    players.filter(p => p.isAlive).forEach((p, index) => {
        if(index !== state.curG) p.conn.send({ type: 'WAIT_SENTINELLE', gardienName: activeG.name.toUpperCase() });
    });

    let eligiblePlayers = players.filter(p => p.isAlive).map(p => p.name).filter(name => {
        const pObj = players.find(pl => pl.name === name);
        const pIdx = players.indexOf(pObj);

        if (name === activeG.name) return false;
        if (name === state.lastSentinelle) return false;
        if (players.length > 5 && name === state.lastGardien) return false;
        if (state.vigileBannedPlayer && name.toLowerCase() === state.vigileBannedPlayer.toLowerCase()) return false;
        if (pIdx === state.propheteIdx) return false; 
        
        return true;
    });
    
    // RÉÉLECTION DIRECTE AUTOMATIQUE
    if (state.curSIdx !== -1 && state.currentPhase === "DÉSIGNATION") {
        const currentS = players[state.curSIdx];
        Logger.add(`⚖️ SYSTÈME : Réélection active. Passage direct à la législation pour ${activeG.name.toUpperCase()} & ${currentS.name.toUpperCase()}.`);
        
        state.currentPhase = "LÉGISLATION_G";

        // 🔮 INTERCEPTION PROPHÈTE PENDANT LA RÉÉLECTION
        if (state.propheteIdx !== -1) {
            const activeProphete = players[state.propheteIdx];
            Logger.add(`🔮 PROPHÉTIE : Le Prophète ${activeProphete.name} intercepte la pioche de la Réélection et tire 4 cartes !`);
            
            state.currentLegislativeCards = [];
            for (let i = 0; i < 4; i++) {
                state.currentLegislativeCards.push(drawCard());
            }
            state.currentLegislativeCards = state.currentLegislativeCards.filter(Boolean);

            // On met tout le monde en attente
            players.filter(p => p.isAlive).forEach(p => {
                p.conn.send({ type: 'WAIT_LEGISLATION', step: `PROPHÈTE (${activeProphete.name})` });
            });

            // On envoie les 4 cartes au Prophète
            setTimeout(() => {
                activeProphete.conn.send({ type: 'PROPHETE_PICK', cards: state.currentLegislativeCards });
            }, 100);

            syncTerminals();
            render();
            return; // 🛑 ON COUPE LE FLUX ICI ! Le Gardien attendra que le Prophète défausse.
        }
        
        // 🛑 FLUX NORMAL STANDARD DE RÉÉLECTION (Si pas de Prophète)
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
    
    activeG.conn.send({ type: 'YOUR_TURN', eligible: eligiblePlayers });
    syncTerminals(); 
    render();
}

/**
 * Calcul du résultat du vote
 */
export function resolveVote() {
    // Reset systématique de la sanction Talion au début de la résolution
    state.talionBanned = [];
    
    // NETTOYAGE DES CENSURES REPOUSSÉ ICI À LA FIN DU TOUR (Conservation visuelle)
    players.forEach(p => { 
        p.isCensored = false; 
        p.censoredBy = ""; 
    });

    state.vigileBannedPlayer = null;
    
    state.votes.list.forEach(v => {
        const tags = document.querySelectorAll(`[id="tag-${v.name.toLowerCase()}"]`);
        if (state.slotsSuffrageCard === 'chambre_noire') {
            tags.forEach(t => t.classList.add('voted-secret'));
        } else {
            tags.forEach(t => t.classList.add(v.choice === 'OUI' ? 'voted-oui' : 'voted-non'));
        }
    });

    const countPhysiqueOui = state.votes.list.filter(v => v.choice === 'OUI').length;
    const countPhysiqueNon = state.votes.list.filter(v => v.choice === 'NON').length;

    const resultatText = (state.votes.oui > state.votes.non) ? "CONSEIL APPROUVÉ" : "CONSEIL REJETÉ";

    Logger.add(`🗳️ SCRUTIN CLOS — RÉSULTATS DU VOTE : ${resultatText}`);
    Logger.add(`   • INDIVIDUS : ${countPhysiqueOui} POUR vs ${countPhysiqueNon} CONTRE`);
    Logger.add(`   • INFLUENCE : ${state.votes.oui} VOIX vs ${state.votes.non} VOIX`);

    if (state.votes.oui > state.votes.non) {
        state.currentPhase = "LÉGISLATION_G";
        
        // 🔮 INTERCEPTION PROPHÈTE : S'il y a un prophète actif en jeu
        if (state.propheteIdx !== -1) {
            const activeProphete = players[state.propheteIdx];
            Logger.add(`🔮 PROPHÉTIE : Le Prophète ${activeProphete.name} intercepte la pioche législative et tire 4 cartes !`);
            
            state.currentLegislativeCards = [];
            for (let i = 0; i < 4; i++) {
                state.currentLegislativeCards.push(drawCard());
            }
            state.currentLegislativeCards = state.currentLegislativeCards.filter(Boolean);

            // On met tout le monde en attente sauf le Prophète
            players.filter(p => p.isAlive).forEach(p => {
                p.conn.send({ type: 'WAIT_LEGISLATION', step: `PROPHÈTE (${activeProphete.name})` });
            });

            // On envoie les 4 cartes au Prophète (On crée un protocole dédié pour son smartphone)
            setTimeout(() => {
                activeProphete.conn.send({ type: 'PROPHETE_PICK', cards: state.currentLegislativeCards });
            }, 100);

            state.oxy = getOxygenMaxLimit();
            syncTerminals();
            return; // 🛑 ON CORTE LE FLUX ICI ! Le Gardien n'a pas encore de cartes.
        }

        // 🛑 FLUX NORMAL STANDARD (Si pas de Prophète)
        const countToDraw = state.archivistePowerActive ? 4 : 3;
        state.currentLegislativeCards = [];
        
        for (let i = 0; i < countToDraw; i++) {
            state.currentLegislativeCards.push(drawCard());
        }
        state.currentLegislativeCards = state.currentLegislativeCards.filter(Boolean);

        if (state.archivistePowerActive) {
            Logger.add(`📜 ARCHIVISTE : Les archives ont été ouvertes ! Le Gardien va devoir choisir parmi 4 cartes.`);
            state.archivistePowerActive = false; 
        }

        state.oxy = getOxygenMaxLimit();

        players.filter(p => p.isAlive).forEach(p => p.conn.send({ type: 'WAIT_LEGISLATION', step: 'GARDIEN' }));
        
        if (state.crise >= 3 && players[state.curSIdx].role === 'A' && !state.activeEffectsS.includes('rebellion')) {
            return triggerWin("INFECTES", "L'Alpha a été élu Sentinelle.");
        }

        setTimeout(() => {
            players[state.curG].conn.send({ type: 'GARDIEN_PICK', cards: state.currentLegislativeCards });
        }, 100);

    } else {
        state.oxy--;

        // --- LOI DU TALION : Détection de l'échec ---
        if (state.activeEffectsC.includes('talion')) {
            const failedGardien = players[state.curG];
            state.talionBanned.push(failedGardien.name);
            Logger.add(`⚖️ LOI DU TALION : ${failedGardien.name} est banni de vote pour le prochain scrutin.`);
        }
        
        if (state.oxy <= 0) {
            applyForced();
        } else { 
            if (state.nextNormalGardien !== null) {
                state.curG = state.nextNormalGardien;
                state.nextNormalGardien = null; 
                Logger.add("🔊 SYSTÈME : Vote rejeté. Fin du régime extraordinaire, retour à la programmation standard.");
            } else {
                state.curG = (state.curG + 1) % players.length; 
            }
            setTimeout(nextTurn, 1500); 
        }
        clearCouncilVisuals();
    }
    syncTerminals(); 
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
            } else if (players.indexOf(player) === state.propheteIdx) {
                // 🔮 SÉCURITÉ RECONNEXION PROPHÈTE
                player.conn.send({ 
                    type: 'WAIT_PROPHETE_VOTE', 
                    g: g.toUpperCase(), 
                    s: s.toUpperCase()
                });
            } else {
                const aDejaVote = state.votes.list.some(v => v.name.toLowerCase() === player.name.toLowerCase());
                if (aDejaVote) player.conn.send({ type: 'CLEAN_UI' });
                else player.conn.send({ type: 'VOTE_START', g: players[state.curG].name.toUpperCase(), s: state.currentProposedS.toUpperCase() });
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
                        const pObj = players.find(pl => pl.name === name);
                        const pIdx = players.indexOf(pObj);

                        if (name === players[state.curG].name) return false;
                        if (name === state.lastSentinelle) return false;
                        if (players.length > 5 && name === state.lastGardien) return false;
                        if (state.vigileBannedPlayer && name.toLowerCase() === state.vigileBannedPlayer.toLowerCase()) return false;
                        if (pIdx === state.propheteIdx) return false;

                        return true;
                    });
                player.conn.send({ type: 'YOUR_TURN', eligible: eligible });
            }
            else player.conn.send({ type: 'WAIT_SENTINELLE', gardienName: players[state.curG].name.toUpperCase() });
    }
}

/**
 * Réinitialisation complète (Bouton Admin ou Fin de partie)
 */
export function globalReset() {
    if (!confirm("Réinitialiser la partie et renvoyer tout le monde au lobby ?")) return;
    players.forEach(p => {
        if (p.conn && p.conn.open) {
            p.conn.send({ type: 'RESET_TO_LOBBY' });
        }
    });
    resetGameState(); 
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('game-zone').style.display = 'none';
    document.getElementById('game-info-row').style.display = 'none';
    document.getElementById('setup-zone').style.display = 'block';
    document.getElementById('lobby-active').style.display = 'block';
    document.getElementById('start-btn').disabled = (players.length < 5);
    document.getElementById('count').innerText = players.length;
    resetLobbyVisuals();
    Logger.clear();
    Logger.add("Réinitialisation réussie. Les joueurs sont toujours connectés.");
}

/**
 * Affichage et transmission du Conseil au Vote
 */
export function showGov(g, s) {
    state.currentPhase = "VOTE"; 
    state.currentProposedS = s;  
    
    // NETTOYAGE EFFECTUÉ ICI À L'OUVERTURE DU NOUVEAU SCRUTIN (V2)
    state.votes.oui = 0; 
    state.votes.non = 0; 
    state.votes.total = 0; 
    state.votes.list = [];

    import('../ui/renderer.js').then(m => {
        m.resetVoteColors();
        m.render();
    });

    const sTags = document.querySelectorAll(`[id="tag-${s.toLowerCase()}"]`);
    sTags.forEach(tag => { 
        tag.style.borderColor = "#3498db"; 
        tag.style.borderWidth = "2px"; 
    });
    
    document.getElementById('game-info-row').style.display = 'flex';
    document.getElementById('g-name').innerText = g.toUpperCase(); 
    document.getElementById('g-name').style.color = "#f1c40f";
    document.getElementById('s-name').innerText = s.toUpperCase(); 
    document.getElementById('s-name').style.color = "#3498db";

    const eligibleCount = players.filter(p => p.isAlive && !p.isCensored && players.indexOf(p) !== state.propheteIdx).length;
    document.getElementById('vote-summary').innerText = `SCRUTIN EN COURS : Approuvez-vous ce conseil ?\nVOTES TRANSMIS : 0 / ${eligibleCount}`;
    document.getElementById('vote-summary').style.color = "#f1c40f"; 
    Logger.add(`Ouverture du scrutin : Gouvernement proposé ${g.toUpperCase()} & ${s.toUpperCase()}`);

    syncTerminals();
    
    players.filter(p => p.isAlive).forEach((p, idx) => {
        // --- ENFORCEMENT TALION ---
        if (state.talionBanned.includes(p.name)) {
            p.conn.send({ type: 'TALION_ALERT' });
        } 
        else if (p.isCensored) {
            p.conn.send({ type: 'CENSORED_ALERT', by: p.censoredBy });
        } 
        else if (idx === state.propheteIdx) {
            // ... (logique prophète)
        } 
        else {
            p.conn.send({ type: 'VOTE_START', g: g.toUpperCase(), s: s.toUpperCase() });
        }
    });
}
