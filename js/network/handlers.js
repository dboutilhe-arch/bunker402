// js/network/handlers.js 
import { state, players } from '../core/state.js';
import { Logger } from '../ui/logger.js';
import { render, createPlayerTag, syncTerminals, resetVoteColors } from '../ui/renderer.js';
import { showGov, resolveVote, applyDecret, restorePlayerAction } from '../game/engine.js';
import { testPlayerBlood, executePlayer } from '../game/powers.js';

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
            
        case 'REQUEST_EXECUTION':
            handleExecution(conn, data);
            break;

        case 'REQUEST_CENSURE':
            handleCensure(conn, data);
            break;

        case 'SYNC_REQUEST':
            handleSyncRequest(conn);
            break;
    }
}

// --- SOUS-FONCTIONS DE TRAITEMENT

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
            const canSeeAlpha = ['I', 'A', 'M'].includes(p.role);
            const alphaObj = players.find(a => a.role === 'A');
            p.conn.send({ 
                type: 'INIT', 
                role: p.role, 
                metier: p.metier, 
                all: players.map(pl => pl.name),
                alphaName: canSeeAlpha ? (alphaObj ? alphaObj.name : "Inconnu") : null,
                powerUsed: p.jobPowerUsed
            });
            syncTerminals();
            restorePlayerAction(p);
        }
        return;
    }

    // CAS NOUVEAU JOUEUR
    if (players.length >= 100) return conn.send({ type: 'ERROR_BUNKER_FULL' });

    players.push({ 
        name: data.name, 
        conn: conn, 
        jobPowerUsed: false,
        casePowerUsed: false
    });
    createPlayerTag(data.name); // On crée l'étiquette
    
    document.getElementById('count').innerText = players.length;
    if(players.length >= 5) document.getElementById('start-btn').disabled = false;
    conn.send({ type: 'CONNECTED' });
}

function handleSentinelle(data) {
    resetVoteColors();
    Logger.add(`CONSEIL : Le Gardien ${data.gardienName} a désigné ${data.sentinelleName}.`);
    const gTags = document.querySelectorAll(`[id="tag-${players[state.curG].name.toLowerCase()}"]`);
    gTags.forEach(tag => {
        tag.querySelector('.p-name').innerHTML = `⭐ ${players[state.curG].name.toUpperCase()}`;
        tag.style.borderColor = "#f1c40f"; tag.style.borderWidth = "2px";
    });
    state.currentProposedS = data.sentinelleName;
    state.curSIdx = players.findIndex(p => p.name === data.sentinelleName);
    showGov(data.gardienName, data.sentinelleName);
}

function handleVote(data) {
    // 1. SÉCURITÉ : On récupère le joueur qui vote
    const voter = players.find(p => p.name.toLowerCase() === data.playerName.toLowerCase());

    // 2. Si le joueur est mort, on ignore totalement son message
    if (!voter || !voter.isAlive) return;

    // 3. Vérifie si ce joueur a DÉJÀ voté
    const dejaVote = state.votes.list.some(v => v.name.toLowerCase() === data.playerName.toLowerCase());
    if (dejaVote) return;
  
    // Enregistrement du vote
    state.votes[data.choice.toLowerCase()]++; 
    state.votes.total++;
    state.votes.list.push({ name: data.playerName, choice: data.choice });
  
    // Calcul basé sur les vivants
    const aliveCount = players.filter(p => p.isAlive).length;
    const summary = document.getElementById('vote-summary');
    summary.innerText = `SCRUTIN EN COURS : Approuvez-vous ce conseil ?\nVOTES TRANSMIS : ${state.votes.total} / ${aliveCount}`;
    summary.style.color = "#f1c40f";
  
    Logger.add(`Données de vote reçues de : ${data.playerName}`);
  
    // Si tout le monde (vivant) a voté, on résout
    if(state.votes.total === aliveCount) {
        Logger.add("Scrutin terminé. Calcul des résultats...");
        resolveVote();
    }
}

function handleDiscard(data) {
    state.currentPhase = "LÉGISLATION_S"; // On change la phase
    state.currentLegislativeCards = data.remaining; // On stocke les 2 cartes restantes
    
    document.getElementById('vote-summary').innerText = "DÉCRET REÇU : La Sentinelle choisit le décret final";
    Logger.add(`LÉGISLATION : Le Gardien ${players[state.curG].name} a défaussé un décret secret.`);
    Logger.add(`SYSTÈME : Transfert des décrets restants à la Sentinelle.`);
    
    // 1. On prévient tout les vivants (y compris la sentinelle) de l'étape
    players.filter(p => p.isAlive).forEach(p => p.conn.send({ type: 'WAIT_LEGISLATION', step: 'SENTINELLE' }));
  
    // 2. On envoie les cartes à la Sentinelle après un micro-délai (100ms)
    // Cela laisse le temps au téléphone de traiter le message précédent
    setTimeout(() => {
        if (players[state.curSIdx] && players[state.curSIdx].conn.open) {
            players[state.curSIdx].conn.send({ type: 'SENTINELLE_PICK', cards: state.currentLegislativeCards });
        }
    }, 100);
}

function handleFinalChoice(data) {
    const typeLabel = data.card === 'S' ? "SURVIE" : (data.card === 'C' ? "CRISE" : "SUFFRAGE");
    Logger.add(`LÉGISLATION : La Sentinelle a promulgué le décret : ${typeLabel}`);
    
    state.isProcessingAction = true;
    applyDecret(data.card);
}

function handleBloodTest(conn, data) {
    const requester = players.find(p => p.conn === conn);
    if (!requester) return;

    // Si c'est un pouvoir forcé par une case, on vérifie casePowerUsed
    if (data.isForced) {
        if (!requester.casePowerUsed) {
            requester.casePowerUsed = true;
            testPlayerBlood(requester, data.targetName);
        }
    } else {
        // Sinon, c'est le pouvoir de métier
        if (!requester.jobPowerUsed) {
            requester.jobPowerUsed = true;
            testPlayerBlood(requester, data.targetName);
        }
    }
}

function handleExecution(conn, data) {
    const requester = players.find(p => p.conn === conn);
    if (!requester || !requester.isAlive) return;

    if (data.isForced) {
        if (!requester.casePowerUsed) {
            requester.casePowerUsed = true;
            executePlayer(requester, data.targetName);
        }
    } else {
        if (!requester.jobPowerUsed) {
            requester.jobPowerUsed = true;
            executePlayer(requester, data.targetName);
        }
    }
}

function handleCensure(conn, data) {
    const requester = players.find(p => p.conn === conn);
    if (!requester || !requester.isAlive) return;

    if (data.isForced) {
        if (!requester.casePowerUsed) {
            requester.casePowerUsed = true;
            applyCensure(requester, data.targetName);
        }
    } else {
        if (!requester.jobPowerUsed) {
            requester.jobPowerUsed = true;
            applyCensure(requester, data.targetName);
        }
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
