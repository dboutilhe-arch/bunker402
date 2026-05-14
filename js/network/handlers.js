
// js/network/handlers.js
import { state, players, votes, curG, curSIdx, currentPhase, currentLegislativeCards, isProcessingAction } from '../core/state.js';
import { Logger } from '../ui/logger.js';
import { render, resetTagColors, createPlayerTag, syncTerminals } from '../ui/renderer.js';
import { showGov, resolveVote, applyDecret, restorePlayerAction } from '../game/engine.js';
import { testPlayerBlood } from '../game/powers.js';

export function handlePlayerData(conn, data) {
    if (state.gameOver) return;

    switch (data.type) {
        case 'JOIN':
            handleJoin(conn, data);
            break;
            
        case 'SENTINELLE_CHOISIE':
            handleSentinelle(data);
            break;

        case 'VOTE_DONE':
            handleVote(data);
            break;

        case 'DISCARD_DONE':
            handleDiscard(data);
            break;

        case 'FINAL_CHOICE':
            handleFinalChoice(data);
            break;

        case 'REQUEST_BLOOD_TEST':
            handleBloodTest(conn, data);
            break;

        case 'SYNC_REQUEST':
            handleSyncRequest(conn);
            break;
    }
}

// --- SOUS-FONCTIONS DE TRAITEMENT (extraites de ton network.js) ---

function handleJoin(conn, data) {
    let p = players.find(pl => pl.name.toLowerCase() === data.name.toLowerCase());
    if (p) {
        // CAS RECONNEXION : On ne touche pas au HTML (l'étiquette existe déjà)
        p.conn = conn; 
        p.conn.send({ type: 'CONNECTED' });
        const tags = document.querySelectorAll(`[id="tag-${p.name.toLowerCase()}"]`);
        tags.forEach(tag => { tag.style.opacity = "1"; tag.style.filter = "none"; });  // Reset de l'étiquette
        Logger.add(`RECONNEXION : Signal de ${p.name} rétabli.`);
        
        if (document.getElementById('game-zone').style.display === 'block') {
            p.conn.send({ 
                type: 'INIT', role: p.role, metier: p.metier, all: players.map(pl => pl.name),
                alphaName: (['I', 'A', 'M'].includes(p.role)) ? players.find(a => a.role === 'A').name : null,
                powerUsed: p.powerUsed
            });
            syncTerminals();
            restorePlayerAction(p);
        }
        return;
    }

    // CAS NOUVEAU JOUEUR
    if (players.length >= 100) return conn.send({ type: 'ERROR_BUNKER_FULL' });

    players.push({ name: data.name, conn: conn, powerUsed: false });
    createPlayerTag(data.name); // On crée l'étiquette
    
    document.getElementById('count').innerText = players.length;
    if(players.length >= 5) document.getElementById('start-btn').disabled = false;
    conn.send({ type: 'CONNECTED' });
}

function handleSentinelle(data) {
    Logger.add(`CONSEIL : Le Gardien ${data.gardienName} a désigné ${data.sentinelleName}.`);
    resetTagColors();
    const gTags = document.querySelectorAll(`[id="tag-${players[state.curG].name.toLowerCase()}"]`);
    gTags.forEach(tag => {
        tag.querySelector('.p-name').innerHTML = `⭐ ${players[state.curG].name.toUpperCase()}`;
        tag.style.borderColor = "#f1c40f"; tag.style.borderWidth = "2px";
    });
    state.curSIdx = players.findIndex(p => p.name === data.sentinelleName);
    showGov(data.gardienName, data.sentinelleName);
}

function handleVote(data) {
    // 1. SÉCURITÉ : On vérifie si ce joueur a DÉJÀ voté dans ce tour
    const dejaVote = votes.list.some(v => v.name.toLowerCase() === data.playerName.toLowerCase());
    
    if (dejaVote) return; // On ignore purement et simplement ce message
  
    // Si c'est un nouveau vote, on l'enregistre normalement
    votes[data.choice.toLowerCase()]++; 
    votes.total++;
    votes.list.push({ name: data.playerName, choice: data.choice });
  
    // Mise à jour de l'interface console pour voir qui a voté
    const summary = document.getElementById('vote-summary');
    summary.innerText = `SCRUTIN EN COURS : Approuvez-vous ce conseil ?\nVOTES TRANSMIS : ${votes.total} / ${players.length}`;
    summary.style.color = "#f1c40f"; // Couleur "Alerte" pendant le vote
  
    // On ajoute une ligne dans le log
    Logger.add(`Données de vote reçues de : ${data.playerName}`);
  
    // Si tout le monde a voté, on résout
    if(votes.total === players.length)  {
        Logger.add("Scrutin terminé. Calcul des résultats...");
        resolveVote();
    }
}

function handleDiscard(data) {
    currentPhase = "LÉGISLATION_S"; // On change la phase
    currentLegislativeCards = data.remaining; // On stocke les 2 cartes restantes
    
    document.getElementById('vote-summary').innerText = "DÉCRET REÇU : La Sentinelle choisit le décret final";
    Logger.add(`LÉGISLATION : Le Gardien ${players[curG].name} a défaussé un décret secret.`);
    Logger.add(`SYSTÈME : Transfert des décrets restants à la Sentinelle.`);
    
    // 1. On prévient tout le monde (y compris la sentinelle) de l'étape
    players.forEach(p => p.conn.send({ type: 'WAIT_LEGISLATION', step: 'SENTINELLE' }));
  
    // 2. On envoie les cartes à la Sentinelle après un micro-délai (100ms)
    // Cela laisse le temps au téléphone de traiter le message précédent
    setTimeout(() => {
        if (players[curSIdx] && players[curSIdx].conn.open) {
            players[curSIdx].conn.send({ type: 'SENTINELLE_PICK', cards: currentLegislativeCards });
        }
    }, 100);
}

function handleFinalChoice(data) {
    const typeLabel = data.card === 'S' ? "SURVIE" : (data.card === 'C' ? "CRISE" : "SUFFRAGE");
    Logger.add(`LÉGISLATION : La Sentinelle a promulgué le décret : ${typeLabel}`);
    
    isProcessingAction = true;
    applyDecret(data.card);
}

function handleBloodTest(conn, data) {
    const requester = players.find(p => p.conn === conn);
    
    // On vérifie si le serveur dit que c'est encore possible
    if (requester && !requester.powerUsed) {
        requester.powerUsed = true; // On verrouille immédiatement sur le serveur
        testPlayerBlood(requester, data.targetName); 
    }
}

function handleSyncRequest(conn) {
    const p = players.find(pl => pl.conn === conn);
    if (p) {
        // On renvoie l'état des plateaux (Oxygène, Décrets)
        p.conn.send({ type: 'SYNC_STATE', state: state });
        
        // On restaure l'action en cours (Vote, Gardien_Pick, etc.)
        restorePlayerAction(p);
    }
}

export function handlePlayerDisconnect(closedConn) {
    const index = players.findIndex(p => p.conn === closedConn);
    if (index === -1) return;
    const player = players[index];

    if (document.getElementById('game-zone').style.display === 'none') {
        Logger.add(`SORTIE LOBBY : ${player.name} a quitté.`);
        players.splice(index, 1);
        const tags = document.querySelectorAll(`[id="tag-${player.name.toLowerCase()}"]`);
        tags.forEach(tag => tag.remove());
        document.getElementById('count').innerText = players.length;
        if(players.length < 5) document.getElementById('start-btn').disabled = true;
    } else {
        Logger.add(`SIGNAL PERDU : ${player.name} déconnecté.`);
        const tags = document.querySelectorAll(`[id="tag-${player.name.toLowerCase()}"]`);
        tags.forEach(tag => tag.style.opacity = "0.5");
    }
}
