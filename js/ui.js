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
    
    document.getElementById('vote-summary').innerText = "SCRUTIN EN COURS : Approuvez-vous ce conseil ?";
    document.getElementById('vote-summary').style.color = "#f1c40f"; 
    
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
