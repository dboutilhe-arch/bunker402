// engine.js
async function initGame() {
    // 1. Préparation des données
    deck = [...Array(10).fill('S'), ...Array(15).fill('C'), ...Array(4).fill('F')].sort(() => Math.random() - 0.5);
    const roles = (players.length >= 7 ? ['S','S','S','S','I','I','A'] : ['S','S','S','I','A']).sort(() => Math.random() - 0.5);
    const metiers = ['Shérif', 'Docteur', 'Technicien', 'Journaliste', 'Militaire', 'Psychologue', 'Contrebandier', 'Fossoyeur', 'Éclaireur', 'Vigile'].sort(() => Math.random() - 0.5);
    
    // ÉTAPE CRUCIALE : On assigne les rôles à TOUT LE MONDE d'abord
    players.forEach((p, i) => {
        p.role = roles[i];
        p.metier = metiers[i];
    });

    // Maintenant l'Alpha est garanti d'exister pour tout le monde
    const alphaPlayer = players.find(p => p.role === 'A');

    // 2. Envoi avec un délai de sécurité au démarrage
    // On attend 500ms pour laisser les connexions se stabiliser
    await new Promise(r => setTimeout(r, 500));

    for (let p of players) {
        let initPack = {
            type: 'INIT',
            role: p.role,
            roleConfig: ROLES_CONFIG[p.role], // Utilise la config définie dans state.js
            metier: p.metier,
            all: players.map(pl => pl.name),
            alphaName: (p.role === 'I' || p.role === 'A') ? alphaPlayer.name : null 
        };

        if (p.conn && p.conn.open) {
            p.conn.send(initPack);
            addLog(`Transmission : ${p.name}`);
        }
        
        // On laisse 200ms entre chaque joueur pour ne pas saturer le canal PeerJS
        await new Promise(r => setTimeout(r, 200));
    }

    updateTagsWithJobs();
    document.getElementById('setup-zone').style.display = 'none';
    document.getElementById('game-zone').style.display = 'block';
    nextTurn();
}

// Gestion du changement de tour
function nextTurn() {

    currentPhase = "DÉSIGNATION"; // Mise à jour phase
    
    const tags = document.querySelectorAll(`[id="tag-${players[curG].name.toLowerCase()}"]`);
    tags.forEach(tag => {
        const nameDiv = tag.querySelector('.p-name');
        if (nameDiv) nameDiv.innerHTML = `⭐ ${players[curG].name.toUpperCase()}`;
        tag.style.borderColor = "#f1c40f"; 
        tag.style.borderWidth = "2px";
    });

    addLog(`SYSTÈME : Désignation du nouveau Gardien : ${players[curG].name.toUpperCase()}`);
    
    votes = { oui: 0, non: 0, total: 0, list: [] };
    document.getElementById('gov-display').style.display = 'block';
    document.getElementById('vote-summary').innerText = "DÉSIGNATION DU CONSEIL : Le Gardien choisit sa Sentinelle...";
    document.getElementById('vote-summary').style.color = "#3498db";
    
    document.getElementById('g-name').innerText = players[curG].name;
    document.getElementById('g-name').style.color = "#f1c40f"; 
    document.getElementById('s-name').innerText = "?";
    document.getElementById('s-name').style.color = "#e0e0e0";

    players.forEach(p => p.conn.send({ type: 'CLEAN_UI' }));
    players.forEach((p, index) => {
        if(index !== curG) p.conn.send({ type: 'WAIT_SENTINELLE', gardienName: players[curG].name });
    });

    let eligiblePlayers = players.map(p => p.name).filter(name => {
        if (name === players[curG].name) return false;
        if (name === state.lastSentinelle) return false;
        if (players.length > 5 && name === state.lastGardien) return false;
        return true;
    });
    
    players[curG].conn.send({ type: 'YOUR_TURN', eligible: eligiblePlayers });
    syncTerminals(); render();
}

// Résolution du scrutin
function resolveVote() {
    votes.list.forEach(v => {
        const tags = document.querySelectorAll(`[id="tag-${v.name.toLowerCase()}"]`);
        tags.forEach(t => t.classList.add(v.choice === 'OUI' ? 'voted-oui' : 'voted-non'));
    });

    addLog(`RÉSULTAT DU SCRUTIN : ${votes.oui} OUI vs ${votes.non} NON`);
    
    if(votes.oui > votes.non) {
        document.getElementById('vote-summary').innerText = "VOTE ACCEPTÉ";
        document.getElementById('vote-summary').style.color = "#2ecc71";
        addLog("VOTE ACCEPTÉ : Le conseil entre en session législative.");
        
        // 1. On prépare l'état AVANT d'envoyer quoi que ce soit
        currentPhase = "LÉGISLATION_G";
        currentLegislativeCards = [deck.pop(), deck.pop(), deck.pop()];
        state.oxy = 3;

        // 2. On prévient tout le monde
        players.forEach(p => p.conn.send({ type: 'WAIT_LEGISLATION', step: 'GARDIEN' }));

        // 3. Cas critique : On vérifie l'Alpha
        if(state.crise >= 3 && players[curSIdx].role === 'A') {
            return triggerWin("INFECTES", "L'Alpha a été élu Sentinelle.");
        }

        // 4. On envoie les cartes au Gardien avec un tout petit délai 
        // pour être sûr que son téléphone a fini de traiter le message "WAIT_LEGISLATION"
        setTimeout(() => {
            players[curG].conn.send({ type: 'GARDIEN_PICK', cards: currentLegislativeCards });
        }, 100);
    } else {
        state.oxy--;  // Diminution de l'oxygène
        
        document.getElementById('vote-summary').innerText = "VOTE REJETÉ";
        document.getElementById('vote-summary').style.color = "#e74c3c";
        addLog(`ALERTE : Rejet du conseil. Oxygène à ${state.oxy}/3.`);
        
        clearGardienVisuals(); // On enlève l'étoile du gardien déchu

        if(state.oxy <= 0) {
            addLog("⚠️ ALERTE : RÉSERVES D'OXYGÈNE ÉPUISÉES !");
            addLog("PROTOCOLE DE SÉCURITÉ : Application forcée d'un décret d'urgence.");
            // On appelle applyForced qui va piocher ET logger le résultat
            applyForced();
        }
        else { 
            curG = (curG + 1) % players.length; 
            setTimeout(nextTurn, 1500); 
        }
    }
    syncTerminals(); render();
}

// Application d'un décret (Bleu, Rouge ou Gris)
function applyDecret(type) {
    clearGardienVisuals();
    if(type === 'S') state.survie++;
    else if(type === 'C') state.crise++;
    else if(type === 'F') state.suffrage = "Actif";

    render(); syncTerminals();

    if(state.survie >= 5) triggerWin("SURVIVANTS", "Protocoles rétablis.");
    else if(state.crise >= 6) triggerWin("INFECTES", "Infection totale.");
    else {
        // Sauvegarde pour les restrictions du prochain tour
        state.lastSentinelle = players[curSIdx].name;
        state.lastGardien = players[curG].name;
        curG = (curG + 1) % players.length;
        setTimeout(() => { isProcessingAction = false; nextTurn(); }, 1000);
    }
}

// Décret forcé (Oxygène à 0)
function applyForced() {
    // On pioche la carte d'urgence
    let card = deck.pop(); 
    while(card === 'F') card = deck.pop(); 
    
    // On logue précisément ce qui a été déployé
    const typeLabel = card === 'S' ? "SURVIE" : "CRISE";
    addLog(`URGENCE : Le système a déployé un décret de type ${typeLabel}.`);
    
    // On applique et on reset l'oxygène
    applyDecret(card); 
    state.oxy = 3; 
}

// Restoration de l'écran du joueur en cas de reconnexion
function restorePlayerAction(player) {
    const isGardien = (players[curG] === player);
    const isSentinelle = (curSIdx !== -1 && players[curSIdx] === player);

    switch(currentPhase) {
        case "VOTE":
            // On vérifie si ce joueur précis a déjà voté
            const aDejaVote = votes.list.some(v => v.name.toLowerCase() === player.name.toLowerCase());
            if (aDejaVote) {
                player.conn.send({ type: 'CLEAN_UI' }); // On lui affiche "En attente..."
            } else {
                // On renvoie l'écran de vote correct
                player.conn.send({ 
                    type: 'VOTE_START', 
                    g: players[curG].name, 
                    s: currentProposedS 
                });
            }
            break;
        
        case "LÉGISLATION_G":
            if (isGardien) {
                player.conn.send({ type: 'GARDIEN_PICK', cards: currentLegislativeCards });
            } else {
                player.conn.send({ type: 'WAIT_LEGISLATION', step: 'GARDIEN' });
            }
            break;

        case "LÉGISLATION_S":
            if (isSentinelle) {
                player.conn.send({ type: 'SENTINELLE_PICK', cards: currentLegislativeCards });
            } else {
                player.conn.send({ type: 'WAIT_LEGISLATION', step: 'SENTINELLE' });
            }
            break;
        
default: // DÉSIGNATION
            if (isGardien) {
                let eligible = players.map(p => p.name).filter(name => {
                    if (name === players[curG].name) return false;
                    if (name === state.lastSentinelle) return false;
                    if (players.length > 5 && name === state.lastGardien) return false;
                    return true;
                });
                player.conn.send({ type: 'YOUR_TURN', eligible: eligible });
            } else {
                player.conn.send({ type: 'WAIT_SENTINELLE', gardienName: players[curG].name });
            }
    }
}
