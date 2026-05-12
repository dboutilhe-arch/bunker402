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
    currentPhase = "VOTE"; // Mise à jour phase
    currentProposedS = s;  // On retient qui est proposé
    const sTags = document.querySelectorAll(`[id="tag-${s.toLowerCase()}"]`);
    sTags.forEach(tag => { 
        tag.style.borderColor = "#3498db"; 
        tag.style.borderWidth = "2px"; 
    });
    
    document.getElementById('gov-display').style.display = 'block';
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
    document.getElementById('end-screen').style.display = "flex";
    document.getElementById('victory-title').innerText = "VICTOIRE : " + team;
    document.getElementById('victory-reason').innerText = reason;
    players.forEach(p => p.conn.send({ type: 'END_GAME', team: team, reason: reason }));
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
