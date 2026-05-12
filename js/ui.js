// ui.js

function globalReset() {
    if (!confirm("Réinitialiser la partie et renvoyer tout le monde au lobby ?")) return;
    
    // On prévient tous les joueurs
    players.forEach(p => {
        p.conn.send({ type: 'RESET_TO_LOBBY' });
    });

    // On remet l'état local à zéro
    resetGameState();
}

function resetGameState() {
    // 1. Reset des variables de state.js
    state = { 
        survie: 0, 
        crise: 0, 
        oxy: 3,  
        gameOver: false, 
        suffrage: "Aucun",
        lastSentinelle: null,
        lastGardien: null
    };
    curG = 0;
    curSIdx = -1;
    votes = { oui: 0, non: 0, total: 0, list: [] };
    isProcessingAction = false;
    currentPhase = "DÉSIGNATION";
    currentProposedS = null;
    currentLegislativeCards = [];

    // 2. Reset visuel de l'index
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('game-zone').style.display = 'none';
    document.getElementById('game-info-row').style.display = 'none';
    document.getElementById('setup-zone').style.display = 'block';
    document.getElementById('lobby-active').style.display = 'block';
    
    // On vide les logs et les plateaux
    document.getElementById('log').innerHTML = "<div>[SYSTÈME] : Redémarrage d'urgence effectué.</div>";
    document.getElementById('last-council-display').innerText = "Aucun";
    
    // 3. On réactive le bouton start si on a assez de monde
    document.getElementById('start-btn').disabled = (players.length < 5);
    
    // On remet les étiquettes en mode "Lobby" (sans métiers)
    resetLobbyVisuals();
}

function resetLobbyVisuals() {
    players.forEach(p => {
        const tags = document.querySelectorAll(`[id="tag-${p.name.toLowerCase()}"]`);
        tags.forEach(tag => {
            tag.className = 'player-tag';
            tag.style.opacity = "1";
            tag.innerHTML = `
                <div class="p-name">${p.name.toUpperCase()}</div>
                <div class="p-job" style="font-size: 0.6em; opacity: 0.8; font-weight: normal; color: #2ecc71;"></div>
            `;
        });
    });
}

// Mise à jour visuelle des étiquettes avec les métiers
function updateTagsWithJobs() {
    players.forEach(p => {
        const tags = document.querySelectorAll(`[id="tag-${p.name.toLowerCase()}"]`);
        tags.forEach(tag => {
            tag.innerHTML = `
                <div class="p-name">${p.name.toUpperCase()}</div>
                <div class="p-job" style="font-size: 0.65em; opacity: 0.8; font-weight: normal; margin-top: 2px;">
                    ${p.metier}
                </div>
            `;
        });
    });
}

// Nettoyage complet des étiquettes (reset couleurs, bordures et étoiles)
function resetTagColors() {
    players.forEach(p => {
        const tags = document.querySelectorAll(`[id="tag-${p.name.toLowerCase()}"]`);
        tags.forEach(tag => {
            tag.className = 'player-tag'; 
            tag.style.borderColor = "";   
            tag.style.borderWidth = "1px";
            const nameDiv = tag.querySelector('.p-name');
            if (nameDiv) nameDiv.innerText = p.name.toUpperCase();
        });
    });
}

// Rendu des plateaux et de la barre d'oxygène
function render() {
    const oxyBar = document.getElementById('oxy-level');
    oxyBar.style.width = (state.oxy/3*100) + "%";
    oxyBar.className = (state.oxy <= 1) ? "critical" : "";
    
    let s = ""; for(let i=0; i<5; i++) s += `<div class="slot ${i < state.survie ? 'filled-s' : ''}"></div>`;
    document.getElementById('slots-s').innerHTML = s;
    
    let c = ""; for(let i=0; i<6; i++) c += `<div class="slot ${i < state.crise ? 'filled-c' : ''}"></div>`;
    document.getElementById('slots-c').innerHTML = c;
    
    let f = `<div class="slot ${state.suffrage !== "Aucun" ? 'filled-f' : ''}"></div>`;
    document.getElementById('slots-f').innerHTML = f;
}

// Affichage du gouvernement proposé (Couleurs : Gardien Jaune, Sentinelle Bleu)
function showGov(g, s) {
    currentPhase = "VOTE"; 
    currentProposedS = s;  
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
    
    document.getElementById('vote-summary').innerText = `SCRUTIN EN COURS : Approuvez-vous ce conseil ?\nVOTES TRANSMIS : 0 / ${players.length}`;
    document.getElementById('vote-summary').style.color = "#f1c40f";
    
    addLog(`Ouverture du scrutin : Gouvernement proposé ${g} & ${s}`);
    
    players.forEach(p => p.conn.send({ type: 'VOTE_START', g: g, s: s }));
}

// Écran de victoire
function triggerWin(team, reason) {
    state.gameOver = true;
    
    const revealZone = document.getElementById('role-reveal-zone');
    if (revealZone) {
        revealZone.innerHTML = ""; 

        players.forEach(p => {
            // 1. Déterminer le label et la couleur selon le rôle
            let roleLabel = "";
            let roleColor = "";

            switch (p.role) {
                case 'A':
                    roleLabel = "ALPHA";
                    roleColor = "#9400d3"; // Violet
                    break;
                case 'I':
                    roleLabel = "INFECTÉ";
                    roleColor = "#e74c3c"; // Rouge
                    break;
                case 'S':
                    roleLabel = "SURVIVANT";
                    roleColor = "#3498db"; // Bleu
                    break;
                case 'M':
                    roleLabel = "MYCOLOGUE";
                    roleColor = "#1b4d3e"; // Vert foncé
                    break;
                case 'IM':
                    roleLabel = "IMMUNISÉ";
                    roleColor = "#d4af37"; // Jaune doré
                    break;
            }

            // 2. Créer la carte
            const card = document.createElement('div');
            card.className = `reveal-card rev-${p.role}`;
            card.innerHTML = `
                <div style="font-weight:bold; color:#FFF; font-size:1.1em;">${p.name.toUpperCase()}</div>
                <div style="font-size:0.8em; color:#888; margin-bottom:5px;">${p.metier}</div>
                <div style="font-size:0.9em; color:${roleColor}; font-weight:bold;">${roleLabel}</div>
            `;
            revealZone.appendChild(card);
        });
    }

    // Affichage de l'écran global
    document.getElementById('end-screen').style.display = "flex";
    document.getElementById('victory-title').innerText = "VICTOIRE : " + team;
    document.getElementById('victory-reason').innerText = reason;
    
    addLog(`FIN DE PARTIE : Victoire des ${team}.`);

    // Envoi aux joueurs
    players.forEach(p => {
        let hasWon = false;
        if (team === "SURVIVANTS" && (p.role === 'S' || p.role === 'IM')) hasWon = true;
        if (team === "INFECTES" && (p.role === 'I' || p.role === 'A' || p.role === 'M')) hasWon = true;
    
        p.conn.send({ 
            type: 'END_GAME', 
            team: team, 
            reason: reason,
            personalResult: hasWon ? "MISSION RÉUSSIE" : "MISSION ÉCHOUÉE"
        });
    });
}

// Retire uniquement l'étoile et la bordure dorée du Gardien actuel
function clearGardienVisuals() {
    players.forEach(p => {
        const tags = document.querySelectorAll(`[id="tag-${p.name.toLowerCase()}"]`);
        tags.forEach(tag => {
            // On retire la bordure dorée
            if (tag.style.borderColor === "rgb(241, 196, 15)") { // Code RGB de #f1c40f
                tag.style.borderColor = "";
                tag.style.borderWidth = "1px";
            }
            // On retire l'étoile du nom
            const nameDiv = tag.querySelector('.p-name');
            if (nameDiv && nameDiv.innerText.includes("⭐")) {
                nameDiv.innerText = p.name.toUpperCase();
            }
        });
    });
}

// Message Console de l'index
function addLog(message) {
    const log = document.getElementById('log');
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    log.innerHTML += `<div>[${time}] > ${message}</div>`;
    log.scrollTop = log.scrollHeight; // Scroll automatique vers le bas
}
