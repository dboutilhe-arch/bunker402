// js/network/handlers.js  
import { DECREETS_DATABASE } from '../core/constants.js';
import { state, players } from '../core/state.js';
import { Logger } from '../ui/logger.js';
import { render, createPlayerTag, syncTerminals, resetVoteColors } from '../ui/renderer.js';
import { showGov, resolveVote, applyDecret, restorePlayerAction, handleDiscardFromNet, nextTurn } from '../game/engine.js';
import { testPlayerBlood, executePlayer, applyCensure, purgeCriseCard } from '../game/powers.js';

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

        case 'REQUEST_PURGE':
            handlePurgeDecret(conn, data);
            break;

        case 'REQUEST_COUP_ETAT':
            handleCoupEtat(conn, data);
            break;

        case 'REQUEST_VIGILE_BAN':
            handleVigileBan(conn, data);
            break;

        case 'ACTION_CONFIRMED':
            handleActionConfirmed();
            break;

        case 'SYNC_REQUEST':
            handleSyncRequest(conn);
            break;
            
        case 'USE_ARCHIVISTE_POWER':
            handleArchivistePower(conn);
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
    const cardId = data.card; 
    const cardData = DECREETS_DATABASE[cardId];
    if (!cardData) return;
    
    const discardedByCouncil = state.currentLegislativeCards.find(id => id !== cardId);
    if (discardedByCouncil) {
        state.discard.push(discardedByCouncil);
    }
    
    // On ajuste le log si c'était le Gardien sous 49.3
    if (state.currentPhase === "LÉGISLATION_493") {
        Logger.add(`🔨 49.3 RÉSOLU : Le Gardien a choisi seul de promulguer : ${cardData.name.toUpperCase()}`);
    } else {
        Logger.add(`LÉGISLATION : La Sentinelle a promulgué le décret : ${cardData.name.toUpperCase()}`);
    }
    
    state.isProcessingAction = true;
    applyDecret(cardId, cardData.type);
}

function handleCensure(conn, data) {
    const requester = players.find(p => p.conn === conn);
    if (!requester || !requester.isAlive) return;

    if (state.currentPowerActive || data.isForced) {
        applyCensure(requester, data.targetName);
    } else {
        // Mode normal : Pouvoir de métier de l'Intendant
        if (!requester.jobPowerUsed) {
            requester.jobPowerUsed = true;
            applyCensure(requester, data.targetName);
        }
    }
}

function handleBloodTest(conn, data) {
    const requester = players.find(p => p.conn === conn);
    if (!requester) return;

    if (state.currentPowerActive || data.isForced) {
        testPlayerBlood(requester, data.targetName);
    } else {
        if (!requester.jobPowerUsed) {
            requester.jobPowerUsed = true;
            testPlayerBlood(requester, data.targetName);
        }
    }
}

function handleExecution(conn, data) {
    const requester = players.find(p => p.conn === conn);
    if (!requester || !requester.isAlive) return;

    if (state.currentPowerActive || data.isForced) {
        executePlayer(requester, data.targetName);
    } else {
        if (!requester.jobPowerUsed) {
            requester.jobPowerUsed = true;
            executePlayer(requester, data.targetName);
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

function handleActionConfirmed() {
    if (state.currentPowerActive) {
        state.currentPowerActive = false;
        syncTerminals();
        setTimeout(() => {
            // Si un ordre extraordinaire est en cours, on ne décale pas l'index.
            // La variable state.curG a déjà été fixée sur la cible dans handleCoupEtat.
            if (state.nextNormalGardien === null) {
                state.curG = (state.curG + 1) % players.length;
            }
            state.isProcessingAction = false;
            nextTurn();
        }, 500); 
    }
}

function handlePurgeDecret(conn, data) {
    const requester = players.find(p => p.conn === conn);
    if (!requester || !requester.isAlive) return;
    purgeCriseCard(requester, data.cardId);
}

function handleArchivistePower(conn) {
    const requester = players.find(p => p.conn === conn);
    if (!requester || !requester.isAlive || requester.metier !== 'Archiviste' || requester.jobPowerUsed) return;

    // On verrouille le pouvoir pour le restant de la partie
    requester.jobPowerUsed = true;
    state.archivistePowerActive = true;

    Logger.add(`📜 SYSTÈME : L'Archiviste (${requester.name}) active ses protocoles de recherche pour ce vote.`);

    // On confirme au joueur que son pouvoir est enclenché
    conn.send({ type: 'POWER_ACTIVATED_CONFIRM', message: "Protocole d'archive activé pour le vote en cours." });
    
    // On synchronise pour griser son bouton sur son téléphone
    syncTerminals();
}

function handleCoupEtat(conn, data) {
    const requester = players.find(p => p.conn === conn);
    if (!requester || !requester.isAlive) return;

    const targetIdx = players.findIndex(p => p.name === data.targetName);
    if (targetIdx === -1 || !players[targetIdx].isAlive) return;

    Logger.add(`🔥 COUP D'ÉTAT : ${requester.name} a désigné ${data.targetName} comme prochain Gardien !`);

    // ✨ 1. ON SAUVEGARDE L'AVENIR : Le prochain normal, c'est le successeur de Luc (requester)
    const currentGardienIdx = players.findIndex(p => p.name === requester.name);
    state.nextNormalGardien = (currentGardienIdx + 1) % players.length;

    // ✨ 2. ON PROGRESSE DIRECTEMENT VERS LA CIBLE
    state.curG = targetIdx;

    // ✨ 3. RÉCAP VISUEL PROPRE : Type dédié envoyé au mobile
    requester.conn.send({
        type: 'COUP_ETAT_RESULT',
        target: data.targetName,
        isForced: state.currentPowerActive
    });

    syncTerminals();
}

function handleVigileBan(conn, data) {
    const requester = players.find(p => p.conn === conn);
    if (!requester || !requester.isAlive || requester.metier !== 'Vigile' || requester.jobPowerUsed) return;

    // SÉCURITÉ SERVEUR : On refuse l'action si on n'est pas en phase de désignation
    if (state.currentPhase !== "DÉSIGNATION") {
        requester.conn.send({ type: 'SYNC_REQUEST' }); // Force le mobile à se resynchroniser pour se griser
        return;
    }

    // Consommation du pouvoir unique
    requester.jobPowerUsed = true;
    state.vigileBannedPlayer = data.targetName;

    Logger.add(`🛡️ VIGILE : ${requester.name} a bloqué les accès de ${data.targetName}. Impossible de le nommer Sentinelle ce tour-ci !`);

    // On renvoie une confirmation OK au Vigile
    requester.conn.send({
        type: 'CENSURE_RESULT', // On recycle le template violet OK
        target: data.targetName,
        isForced: false
    });

    syncTerminals();
    
    // On force le rafraîchissement de l'écran du Gardien en cours pour mettre sa liste à jour immédiatement !
    const currentGardien = players[state.curG];
    if (currentGardien && currentGardien.conn.open) {
        restorePlayerAction(currentGardien);
    }
}
