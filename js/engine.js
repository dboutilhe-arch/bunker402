// Répartition des pouvoirs de case en fonction du nombre de joueur
const POWER_MAP = {
    // TEST
    default: { 1: 'TEST'; 2: 'TEST', 3: 'TEST', 4: 'TEST', 5: 'TEST' }

    // 5 joueurs
    //5:  { 3: null, 4: 'TEST', 5: 'EXEC' },
    // 6 à 7 joueurs
    //6:  { 3: 'TEST', 4: 'TEST', 5: 'EXEC' },
    //7:  { 3: 'TEST', 4: 'TEST', 5: 'EXEC' },
    // 8 à 10 joueurs
    //8:  { 3: 'TEST', 4: 'EXEC', 5: 'EXEC' },
    //9:  { 3: 'TEST', 4: 'EXEC', 5: 'EXEC' },
    //10: { 3: 'TEST', 4: 'EXEC', 5: 'EXEC' },
    // 11 joueurs et plus
    //default: { 2: 'CENSURE', 3: 'TEST', 4: 'EXEC', 5: 'EXEC' }
};

// Affichage Composition Partie
function displayComposition(roles) {
    const counts = roles.reduce((acc, r) => {
        acc[r] = (acc[r] || 0) + 1;
        return acc;
    }, {});

    const compDiv = document.getElementById('composition-display');
    
    // On ne compte que les rôles de base ici
    const totalS = (counts['S'] || 0);
    const totalI = (counts['I'] || 0);

    let html = `<div style="color: #FFF; font-weight: bold; margin-bottom: 5px;">${players.length} PERSONNELS :</div>`;
    // Affichage des Survivants standards
    html += `<div style="color: #3498db;">• ${totalS} SURVIVANTS</div>`;
    // Affichage des Infectés standards
    html += `<div style="color: #e74c3c;">• ${totalI} INFECTÉS</div>`;
    // Ligne Alpha (Toujours présent)
    html += `<div style="color: #9400d3;">• 1 ALPHA</div>`;
    // Affichage conditionnel du Mycologue (Infiltré)
    if (counts['M']) {
        html += `<div style="color: #1b4d3e;">• ${counts['M']} MYCOLOGUE</div>`;
    }
    // Affichage conditionnel de l'Immunisé (Résistant)
    if (counts['IM']) {
        html += `<div style="color: #d4af37;">• ${counts['IM']} IMMUNISÉ</div>`;
    }

    compDiv.innerHTML = html;
}

// Affichage dernier conseil
function updateLastCouncil() {
    if (state.lastGardien && state.lastSentinelle) {
        document.getElementById('last-council-display').innerHTML = `
            <span style="color: #f1c40f;">${state.lastGardien}</span><br>
            &<br>
            <span style="color: #3498db;">${state.lastSentinelle}</span>
        `;
    }
}

// --- LOGIQUE DE JEU ---

async function initGame() {
    // 1. Préparation du deck
    deck = [...Array(40).fill('S'), ...Array(60).fill('C'), ...Array(10).fill('F')].sort(() => Math.random() - 0.5);

    // 2. Logique de répartition des rôles
    let roles = [];
    const n = players.length;

    if (n <= 6) {
        roles = ['S', 'S', 'S', 'S', 'I', 'A']; 
    } else if (n <= 10) {
        roles = ['S', 'S', 'S', 'S', 'S', 'S', 'I', 'I', 'A', 'S']; 
    } else {
        roles = ['S', 'S', 'S', 'S', 'S', 'S', 'I', 'I', 'A', 'M', 'IM'];
        while (roles.length < n) {
            roles.push(Math.random() > 0.3 ? 'S' : 'I');
        }
    }
    roles.sort(() => Math.random() - 0.5);

    const metiers = ['Shérif', 'Docteur', 'Technicien', 'Journaliste', 'Militaire', 'Psychologue', 'Contrebandier', 'Fossoyeur', 'Éclaireur', 'Vigile', 'Scientifique', 'Ingénieur', 'Pilote'].sort(() => Math.random() - 0.5);
    const alphaPlayer = players[roles.indexOf('A')];

    // 3. Envoi progressif
    for (let i = 0; i < n; i++) {
        let p = players[i];
        p.role = roles[i];
        p.metier = metiers[i % metiers.length];

        p.conn.send({
            type: 'INIT',
            role: p.role,
            metier: p.metier,
            all: players.map(pl => pl.name),
            alphaName: (['I', 'A', 'M'].includes(p.role)) ? alphaPlayer.name : null 
        });
        await new Promise(r => setTimeout(r, 50));
    }

    // 4. Lancement visuel
    updateTagsWithJobs();
    displayComposition(roles); // Remplissage du bloc vert
    
    document.getElementById('setup-zone').style.display = 'none';
    document.getElementById('game-info-row').style.display = 'flex';
    document.getElementById('game-zone').style.display = 'block';
    nextTurn();
}

function nextTurn() {
    currentPhase = "DÉSIGNATION";
    
    const tags = document.querySelectorAll(`[id="tag-${players[curG].name.toLowerCase()}"]`);
    tags.forEach(tag => {
        const nameDiv = tag.querySelector('.p-name');
        if (nameDiv) nameDiv.innerHTML = `⭐ ${players[curG].name.toUpperCase()}`;
        tag.style.borderColor = "#f1c40f"; 
        tag.style.borderWidth = "2px";
    });

    addLog(`SYSTÈME : Désignation du nouveau Gardien : ${players[curG].name.toUpperCase()}`);
    
    votes = { oui: 0, non: 0, total: 0, list: [] };
    
    // Reset de l'affichage du conseil actuel dans le bloc jaune
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
    syncTerminals(); 
    render();
}

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
        
        currentPhase = "LÉGISLATION_G";
        currentLegislativeCards = [deck.pop(), deck.pop(), deck.pop()];
        state.oxy = 3;

        players.forEach(p => p.conn.send({ type: 'WAIT_LEGISLATION', step: 'GARDIEN' }));

        if(state.crise >= 3 && players[curSIdx].role === 'A') {
            return triggerWin("INFECTES", "L'Alpha a été élu Sentinelle.");
        }

        setTimeout(() => {
            players[curG].conn.send({ type: 'GARDIEN_PICK', cards: currentLegislativeCards });
        }, 100);
    } else {
        state.oxy--;
        
        document.getElementById('vote-summary').innerText = "VOTE REJETÉ";
        document.getElementById('vote-summary').style.color = "#e74c3c";
        addLog(`ALERTE : Rejet du conseil. Oxygène à ${state.oxy}/3.`);
        
        clearGardienVisuals();

        if(state.oxy <= 0) {
            addLog("⚠️ ALERTE : RÉSERVES D'OXYGÈNE ÉPUISÉES !");
            addLog("PROTOCOLE DE SÉCURITÉ : Application forcée d'un décret d'urgence.");
            applyForced();
        }
        else { 
            curG = (curG + 1) % players.length; 
            setTimeout(nextTurn, 1500); 
        }
    }
    syncTerminals(); 
    render();
}

function applyDecret(type) {
    clearGardienVisuals();
    state.lastSentinelle = players[curSIdx].name;
    state.lastGardien = players[curG].name;
    updateLastCouncil();

    if (type === 'S') {
        state.survie++;
    } else if (type === 'C') {
        state.crise++;
        // --- DÉCLENCHEMENT DES POUVOIRS DE CASE ---
        checkCasePower(state.crise);
    } else if (type === 'F') {
        state.suffrage = "Actif";
    }

    render();
    syncTerminals();

    if (state.survie >= 5) triggerWin("SURVIVANTS", "Protocoles rétablis.");
    else if (state.crise >= 6) triggerWin("INFECTES", "Infection totale.");
    else {
        // On ne passe au tour suivant que si aucun pouvoir n'est en cours 
        // ou après un petit délai si c'est un décret normal
        if (!currentPowerActive) {
            curG = (curG + 1) % players.length;
            setTimeout(() => { isProcessingAction = false; nextTurn(); }, 1000);
        }
    }
}

let currentPowerActive = false; // Verrou pour empêcher le tour de passer pendant un pouvoir

function checkCasePower(caseNumber) {
    const n = players.length;
    const config = POWER_MAP[n] || POWER_MAP['default'];
    const power = config[caseNumber];

    if (!power) return;

    currentPowerActive = true;
    const gardien = players.find(p => p.name === state.lastGardien);
    addLog(`SYSTÈME : Case de Crise ${caseNumber} atteinte. Activation du protocole : ${power}.`);

    switch (power) {
        case 'TEST':
            // On force l'ouverture du sélecteur chez le Gardien
            gardien.conn.send({ 
                type: 'FORCE_POWER_SELECT', 
                action: 'REQUEST_BLOOD_TEST', 
                title: 'ANALYSE BIOLOGIQUE (DÉCRET)' 
            });
            break;
        case 'EXEC':
            // À implémenter : openTargetSelector('REQUEST_EXECUTION', 'PROTOCOLE D\'ÉLIMINATION')
            break;
        case 'CENSURE':
            // On force l'ouverture du sélecteur chez le Gardien
            gardien.conn.send({ 
                    type: 'FORCE_POWER_SELECT', 
                    action: 'REQUEST_CENSURE', 
                    title: 'PROTOCOLE DE CENSURE' 
                });
            break;
    }
}

function applyForced() {
    let card = deck.pop(); 
    while(card === 'F') card = deck.pop(); 
    
    const typeLabel = card === 'S' ? "SURVIE" : "CRISE";
    addLog(`URGENCE : Le système a déployé un décret de type ${typeLabel}.`);
    
    applyDecret(card); 
    state.oxy = 3; 
}

function restorePlayerAction(player) {
    const isGardien = (players[curG] === player);
    const isSentinelle = (curSIdx !== -1 && players[curSIdx] === player);

    switch(currentPhase) {
        case "VOTE":
            const aDejaVote = votes.list.some(v => v.name.toLowerCase() === player.name.toLowerCase());
            if (aDejaVote) {
                player.conn.send({ type: 'CLEAN_UI' });
            } else {
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
        
        default:
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
