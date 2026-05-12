// Création du serveur
function startServer() {
    const customId = document.getElementById('custom-id').value.trim();
    if (!customId) return alert("Veuillez saisir un code !");
    
    peer = new Peer(customId, { config: {'iceServers': [{ url: 'stun:stun.l.google.com:19302' }]} });
    
    peer.on('open', id => {
        document.getElementById('server-creation').style.display = 'none';
        document.getElementById('lobby-active').style.display = 'block';
        document.getElementById('display-id').innerText = "CODE CONSOLE : " + id;
    });
    
    peer.on('error', err => {
        if (err.type === 'unavailable-id') alert("Ce code est déjà utilisé.");
        else location.reload();
    });
    
    peer.on('connection', setupConnection);
}

// Configuration d'une nouvelle connexion joueur
function setupConnection(conn) {
    conn.on('open', () => {
        conn.on('data', data => {
            if (state.gameOver) return;
    
            // Arrivée d'un joueur
            if (data.type === 'JOIN') {
                let p = players.find(pl => pl.name.toLowerCase() === data.name.toLowerCase());
            
                if (p) {
                    // CAS RECONNEXION : On ne touche pas au HTML (l'étiquette existe déjà)
                    p.conn = conn; 
                    p.conn.send({ type: 'CONNECTED' });
                    
                    if (document.getElementById('game-zone').style.display === 'block') {
                        p.conn.send({ 
                            type: 'INIT', role: p.role, metier: p.metier, 
                            all: players.map(pl => pl.name),
                            alphaName: (p.role === 'I' || p.role === 'A') ? players.find(a => a.role === 'A').name : null
                        });
                        syncTerminals();
                        restorePlayerAction(p);
                    }
                    return; 
                }
            
                // CAS NOUVEAU JOUEUR
                if (players.length >= 10) return conn.send({ type: 'ERROR_BUNKER_FULL' });
            
                players.push({ name: data.name, conn: conn });
                
                // On crée l'étiquette
                const nameTag = document.createElement('div');
                nameTag.className = 'player-tag'; 
                nameTag.id = `tag-${data.name.toLowerCase()}`;
                nameTag.innerHTML = `<div class="p-name">${data.name.toUpperCase()}</div><div class="p-job" style="font-size: 0.6em; opacity: 0.8; font-weight: normal;"></div>`;
                
                // ON CLONE l'élément pour l'avoir dans les deux listes sans bug de déplacement
                const nameTagClone = nameTag.cloneNode(true);
            
                document.getElementById('player-list').appendChild(nameTag);
                document.getElementById('active-player-list').appendChild(nameTagClone);
                
                document.getElementById('count').innerText = players.length;
                if(players.length >= 5) document.getElementById('start-btn').disabled = false;
                conn.send({ type: 'CONNECTED' });
            }
    
            // Gardien choisit sa Sentinelle
            if (data.type === 'SENTINELLE_CHOISIE') {
                resetTagColors();
                const gTags = document.querySelectorAll(`[id="tag-${players[curG].name.toLowerCase()}"]`);
                gTags.forEach(tag => {
                    tag.querySelector('.p-name').innerHTML = `⭐ ${players[curG].name.toUpperCase()}`;
                    tag.style.borderColor = "#f1c40f"; tag.style.borderWidth = "2px";
                });
                curSIdx = players.findIndex(p => p.name === data.sentinelleName);
                showGov(data.gardienName, data.sentinelleName);
            }
    
            // Réception d'un vote
            if (data.type === 'VOTE_DONE') {
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
                addLog(`Données de vote reçues de : ${data.playerName}`);
            
                // Si tout le monde a voté, on résout
                if(votes.total === players.length)  {
                    addLog("Scrutin terminé. Calcul des résultats...");
                    resolveVote();
                }
            }
    
            // Gardien défausse
            if (data.type === 'DISCARD_DONE') {
                currentPhase = "LÉGISLATION_S"; // On change la phase
                currentLegislativeCards = data.remaining; // On stocke les 2 cartes restantes
                
                document.getElementById('vote-summary').innerText = "DÉCRET REÇU : La Sentinelle choisit le décret final";
                
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
    
            // Choix final de la Sentinelle
            if (data.type === 'FINAL_CHOICE' && !isProcessingAction) {
                isProcessingAction = true;
                applyDecret(data.card);
            }
        });
        // GESTION DE LA DÉCONNEXION
        conn.on('close', () => {
            handlePlayerDisconnect(conn);
        });
    });
}

function handlePlayerDisconnect(closedConn) {
    const index = players.findIndex(p => p.conn === closedConn);
    if (index === -1) return;

    const player = players[index];

    // 1. Si on est encore dans le lobby (avant INITIALISER)
    if (document.getElementById('game-zone').style.display === 'none') {
        addLog(`SORTIE LOBBY : ${player.name} a quitté la session.`);
        players.splice(index, 1);
        
        const tags = document.querySelectorAll(`[id="tag-${player.name.toLowerCase()}"]`);
        tags.forEach(tag => tag.remove());
        
        document.getElementById('count').innerText = players.length;
        if(players.length < 5) document.getElementById('start-btn').disabled = true;
    } 
    // 2. Si la partie est déjà lancée
    else {
        addLog(`SIGNAL PERDU : ${player.name} s'est déconnecté.`);
        
        // Optionnel : On peut griser son étiquette sur le PC pour montrer qu'il est déco
        const tags = document.querySelectorAll(`[id="tag-${player.name.toLowerCase()}"]`);
        tags.forEach(tag => tag.style.opacity = "0.5");
    }
}

// Synchronisation des barres d'oxygène des joueurs
function syncTerminals() {
    players.forEach(p => p.conn.send({ type: 'SYNC_STATE', state: state }));
}
