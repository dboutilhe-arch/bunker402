// Lancement de la partie
function initGame() {
    deck = [...Array(10).fill('S'), ...Array(15).fill('C'), ...Array(4).fill('F')].sort(() => Math.random() - 0.5);
    const roles = (players.length >= 7 ? ['S','S','S','S','I','I','A'] : ['S','S','S','I','A']).sort(() => Math.random() - 0.5);
    const metiers = ['Shérif', 'Docteur', 'Technicien', 'Journaliste', 'Militaire', 'Psychologue', 'Contrebandier', 'Fossoyeur', 'Éclaireur', 'Vigile'].sort(() => Math.random() - 0.5);

    players.forEach((p, i) => {
        p.role = roles[i] || 'S';
        p.metier = metiers[i];
        p.conn.send({ type: 'INIT', role: p.role, metier: p.metier, all: players.map(pl => pl.name) });
    });

    updateTagsWithJobs();
    document.getElementById('setup-zone').style.display = 'none';
    document.getElementById('game-zone').style.display = 'block';
    nextTurn();
}

// Gestion du changement de tour
function nextTurn() {
    resetTagColors(); 

    const tags = document.querySelectorAll(`[id="tag-${players[curG].name.toLowerCase()}"]`);
    tags.forEach(tag => {
        const nameDiv = tag.querySelector('.p-name');
        if (nameDiv) nameDiv.innerHTML = `⭐ ${players[curG].name.toUpperCase()}`;
        tag.style.borderColor = "#f1c40f"; 
        tag.style.borderWidth = "2px";
    });
    
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
        if (name === lastSentinelle) return false;
        if (players.length > 5 && name === lastGardien) return false;
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

    if(votes.oui > votes.non) {
        document.getElementById('vote-summary').innerText = "VOTE ACCEPTÉ";
        document.getElementById('vote-summary').style.color = "#2ecc71";
        players.forEach(p => p.conn.send({ type: 'WAIT_LEGISLATION', step: 'GARDIEN' }));
        
        if(state.crise >= 3 && players[curSIdx].role === 'A') return triggerWin("INFECTES", "L'Alpha a été élu Sentinelle.");
        
        state.oxy = 3;
        players[curG].conn.send({ type: 'GARDIEN_PICK', cards: [deck.pop(), deck.pop(), deck.pop()] });
    } else {
        document.getElementById('vote-summary').innerText = "VOTE REJETÉ";
        document.getElementById('vote-summary').style.color = "#e74c3c";
        resetTagColors();
        state.oxy--;
        if(state.oxy <= 0) applyForced();
        else { 
            curG = (curG + 1) % players.length; 
            setTimeout(nextTurn, 1500); 
        }
    }
    syncTerminals(); render();
}

// Application d'un décret (Bleu, Rouge ou Gris)
function applyDecret(type) {
    if(type === 'S') state.survie++;
    else if(type === 'C') state.crise++;
    else if(type === 'F') state.suffrage = "Actif";

    render(); syncTerminals(); resetTagColors();

    if(state.survie >= 5) triggerWin("SURVIVANTS", "Protocoles rétablis.");
    else if(state.crise >= 6) triggerWin("INFECTES", "Infection totale.");
    else {
        lastSentinelle = players[curSIdx].name;
        lastGardien = players[curG].name;
        curG = (curG + 1) % players.length;
        setTimeout(() => { isProcessingAction = false; nextTurn(); }, 1000);
    }
}

// Loi forcée (Oxygène à 0)
function applyForced() {
    let card = deck.pop(); while(card === 'F') card = deck.pop();
    applyDecret(card); state.oxy = 3;
}
