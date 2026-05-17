// js/network/handlers.js 
import { DECREETS_DATABASE } from '../core/constants.js';
import { state, players } from '../core/state.js';
import { Logger } from '../ui/logger.js';
import { render, createPlayerTag, syncTerminals, resetVoteColors } from '../ui/renderer.js';
import { showGov, resolveVote, applyDecret, restorePlayerAction, handleDiscardFromNet } from '../game/engine.js';
import { testPlayerBlood, executePlayer, applyCensure } from '../game/powers.js';

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
        casePowerUsed: false,
        isCensored: false,
        censoredBy: ""
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

// js/network/handlers.js

function handleVote(data) {
    // 1. SÉCURITÉ : On récupère le joueur qui vote
    const voter = players.find(p => p.name.toLowerCase() === data.playerName.toLowerCase());

    // 2. Si le joueur est mort ou censuré, on ignore totalement son message
    if (!voter || !voter.isAlive || voter.isCensored) return;

    // 3. Vérifie si ce joueur a DÉJÀ voté
    const dejaVote = state.votes.list.some(v => v.name.toLowerCase() === data.playerName.toLowerCase());
    if (dejaVote) return;
  
    // --- 4. CALCUL DYNAMIQUE DU POIDS DU VOTE (SUFFRAGE) ---
    let voteWeight = 1;
    const choiceKey = data.choice.toLowerCase(); // 'oui' ou 'non'

    // PASSIF MÉTIER : Shérif (Son vote compte double de base)
    if (voter.metier === 'Shérif') {
        voteWeight = 2;
        Logger.add(`🗳️ MÉTIER [Shérif] : Le vote de base de ${voter.name} compte DOUBLE.`);
    }

    // PASSIF MÉTIER : Fossoyeur (+1 voix par joueur mort)
    if (voter.metier === 'Fossoyeur') {
        const deadCount = players.filter(p => !p.isAlive).length;
        voteWeight += deadCount;
        Logger.add(`🗳️ MÉTIER [Fossoyeur] : ${voter.name} obtient +${deadCount} voix grâce aux morts (Poids total : ${voteWeight}).`);
    }
    
    // CAS A : Conseil Restreint (Gardien & Sentinelle comptent double)
    if (state.slotsSuffrageCard === 'conseil_restreint') {
        const isGardien = (voter.name === players[state.curG].name);
        const isSentinelle = (state.curSIdx !== -1 && voter.name === players[state.curSIdx].name);
        if (isGardien || isSentinelle) {
            voteWeight = 2;
            Logger.add(`🗳️ SUFFRAGE [Conseil Restreint] : Vote doublé pour l'élu ${voter.name}.`);
        }
    } 
    // CAS B : Grève du Zèle (Les votes NON comptent double)
    else if (state.slotsSuffrageCard === 'greve_zele' && choiceKey === 'non') {
        voteWeight = 2;
        Logger.add(`🗳️ SUFFRAGE [Grève du Zèle] : Le vote REFUSER de ${voter.name} compte DOUBLE.`);
    }
    // CAS C : Insurrection Populaire (Les Civils comptent double)
    else if (state.slotsSuffrageCard === 'insurrection_populaire' && voter.metier === 'Civil') {
        voteWeight = 2;
        Logger.add(`🗳️ SUFFRAGE [Insurrection Populaire] : Le vote du Civil ${voter.name} compte DOUBLE.`);
    }

    // Enregistrement du vote sur le serveur
    state.votes[choiceKey] += voteWeight; 
    state.votes.total += voteWeight; 
    state.votes.list.push({ name: data.playerName, choice: data.choice });
  
    // --- 5. COMPTEUR DE PERSONNES PHYSIQUES ATTENDUES ---
    const eligibleCount = players.filter(p => p.isAlive && !p.isCensored).length;
    const totalJoueursAyantVote = state.votes.list.length;

    // Mise à jour du compteur PC
    const summary = document.getElementById('vote-summary');
    summary.innerText = `SCRUTIN EN COURS : Approuvez-vous ce conseil ?\nVOTES TRANSMIS : ${totalJoueursAyantVote} / ${eligibleCount}`;
    summary.style.color = "#f1c40f";
  
    Logger.add(`Données de vote reçues de : ${data.playerName}`);
  
    // 6. CLÔTURE DU SCRUTIN
    if (totalJoueursAyantVote === eligibleCount) {
        Logger.add("Scrutin terminé. Calcul des résultats...");
        resolveVote();
    }
}

function handleDiscard(data) {
    handleDiscardFromNet(data.discardedCardId, data.remaining);
}

function handleFinalChoice(data) {
    const cardId = data.card; // La carte choisie
    const cardData = DECREETS_DATABASE[cardId];
    if (!cardData) return;
    const discardedBySentinelle = state.currentLegislativeCards.find(id => id !== cardId);
    if (discardedBySentinelle) {
        state.discard.push(discardedBySentinelle);
    }
    const typeLabel = cardData.type === 'S' ? "SURVIE" : (cardData.type === 'C' ? "CRISE" : "SUFFRAGE");
    Logger.add(`LÉGISLATION : La Sentinelle a promulgué le décret : ${cardData.name.toUpperCase()}`);
    state.isProcessingAction = true;
    applyDecret(cardId, cardData.type);
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
