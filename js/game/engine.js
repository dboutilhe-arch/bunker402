import { state, players, resetGameState } from '../core/state.js';
import { JOBS_LIST } from '../core/constants.js';
import { 
    render, 
    updateTagsWithJobs, 
    clearGardienVisuals, 
    displayComposition, 
    updateLastCouncil, 
    syncTerminals, 
    triggerWin,
    resetLobbyVisuals
} from '../ui/renderer.js';
import { Logger } from '../ui/logger.js';
import { checkCasePower } from './powers.js';

// --- LOGIQUE DE JEU ---

/**
 * Initialisation de la partie et distribution des rôles/métiers
 */
export async function initGame() {
    // 1. Préparation du deck
    // On vide le tableau et on utilise .push pour garder la référence exportée
    const newCards = [...Array(40).fill('S'), ...Array(60).fill('C'), ...Array(10).fill('F')].sort(() => Math.random() - 0.5);
    state.deck.length = 0; 
    state.deck.push(...newCards);

    // 2. Logique de répartition des rôles
    let roles = [];
    const n = players.length;
    if (n <= 6) roles = ['S', 'S', 'S', 'S', 'I', 'A'];
    else if (n <= 10) roles = ['S', 'S', 'S', 'S', 'S', 'S', 'I', 'I', 'A', 'S'];
    else {
        roles = ['S', 'S', 'S', 'S', 'S', 'S', 'I', 'I', 'A', 'M', 'IM'];
        while (roles.length < n) roles.push(Math.random() > 0.3 ? 'S' : 'I');
    }
    roles.sort(() => Math.random() - 0.5);

    const shuffledJobs = [...JOBS_LIST].sort(() => Math.random() - 0.5);
    const alphaPlayer = players[roles.indexOf('A')];

    // 3. Envoi des données aux terminaux mobiles
    for (let i = 0; i < n; i++) {
        let p = players[i];
        p.role = roles[i];
        p.metier = shuffledJobs[i % shuffledJobs.length];
        p.conn.send({
            type: 'INIT',
            role: p.role,
            metier: p.metier,
            all: players.map(pl => pl.name),
            alphaName: (['I', 'A', 'M'].includes(p.role)) ? alphaPlayer.name : null 
        });
        await new Promise(r => setTimeout(r, 50));
    }

    // 4. Mise à jour visuelle de la console
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
    
    const activeG = players[state.curG];
    const tags = document.querySelectorAll(`[id="tag-${activeG.name.toLowerCase()}"]`);
    tags.forEach(tag => {
        const nameDiv = tag.querySelector('.p-name');
        if (nameDiv) nameDiv.innerHTML = `⭐ ${activeG.name.toUpperCase()}`;
        tag.style.borderColor = "#f1c40f"; 
        tag.style.borderWidth = "2px";
    });

    Logger.add(`SYSTÈME : Désignation du nouveau Gardien : ${activeG.name.toUpperCase()}`);
    
    // Reset des votes sans casser la référence
    state.votes.oui = 0; 
    state.votes.non = 0; 
    state.votes.total = 0; 
    state.votes.list = [];
    
    document.getElementById('vote-summary').innerText = "DÉSIGNATION DU CONSEIL : Le Gardien choisit sa Sentinelle...";
    document.getElementById('vote-summary').style.color = "#3498db";
    
    document.getElementById('g-name').innerText = activeG.name;
    document.getElementById('g-name').style.color = "#f1c40f"; 
    document.getElementById('s-name').innerText = "?";
    document.getElementById('s-name').style.color = "#e0e0e0";

    players.forEach(p => p.conn.send({ type: 'CLEAN_UI' }));
    players.forEach((p, index) => {
        if(index !== state.curG) p.conn.send({ type: 'WAIT_SENTINELLE', gardienName: activeG.name });
    });

    let eligiblePlayers = players.map(p => p.name).filter(name => {
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

    Logger.add(`RÉSULTAT DU SCRUTIN : ${state.votes.oui} OUI vs ${state.votes.non} NON`);
    
    if(state.votes.oui > state.votes.non) {
        document.getElementById('vote-summary').innerText = "VOTE ACCEPTÉ";
        document.getElementById('vote-summary').style.color = "#2ecc71";
        Logger.add("VOTE ACCEPTÉ : Le conseil entre en session législative.");
        
        state.currentPhase = "LÉGISLATION_G";
        state.currentLegislativeCards = [state.deck.pop(), state.deck.pop(), state.deck.pop()];
        state.oxy = 3;

        players.forEach(p => p.conn.send({ type: 'WAIT_LEGISLATION', step: 'GARDIEN' }));

        if(state.crise >= 3 && players[state.curSIdx].role === 'A') {
            return triggerWin("INFECTES", "L'Alpha a été élu Sentinelle.");
        }

        setTimeout(() => {
            players[state.curG].conn.send({ type: 'GARDIEN_PICK', cards: state.currentLegislativeCards });
        }, 100);
    } else {
        state.oxy--;
        document.getElementById('vote-summary').innerText = "VOTE REJETÉ";
        document.getElementById('vote-summary').style.color = "#e74c3c";
        Logger.add(`ALERTE : Rejet du conseil. Oxygène à ${state.oxy}/3.`);
        
        clearGardienVisuals();

        if(state.oxy <= 0) {
            Logger.add("⚠️ ALERTE : RÉSERVES D'OXYGÈNE ÉPUISÉES !");
            applyForced();
        }
        else { 
            state.curG = (state.curG + 1) % players.length; 
            setTimeout(nextTurn, 1500); 
        }
    }
    syncTerminals(); 
    render();
}

/**
 * Application d'un décret (Survie, Crise ou Suffrage)
 */
export function applyDecret(type) {
    clearGardienVisuals();
    state.lastSentinelle = players[state.curSIdx].name;
    state.lastGardien = players[state.curG].name;
    updateLastCouncil();

    if (type === 'S') {
        state.survie++;
    } else if (type === 'C') {
        state.crise++;
        checkCasePower(state.crise);
    } else if (type === 'F') {
        state.suffrage = "Actif";
    }

    render();
    syncTerminals();

    if (state.survie >= 5) triggerWin("SURVIVANTS", "Protocoles rétablis.");
    else if (state.crise >= 6) triggerWin("INFECTES", "Infection totale.");
    else {
        if (!state.currentPowerActive) {
            state.curG = (state.curG + 1) % players.length;
            setTimeout(() => { state.isProcessingAction = false; nextTurn(); }, 1000);
        }
    }
}

/**
 * Décret forcé (Oxygène à zéro)
 */
export function applyForced() {
    let card = state.deck.pop(); 
    while(card === 'F') card = state.deck.pop(); 
    
    const typeLabel = card === 'S' ? "SURVIE" : "CRISE";
    Logger.add(`URGENCE : Le système a déployé un décret de type ${typeLabel}.`);
    
    applyDecret(card); 
    state.oxy = 3; 
}

/**
 * Restauration de l'interface d'un joueur après reconnexion
 */
export function restorePlayerAction(player) {
    const isGardien = (players[state.curG] === player);
    const isSentinelle = (state.curSIdx !== -1 && players[state.curSIdx] === player);

    switch(state.currentPhase) {
        case "VOTE":
            const aDejaVote = state.votes.list.some(v => v.name.toLowerCase() === player.name.toLowerCase());
            if (aDejaVote) player.conn.send({ type: 'CLEAN_UI' });
            else player.conn.send({ type: 'VOTE_START', g: players[state.curG].name, s: state.currentProposedS });
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
                let eligible = players.map(p => p.name).filter(name => {
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
    
    document.getElementById('vote-summary').innerText = `SCRUTIN EN COURS...\nVOTES TRANSMIS : 0 / ${players.length}`;
    
    Logger.add(`Ouverture du scrutin : Gouvernement proposé ${g} & ${s}`);
    players.forEach(p => p.conn.send({ type: 'VOTE_START', g: g, s: s }));
}
