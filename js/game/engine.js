// engine.js


import { gameState, players, deck, curG, votes, resetState } from '../core/state.js';
import { DECK_COMPOSITION, ROLES_CONFIG, JOBS_LIST } from '../core/constants.js';
import { Logger } from '../ui/logger.js';
import { render, syncTerminals, updatePlayerTags } from '../ui/renderer.js';

/**
 * Initialisation d'une nouvelle partie
 */
export async function initGame() {
    // 1. Création et mélange du deck
    const rawDeck = [
        ...Array(DECK_COMPOSITION.S).fill('S'),
        ...Array(DECK_COMPOSITION.C).fill('C'),
        ...Array(DECK_COMPOSITION.F).fill('F')
    ];
    deck.push(...rawDeck.sort(() => Math.random() - 0.5));

    // 2. Attribution des rôles selon le nombre de joueurs
    const n = players.length;
    let rolesPool = [];
    if (n <= 6) rolesPool = [...ROLES_CONFIG.SMALL.roles];
    else if (n <= 10) rolesPool = [...ROLES_CONFIG.MEDIUM.roles];
    else rolesPool = [...ROLES_CONFIG.LARGE.roles];

    // On complète si besoin et on mélange
    while (rolesPool.length < n) rolesPool.push(Math.random() > 0.3 ? 'S' : 'I');
    rolesPool.sort(() => Math.random() - 0.5);

    // 3. Attribution des métiers
    const jobsPool = [...JOBS_LIST].sort(() => Math.random() - 0.5);
    const alphaPlayer = players[rolesPool.indexOf('A')];

    // 4. Envoi des paquets INIT à chaque joueur
    for (let i = 0; i < n; i++) {
        let p = players[i];
        p.role = rolesPool[i];
        p.metier = jobsPool[i % jobsPool.length];

        p.conn.send({
            type: 'INIT',
            role: p.role,
            metier: p.metier,
            all: players.map(pl => pl.name),
            alphaName: (['I', 'A', 'M'].includes(p.role)) ? alphaPlayer.name : null 
        });
        await new Promise(r => setTimeout(r, 50)); // Petit délai pour le réseau
    }

    // 5. Mise à jour de l'interface console
    document.getElementById('setup-zone').style.display = 'none';
    document.getElementById('game-zone').style.display = 'block';
    document.getElementById('game-info-row').style.display = 'flex';
    
    Logger.add("Système initialisé. Protocoles de sécurité activés.");
    nextTurn();
}

/**
 * Passage au tour suivant (Nouveau Gardien)
 */
export function nextTurn() {
    gameState.currentPhase = "DÉSIGNATION";
    gameState.currentProposedS = null;
    gameState.isProcessingAction = false;
    
    // Reset des votes
    votes.oui = 0; votes.non = 0; votes.total = 0; votes.list = [];

    const activeGardien = players[curG];
    Logger.add(`Nouveau Gardien désigné : ${activeGardien.name.toUpperCase()}`);

    // Nettoyage des interfaces mobiles
    players.forEach(p => p.conn.send({ type: 'CLEAN_UI' }));

    // Filtrage des joueurs éligibles pour la Sentinelle
    const eligible = players.map(p => p.name).filter(name => {
        if (name === activeGardien.name) return false;
        if (name === gameState.lastSentinelle) return false;
        if (players.length > 5 && name === gameState.lastGardien) return false;
        return true;
    });

    activeGardien.conn.send({ type: 'YOUR_TURN', eligible });
    
    render();
    updatePlayerTags();
}

/**
 * Affiche le gouvernement proposé et lance le vote
 */
export function showGov(gName, sName) {
    gameState.currentPhase = "VOTE";
    gameState.currentProposedS = sName;

    const summary = document.getElementById('vote-summary');
    summary.innerText = `SCRUTIN : Approuvez-vous ce conseil ?\nVOTES : 0 / ${players.length}`;
    
    players.forEach(p => p.conn.send({ type: 'VOTE_START', g: gName, s: sName }));
    updatePlayerTags();
}

/**
 * Résolution du vote
 */
export function resolveVote() {
    if (votes.oui > votes.non) {
        Logger.add("Conseil validé par le personnel.");
        gameState.currentPhase = "LÉGISLATION_G";
        
        // Tirage des 3 cartes
        gameState.currentLegislativeCards = [deck.pop(), deck.pop(), deck.pop()];
        
        // Vérification condition Alpha (si 3 crises ou plus)
        const sIdx = players.findIndex(p => p.name === gameState.currentProposedS);
        if (gameState.crise >= 3 && players[sIdx].role === 'A') {
            return triggerWin("INFECTÉS", "L'Alpha a infiltré le commandement.");
        }

        players[curG].conn.send({ type: 'GARDIEN_PICK', cards: gameState.currentLegislativeCards });
        
        // On informe les autres
        players.forEach(p => {
            if (p !== players[curG]) p.conn.send({ type: 'WAIT_LEGISLATION', step: 'GARDIEN' });
        });
    } else {
        gameState.oxy--;
        Logger.add(`Conseil rejeté. Perte d'oxygène : ${gameState.oxy}/3`, "ALERTE");
        
        if (gameState.oxy <= 0) {
            applyEmergencyDecret();
        } else {
            incrementGardien();
            setTimeout(nextTurn, 1500);
        }
    }
    render();
}

/**
 * Application d'un décret
 */
export function applyDecret(type) {
    gameState.lastGardien = players[curG].name;
    gameState.lastSentinelle = gameState.currentProposedS;
    
    if (type === 'S') gameState.survie++;
    else if (type === 'C') {
        gameState.crise++;
        // Ici on appellera checkCasePower(gameState.crise) plus tard
    }

    if (gameState.survie >= 5) triggerWin("SURVIVANTS", "Protocoles rétablis.");
    else if (gameState.crise >= 6) triggerWin("INFECTÉS", "Infection totale.");
    else {
        incrementGardien();
        setTimeout(nextTurn, 1000);
    }
}

function incrementGardien() {
    curG = (curG + 1) % players.length;
}

function triggerWin(team, reason) {
    gameState.gameOver = true;
    import('../ui/renderer.js').then(m => m.showEndScreen(team, reason));
}
