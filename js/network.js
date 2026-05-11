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

                // CAS 1 : LE JOUEUR EXISTE DÉJÀ (Tentative de reconnexion)
                if (p) {
                    console.log(`Tentative de reconnexion de ${p.name}`);
                    
                    // On remplace l'ancienne connexion par la nouvelle
                    p.conn = conn; 
                    p.conn.send({ type: 'CONNECTED' });

                    if (document.getElementById('game-zone').style.display === 'block') {
                        p.conn.send({ 
                            type: 'INIT', 
                            role: p.role, 
                            metier: p.metier, 
                            all: players.map(pl => pl.name),
                            alphaName: (p.role === 'I' || p.role === 'A') ? players.find(a => a.role === 'A').name : null
                        });
                        syncTerminals();
                        restorePlayerAction(p);
                    }
                    return; // On s'arrête ici pour une reconnexion
                }

                // CAS 2 : NOUVEAU JOUEUR
                // On vérifie la capacité max
                if (players.length >= 10) {
                    return conn.send({ type: 'ERROR_BUNKER_FULL' });
                }

                // Tout est bon, on ajoute le joueur
                players.push({ name: data.name, conn: conn });
                
                const createTag = () => {
                    const nameTag = document.createElement('div');
                    nameTag.className = 'player-tag'; 
                    nameTag.id = `tag-${data.name.toLowerCase()}`;
                    nameTag.innerHTML = `<div class="p-name">${data.name.toUpperCase()}</div><div class="p-job" style="font-size: 0.6em; opacity: 0.8; font-weight: normal;"></div>`;
                    return nameTag;
                };
                
                document.getElementById('player-list').appendChild(createTag());
                document.getElementById('active-player-list').appendChild(createTag());
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
                votes[data.choice.toLowerCase()]++; votes.total++;
                votes.list.push({ name: data.playerName, choice: data.choice });
                if(votes.total === players.length) resolveVote();
            }
    
            // Gardien défausse
            if (data.type === 'DISCARD_DONE') {
                currentPhase = "LÉGISLATION_S"; // On change la phase
                currentLegislativeCards = data.remaining; // On stocke les 2 cartes restantes
                
                document.getElementById('vote-summary').innerText = "DÉCRET REÇU : La Sentinelle choisit le décret final";
                players.forEach(p => p.conn.send({ type: 'WAIT_LEGISLATION', step: 'SENTINELLE' }));
                players[curSIdx].conn.send({ type: 'SENTINELLE_PICK', cards: currentLegislativeCards });
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
    // 1. On trouve le joueur qui s'est déconnecté
    const index = players.findIndex(p => p.conn === closedConn);
    if (index === -1) return;

    const player = players[index];
    console.log(`Déconnexion détectée : ${player.name}`);

    // 2. Si la partie n'a pas commencé, on libère le slot
    if (document.getElementById('game-zone').style.display === 'none') {
        players.splice(index, 1); // On le retire du tableau
        
        // On met à jour le lobby visuellement
        const tag = document.getElementById(`tag-${player.name.toLowerCase()}`);
        if (tag) tag.remove();
        
        document.getElementById('count').innerText = players.length;
        if(players.length < 5) document.getElementById('start-btn').disabled = true;
    } else {
        // Si la partie est en cours, on pourrait marquer le joueur comme "DÉCONNECTÉ" 
        // ou simplement logger l'erreur pour l'instant.
        console.warn("Joueur déconnecté en pleine partie.");
    }
}

// Synchronisation des barres d'oxygène des joueurs
function syncTerminals() {
    players.forEach(p => p.conn.send({ type: 'SYNC_STATE', state: state }));
}
