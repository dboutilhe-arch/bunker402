import { state, players, resetGameState } from '../core/state.js'; 
import { ROLE_COMPOSITIONS, JOBS_LIST, INITIAL_DECK_LIST } from '../core/constants.js';
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
import { checkCasePower } from './powers.js';

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
    document.getElementById('s-name').innerText = "?";

    players.filter(p => p.isAlive).forEach(p => p.conn.send({ type: 'CLEAN_UI' }));
    players.filter(p => p.isAlive).forEach((p, index) => {
        if(index !== state.curG) p.conn.send({ type: 'WAIT_SENTINELLE', gardienName: activeG.name });
    });

    let eligiblePlayers = players.filter(p => p.isAlive).map(p => p.name).filter(name => {
        if (name === activeG.name) return false;
        if (name === state.lastSentinelle) return false;
        if (players.length > 5 && name === state.lastGardien) return false;
        return true;
    });
    
    activeG.conn.send({ type: 'YOUR_TURN', eligible: eligiblePlayers });
    syncTerminals(); 
    render();
}

/**
 * Calcul du résultat du vote
 */
export function resolveVote() {
    state.votes.list.forEach(v => {
        const tags = document.querySelectorAll(`[id="tag-${v.name.toLowerCase()}"]`);
        tags.forEach(t => t.classList.add(v.choice === 'OUI' ? 'voted-oui' : 'voted-non'));
    });

    if(state.votes.oui > state.votes.non) {
        state.currentPhase = "LÉGISLATION_G";
        
        state.currentLegislativeCards = [drawCard(), drawCard(), drawCard()].filter(Boolean);
        state.oxy = 3;

        players.filter(p => p.isAlive).forEach(p => p.conn.send({ type: 'WAIT_LEGISLATION', step: 'GARDIEN' }));
        if(state.crise >= 3 && players[state.curSIdx].role === 'A') {
            return triggerWin("INFECTES", "L'Alpha a été élu Sentinelle.");
        }
        setTimeout(() => {
            players[state.curG].conn.send({ type: 'GARDIEN_PICK', cards: state.currentLegislativeCards });
        }, 100);
    } else {
        state.oxy--;
        if(state.oxy <= 0) {
            applyForced();
        } else { 
            state.curG = (state.curG + 1) % players.length; 
            setTimeout(nextTurn, 1500); 
        }
        clearCouncilVisuals();
    }
    syncTerminals(); 
    render();
}

// Handler pour la défausse du Gardien
export function handleDiscardFromNet(cardId, remainingCards) {
    state.discard.push(cardId); // Envoi immédiat en défausse
    state.currentPhase = "LÉGISLATION_S";
    state.currentLegislativeCards = remainingCards;
    
    players.filter(p => p.isAlive).forEach(p => p.conn.send({ type: 'WAIT_LEGISLATION', step: 'SENTINELLE' }));
    setTimeout(() => {
        if (players[state.curSIdx] && players[state.curSIdx].conn.open) {
            players[state.curSIdx].conn.send({ type: 'SENTINELLE_PICK', cards: state.currentLegislativeCards });
        }
    }, 100);
}

/**
 * Application d'un décret (Survie, Crise ou Suffrage)
 */
export function applyDecret(cardId, type) {
    clearCouncilVisuals();
    state.lastSentinelle = players[state.curSIdx].name;
    state.lastGardien = players[state.curG].name;
    updateLastCouncil();

    if (type === 'S') {
        state.survie++;
        state.slotsSurvieCards.push(cardId);
    } else if (type === 'C') {
        state.crise++;
        state.slotsCriseCards.push(cardId);
        checkCasePower(state.crise);
    } else if (type === 'F') {
        state.suffrage = "Actif";
        state.slotsSuffrageCard = cardId;
    }

    players.forEach(p => { p.isCensored = false; p.censoredBy = ""; });
    render();
    syncTerminals();

    if (state.survie >= 5) triggerWin("SURVIVANTS", "Protocoles rétablis.");
    else if (state.crise >= 6) triggerWin("INFECTES", "Infection totale.");
    else {
        if (!state.currentPowerActive) {
            state.curG = (state.curG + 1) % players.length;
            setTimeout(() => { state.isProcessingAction = false; nextTurn(); }, 1000);
        } else {
            state.isProcessingAction = true;
        }
    }
}

/**
 * Décret forcé (Oxygène à zéro)
 */
export function applyForced() {
    let cardId = drawCard(); 
    // On s'assure qu'un décret forcé n'est pas un suffrage selon tes anciennes règles
    while(cardId && DECREETS_DATABASE[cardId].type === 'F') {
        state.discard.push(cardId);
        cardId = drawCard();
    }
    
    if(cardId) {
        Logger.add(`URGENCE : Déploiement forcé du décret : ${DECREETS_DATABASE[cardId].name.toUpperCase()}`);
        applyDecret(cardId, DECREETS_DATABASE[cardId].type); 
    }
    state.oxy = 3; 
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
    const sTags = document.querySelectorAll(`[id="tag-${s.toLowerCase()}"]`);
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
    document.getElementById('vote-summary').style.color = "#f1c40f"; // Jaune pour le scrutin
    Logger.add(`Ouverture du scrutin : Gouvernement proposé ${g} & ${s}`);
    
    // FILTRAGE DES ENVOIS 
    players.filter(p => p.isAlive).forEach(p => {
        if (p.isCensored) {
            p.conn.send({ type: 'CENSORED_ALERT', by: p.censoredBy });
        } else {
            p.conn.send({ type: 'VOTE_START', g: g, s: s });
        }
    })
}
