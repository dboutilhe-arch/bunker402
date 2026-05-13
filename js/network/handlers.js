// handlers.js
//

import { gameState, players, votes } from '../core/state.js';
import { Logger } from '../ui/logger.js';
import { resolveVote, applyDecret, nextTurn } from '../game/engine.js';
import { testPlayerBlood } from '../game/powers.js';
import { render, updatePlayerTags } from '../ui/renderer.js';

/**
 * Gère les données reçues depuis les terminaux joueurs
 */
export function handlePlayerData(conn, data) {
    if (gameState.gameOver) return;

    switch (data.type) {
        case 'JOIN':
            handleJoin(conn, data);
            break;

        case 'VOTE_DONE':
            handleVote(data);
            break;

        case 'FINAL_CHOICE':
            if (!gameState.isProcessingAction) {
                gameState.isProcessingAction = true;
                applyDecret(data.card);
            }
            break;

        case 'DISCARD_DONE':
            handleDiscard(data);
            break;

        case 'SENTINELLE_CHOISIE':
            handleSentinelleSelection(data);
            break;

        case 'REQUEST_BLOOD_TEST':
            handleBloodTest(conn, data);
            break;
            
        case 'SYNC_REQUEST':
            // Le joueur demande un rafraîchissement (reconnexion ou refresh page)
            const p = players.find(pl => pl.conn === conn);
            if (p) {
                p.conn.send({ type: 'SYNC_STATE', state: gameState });
                // Note : engine.js devra contenir une fonction pour restaurer l'UI spécifique
                // selon la phase actuelle (ex: redonner les cartes à choisir)
            }
            break;
    }
}

/**
 * Gestion de l'arrivée ou reconnexion d'un joueur
 */
function handleJoin(conn, data) {
    let p = players.find(pl => pl.name.toLowerCase() === data.name.toLowerCase());
    
    if (p) {
        // Cas : Reconnexion
        p.conn = conn;
        p.conn.send({ type: 'CONNECTED' });
        Logger.add(`RECONNEXION : Signal de ${p.name} rétabli.`);
        
        // Si la partie est lancée, on lui renvoie ses infos de rôle/métier
        if (document.getElementById('game-zone').style.display === 'block') {
            p.conn.send({ 
                type: 'INIT', 
                role: p.role, 
                metier: p.metier,
                all: players.map(pl => pl.name),
                powerUsed: p.powerUsed
            });
        }
    } else {
        // Cas : Nouveau joueur
        if (players.length >= 100) return conn.send({ type: 'ERROR_BUNKER_FULL' });
        
        players.push({ 
            name: data.name, 
            conn: conn, 
            powerUsed: false,
            role: null,
            metier: null 
        });
        
        Logger.add(`ARRIVÉE : ${data.name} a rejoint le bunker.`);
        document.getElementById('count').innerText = players.length;
        
        // Active le bouton start si on a assez de monde
        if (players.length >= 5) {
            const startBtn = document.getElementById('start-btn');
            if (startBtn) startBtn.disabled = false;
        }
    }
    updatePlayerTags();
}

/**
 * Gestion du dépouillement des votes
 */
function handleVote(data) {
    const dejaVote = votes.list.some(v => v.name.toLowerCase() === data.playerName.toLowerCase());
    if (dejaVote) return;

    votes[data.choice.toLowerCase()]++;
    votes.total++;
    votes.list.push({ name: data.playerName, choice: data.choice });

    const summary = document.getElementById('vote-summary');
    if (summary) {
        summary.innerText = `SCRUTIN EN COURS...\nVOTES TRANSMIS : ${votes.total} / ${players.length}`;
    }

    Logger.add(`Données de vote reçues de : ${data.playerName}`);
    updatePlayerTags();

    if (votes.total === players.length) {
        Logger.add("Scrutin terminé. Calcul des résultats...");
        resolveVote();
    }
}

/**
 * Le Gardien a défaussé, on passe à la Sentinelle
 */
function handleDiscard(data) {
    gameState.currentPhase = "LÉGISLATION_S";
    gameState.currentLegislativeCards = data.remaining;
    
    Logger.add(`LÉGISLATION : Le Gardien a défaussé un décret secret.`);
    
    // On trouve la sentinelle pour lui envoyer les 2 cartes
    const sentinelle = players.find(p => p.name === gameState.currentProposedS);
    if (sentinelle) {
        sentinelle.conn.send({ type: 'SENTINELLE_PICK', cards: gameState.currentLegislativeCards });
    }
    
    // On informe les autres
    players.forEach(p => {
        if (p.name !== gameState.currentProposedS) {
            p.conn.send({ type: 'WAIT_LEGISLATION', step: 'SENTINELLE' });
        }
    });
}

/**
 * Le Gardien a choisi sa Sentinelle
 */
function handleSentinelleSelection(data) {
    Logger.add(`CONSEIL : Le Gardien ${data.gardienName} a désigné ${data.sentinelleName}.`);
    gameState.currentProposedS = data.sentinelleName;
    
    // On appelle la fonction de l'engine qui lance la phase de vote
    // Note : Cette fonction doit être importée/définie dans engine.js
    import('../game/engine.js').then(m => m.showGov(data.gardienName, data.sentinelleName));
}

/**
 * Traitement du test sanguin (Docteur ou Case de crise)
 */
function handleBloodTest(conn, data) {
    const requester = players.find(p => p.conn === conn);
    if (requester) {
        // On autorise si c'est forcé (case de crise) OU si le pouvoir n'est pas utilisé
        if (data.isForced || !requester.powerUsed) {
            if (!data.isForced) requester.powerUsed = true;
            testPlayerBlood(requester, data.targetName);
        }
    }
}
