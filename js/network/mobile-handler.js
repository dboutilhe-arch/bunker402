// js/network/mobile-handler.js
 
const peer = new Peer({ config: {'iceServers': [{ url: 'stun:stun.l.google.com:19302' }]} });
let conn, myName, currentHand = [], allPlayers = [];
let hasUsedPower = false;
let serverState = {};

// --- INITIALISATION AU CHARGEMENT ---

document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connect-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', () => connect());
    }

    // Reconnexion automatique
    if (sessionStorage.getItem('bunker_name')) {
        connect(true);
    }
});

// --- CONNEXION ET RÉSEAU ---

function connect(isReconnect = false) {
    let nameInput = isReconnect ? sessionStorage.getItem('bunker_name') : document.getElementById('p-name').value.trim();
    let codeInput = isReconnect ? sessionStorage.getItem('bunker_code') : document.getElementById('r-code').value.trim();

    if (!nameInput || nameInput.length < 2 || !codeInput) return;

    myName = nameInput;
    conn = peer.connect(codeInput);

    conn.on('open', () => {
        sessionStorage.setItem('bunker_name', myName);
        sessionStorage.setItem('bunker_code', codeInput);
        
        conn.send({ type: 'JOIN', name: myName, reconnect: isReconnect });
        
        document.getElementById('setup').classList.add('hidden');
        document.getElementById('game').classList.remove('hidden');
        document.getElementById('display-name').innerText = myName.toUpperCase();
    });

    conn.on('data', handleData);
}

// --- GESTIONNAIRE DE MESSAGES (DATA HANDLER) ---

function handleData(data) {
    const ui = document.getElementById('main-ui');

    // Sécurité affichage
    if (data.type === 'CONNECTED' || data.type === 'INIT') {
        document.getElementById('setup').classList.add('hidden');
        document.getElementById('game').classList.remove('hidden');
    }

    switch (data.type) {
        case 'INIT':
            allPlayers = data.all;
            hasUsedPower = data.powerUsed || false;
            setupIdentity(data);
            break;

        case 'SYNC_STATE':
            serverState = data.state;
            updateMiniBoard(data.state);
            // On vérifie si NOUS sommes morts dans l'état reçu
            const me = data.state.votes.list ? null : null; // Juste pour la structure
            // On cherche notre propre état dans la liste des joueurs (non présente dans state, on utilise une autre logique)
            // Mais plus simple : si l'interface affiche déjà "MORT", on ne traite pas la synchro de boutons
            if (document.getElementById('main-ui').innerText.includes("VOUS ÊTES MORT")) return;
      
            // Si on reçoit une synchro et qu'on n'est pas en train de choisir un pouvoir forcé
            // on redonne l'état normal au bouton de métier
            const btn = document.getElementById('btn-power');
            if (btn) {
                // Le bouton n'est utilisable que si :
                // 1. Le joueur ne l'a pas déjà utilisé (hasUsedPower)
                // 2. Le serveur ne dit pas qu'un pouvoir de case est actif (currentPowerActive)
                if (!hasUsedPower && !data.state.currentPowerActive) {
                    btn.disabled = false;
                    btn.style.opacity = "1";
                    btn.style.pointerEvents = "auto";
                }
            }
            break;

        case 'YOUR_TURN':
            showGardienUI(data.eligible);
            break;

        case 'VOTE_START':
            showVoteUI(data);
            break;

        case 'WAIT_SENTINELLE':
            ui.innerHTML = `
                <div style="margin-top: 40px;">
                    <h2 style="color: #f1c40f; text-transform: uppercase;">FORMATION DU CONSEIL</h2>
                    <p style="color: #e0e0e0;">Le Gardien <b>${data.gardienName}</b> choisit sa Sentinelle...</p>
                    <div class="loader" style="margin: 30px auto; border: 4px solid #111; border-top: 4px solid #2ecc71; border-radius: 50%; width: 35px; height: 35px; animation: spin 1s linear infinite;"></div>
                    <p style="font-size: 0.8em; color: #666; letter-spacing: 1px;">[ANALYSE DES ACCÈS RÉSEAU EN COURS]</p>
                </div>
            `;
            break;

        case 'WAIT_LEGISLATION':
            ui.innerHTML = `
                <div style="margin-top: 40px;">
                    <h2 style="color: #3498db; text-transform: uppercase;">SESSION LÉGISLATIVE</h2>
                    <p style="color: #e0e0e0;">Le Conseil applique les protocoles secrets (Aiguillage : <b>${data.step}</b>)...</p>
                    <div class="loader" style="margin: 30px auto; border: 4px solid #111; border-top: 4px solid #3498db; border-radius: 50%; width: 35px; height: 35px; animation: spin 1.5s linear infinite;"></div>
                    <p style="font-size: 0.8em; color: #666; letter-spacing: 1px;">[CHIFFREMENT DES DÉCRETS DE SÉCURITÉ]</p>
                </div>
            `;
            break;

        case 'GARDIEN_PICK':
            showLegislativeUI("GARDIEN", data.cards);
            break;

        case 'SENTINELLE_PICK':
            showLegislativeUI("SENTINELLE", data.cards);
            break;

        case 'BLOOD_TEST_RESULT':
            showBloodResult(data);
            break;
      
      case 'YOU_ARE_DEAD':
            const uiDead = document.getElementById('main-ui');
            const colReveal = data.reveal === "INFECTÉ" ? "#e74c3c" : "#2ecc71";
            uiDead.innerHTML = `
                <h1 style="color: #e74c3c;">VOUS ÊTES MORT</h1>
                <p>Analyse post-mortem : <b style="color: ${colReveal}">${data.reveal}</b></p>
                <p style="opacity: 0.6;">Vous ne pouvez plus voter ni participer.</p>
            `;
            document.getElementById('job-ui').innerHTML = "";
            break;
      
      case 'CENSORED_ALERT':
            ui.innerHTML = `
                <div style="border: 2px solid #e74c3c; padding: 20px; border-radius: 10px; background: rgba(231, 76, 60, 0.1);">
                    <h2 style="color: #e74c3c;">🤐 CENSURE ACTIVÉE</h2>
                    <p>Le joueur <b>${data.by}</b> a suspendu vos droits de vote pour ce scrutin.</p>
                    <p style="font-size: 0.8em; opacity: 0.6; margin-top: 20px;">Attendez la fin du tour...</p>
                </div>
            `;
            break;

        case 'FORCE_POWER_SELECT':
            // 1. On grise le bouton de métier pour éviter le conflit
            const jobBtn = document.getElementById('btn-power');
            if (jobBtn) {
                jobBtn.disabled = true;
                jobBtn.style.opacity = "0.3";
                jobBtn.style.pointerEvents = "none";
            }
            // 2. On ouvre le sélecteur forcé
            openTargetSelector(data.action, data.title, true);
            // 3. Petit effet visuel d'alerte
            document.body.style.backgroundColor = "#1a0000";
            setTimeout(() => { document.body.style.backgroundColor = "#000"; }, 500);
            break;

        case 'CLEAN_UI':
            ui.innerHTML = `
                <div style="margin-top: 40px;">
                    <h2 style="color: #2ecc71; text-transform: uppercase;">TRANSMISSION REÇUE</h2>
                    <p style="color: #e0e0e0;">Votre vote a été enregistré par la console centrale.</p>
                    <div class="loader" style="margin: 30px auto; border: 4px solid #111; border-top: 4px solid #2ecc71; border-radius: 50%; width: 35px; height: 35px; animation: spin 2s linear infinite;"></div>
                    <p style="font-size: 0.8em; color: #666; letter-spacing: 1px;">[SYNCHRONISATION TERMINAL EN ATTENTE DU SCRUTIN]</p>
                </div>
            `;
            break;
      
        case 'REFRESH_INTERFACE':
            // Demande au serveur de renvoyer l'action en cours (restorePlayerAction)
            // Cela va reconstruire la liste des cibles (sans le mort) ou l'interface de vote
            conn.send({ type: 'SYNC_REQUEST' }); 
            break;

        case 'END_GAME':
            showEndGame(data);
            break;

        case 'RESET_TO_LOBBY':
            resetAffichageJ();
            break;
    }
}

// --- LOGIQUE D'INTERFACE (UI) ---

function setupIdentity(data) {
    const rDisplay = document.getElementById('role-display');
    const mDisplay = document.getElementById('metier-display');
    const jobUi = document.getElementById('job-ui');
    const memo = document.getElementById('memo-box');

    memo.style.display = "block";
    mDisplay.innerText = "MÉTIER : " + data.metier;

    const roles = {
        'S':  { label: "SURVIVANT", color: "#3498db", goal: "Rétablir les protocoles de survie.", win: "5 décrets BLEUS ou éliminer l'Alpha.", blood: "SAIN", bColor: "#2ecc71" },
        'I':  { label: "INFECTÉ", color: "#e74c3c", goal: "Propager l'infection.", win: "6 décrets ROUGES ou Alpha élu Sentinelle avec 3 décrets ROUGES.", blood: "INFECTÉ", bColor: "#e74c3c" },
        'A':  { label: "ALPHA", color: "#9400d3", goal: "Propager l'infection.", win: "6 décrets ROUGES ou être élu Sentinelle avec 3 décrets ROUGES.", blood: "INFECTÉ", bColor: "#e74c3c" },
        'M':  { label: "MYCOLOGUE", color: "#1b4d3e", goal: "Propager l'infection (Infiltré).", win: "6 décrets ROUGES ou Alpha élu Sentinelle avec 3 décrets ROUGES.", blood: "SAIN", bColor: "#2ecc71" },
        'IM': { label: "IMMUNISÉ", color: "#d4af37", goal: "Rétablir les protocoles (Résistant).", win: "5 décrets BLEUS ou éliminer l'Alpha.", blood: "INFECTÉ", bColor: "#e74c3c" }
    };

    const config = roles[data.role];
    rDisplay.innerText = "RÔLE : " + config.label;
    rDisplay.style.color = config.color;
    rDisplay.parentElement.style.borderColor = config.color;
    
    document.getElementById('team-goal').innerText = "🎯 OBJECTIF : " + config.goal;
    document.getElementById('win-cond').innerText = "Conditions : " + config.win;
    document.getElementById('blood-status').innerHTML = `🩸 SANG : <span style="color: ${config.bColor}">${config.blood}</span>`;

    if (data.alphaName && (data.role === 'I' || data.role === 'M')) {
        document.getElementById('alpha-info').innerHTML = `☣️ ALPHA : <span style="color: #9400d3;">${data.alphaName.toUpperCase()}</span>`;
    }

    // Bouton de métier
    jobUi.innerHTML = "";
    jobUi.style.opacity = "1"; //On s'assure que c'est visible par défaut
 
    if (data.metier === 'Docteur') {
        const btn = document.createElement('button');
        btn.id = "btn-power";
        btn.className = "btn-power";
        btn.innerText = "TEST SANGUIN";
        if (hasUsedPower) jobUi.style.opacity = "0.3";
        btn.onclick = () => openTargetSelector('REQUEST_BLOOD_TEST', 'ANALYSE BIOLOGIQUE');
        jobUi.appendChild(btn);
    }
    if (data.metier === 'Militaire') {
       const btn = document.createElement('button');
       btn.id = "btn-power";
       btn.className = "btn-power";
       btn.innerText = "EXÉCUTER UN INDIVIDU";
       if (hasUsedPower) jobUi.style.opacity = "0.3";
       btn.onclick = () => openTargetSelector('REQUEST_EXECUTION', 'PROTOCOLE D\'ÉLIMINATION');
       jobUi.appendChild(btn);
   }
   if (data.metier === 'Intendant') {
          const btn = document.createElement('button');
          btn.id = "btn-power";
          btn.className = "btn-power";
          btn.innerText = "VERROUILLER UN TERMINAL (CENSURE)";
          if (hasUsedPower) jobUi.style.opacity = "0.3";
          btn.onclick = () => openTargetSelector('REQUEST_CENSURE', 'PROTOCOLE DE CENSURE');
          jobUi.appendChild(btn);
      }
}


function updateMiniBoard(state) {
    document.getElementById('oxy-mini').style.width = (state.oxy / 3 * 100) + "%";
    document.getElementById('oxy-mini').style.background = state.oxy <= 1 ? "#e74c3c" : "#3498db";
    document.getElementById('oxy-text-mini').innerText = `NIVEAU D'OXYGENE: ${state.oxy}/3`;
    
    document.getElementById('m-s').innerHTML = Array(5).fill(0).map((_, i) => `<div class="dot ${i < state.survie ? 'f-s' : ''}"></div>`).join('');
    document.getElementById('m-c').innerHTML = Array(6).fill(0).map((_, i) => `<div class="dot ${i < state.crise ? 'f-c' : ''}"></div>`).join('');
}

function showGardienUI(eligible) {
    const ui = document.getElementById('main-ui');
    ui.innerHTML = "<h3>TOUR DU GARDIEN</h3><p>Désignez votre Sentinelle :</p>";
    eligible.forEach(name => {
        const btn = document.createElement('button');
        btn.className = "btn";
        btn.innerText = name;
        btn.onclick = () => conn.send({ type: 'SENTINELLE_CHOISIE', gardienName: myName, sentinelleName: name });
        ui.appendChild(btn);
    });
}

function showVoteUI(data) {
    const ui = document.getElementById('main-ui');
    ui.innerHTML = `<h3>VOTE CONSEIL</h3>`;
    if (myName === data.g) ui.innerHTML += `<p style="background: #f1c40f; color: black; padding: 5px;">⚠️ VOUS ÊTES LE GARDIEN</p>`;
    else if (myName === data.s) ui.innerHTML += `<p style="background: #3498db; color: white; padding: 5px;">⚠️ VOUS ÊTES LA SENTINELLE</p>`;

    ui.innerHTML += `<p>Approuvez-vous ce Conseil ?<br><b>${data.g} & ${data.s}</b></p>`;
    
    const btnOui = document.createElement('button');
    btnOui.className = "btn"; 
    btnOui.style.background = "#2ecc71"; 
    btnOui.style.color = "#000";      
    btnOui.style.borderColor = "#000"; 
    btnOui.innerText = "ACCEPTER";
    btnOui.onclick = () => sendVote('OUI');
    
    const btnNon = document.createElement('button');
    btnNon.className = "btn"; 
    btnNon.style.background = "#e74c3c"; 
    btnNon.style.color = "#000";    
    btnNon.style.borderColor = "#000";  
    btnNon.innerText = "REFUSER";
    btnNon.onclick = () => sendVote('NON');

    ui.appendChild(btnOui);
    ui.appendChild(btnNon);
}

function sendVote(v) {
    document.getElementById('main-ui').innerHTML = "Vote " + v + " transmis...";
    conn.send({ type: 'VOTE_DONE', choice: v, playerName: myName });
}

function showLegislativeUI(role, cards) {
    const ui = document.getElementById('main-ui');
    currentHand = cards;
    ui.innerHTML = `<h3>LÉGISLATION : ${role}</h3>`;
    ui.innerHTML += `<p>${role === 'GARDIEN' ? 'DÉFAUSSEZ UN DÉCRET' : 'APPLIQUER UN DÉCRET'}</p>`;
    
    cards.forEach((c, i) => {
        const btn = document.createElement('button');
        const label = c === 'S' ? 'SURVIE' : (c === 'C' ? 'CRISE' : 'SUFFRAGE');
        btn.className = `card ${c}`;
        btn.innerText = label;
        btn.onclick = () => {
            if (role === 'GARDIEN') {
                let remaining = [...currentHand]; remaining.splice(i, 1);
                conn.send({ type: 'DISCARD_DONE', remaining: remaining });
            } else {
                conn.send({ type: 'FINAL_CHOICE', card: c });
            }
            ui.innerHTML = "Traitement...";
        };
        ui.appendChild(btn);
    });
}


function openTargetSelector(actionType, title, isForced = false) {
    if (!isForced && hasUsedPower) return alert("Capacité déjà utilisée.");
        
    const ui = document.getElementById('main-ui');
    ui.innerHTML = `<h3>${title}</h3><p>Sélectionnez une cible :</p>`;
        
    // On utilise les noms vivants du serveur, sinon la liste complète par défaut
    const listToUse = (serverState && serverState.aliveNames) ? serverState.aliveNames : allPlayers;
        
    // Vérification de sécurité
    if (listToUse.length === 0) {
        ui.innerHTML += "<p>Aucune cible éligible détectée.</p>";
    }

    // Le bouton ANNULER (Placé au-dessus ou en dessous selon tes préférences)
   if (!isForced) {
        const btnCancel = document.createElement('button');
        btnCancel.className = "btn-cancel";
        btnCancel.innerText = "ANNULER";
        btnCancel.onclick = () => conn.send({ type: 'SYNC_REQUEST' });
        ui.appendChild(btnCancel);

        // Élément invisible pour forcer le retour à la ligne après l'Annuler
        const breakLine = document.createElement('div');
        breakLine.style.width = "100%";
        ui.appendChild(breakLine);
    }
     
    // Génération des boutons de cibles
    listToUse.forEach(name => {
        if (name.toLowerCase() !== myName.toLowerCase()) {
                
            // Si c'est une demande de Censure, on cache les cibles déjà censurées
            if (actionType === 'REQUEST_CENSURE' && serverState.censoredNames && serverState.censoredNames.includes(name)) {
                return; 
            }
        
            const btn = document.createElement('button');
            btn.className = "btn-target";
            btn.innerText = name.toUpperCase();
            btn.onclick = () => {
                if (!confirm(`Confirmer l'action sur ${name} ?`)) return;
                if (!isForced) {
                    hasUsedPower = true;
                    document.getElementById('job-ui').style.opacity = "0.3";
                }
                conn.send({ type: actionType, targetName: name, isForced: isForced });
                ui.innerHTML = "Traitement...";
            };
            ui.appendChild(btn);
        }
    });
}

function showBloodResult(data) {
    // 1. On détermine la couleur du cadre de l'alerte (Vert si Sain, Rouge si Infecté)
    const cardColor = data.result === "SAIN" ? "#2ecc71" : "#e74c3c";
    
    // 2. On détermine la couleur spécifique pour le texte du statut
    const statusColor = data.result === "SAIN" ? "#2ecc71" : "#e74c3c";

    document.getElementById('main-ui').innerHTML = `
        <div style="border: 2px solid ${cardColor}; padding: 15px; border-radius: 10px; background: rgba(0,0,0,0.5);">
            <h3 style="color: ${cardColor}; margin-top: 0; letter-spacing: 1px;">RÉSULTAT D'ANALYSE</h3>
            <p style="color: #e0e0e0; margin: 10px 0;">Sujet : <b>${data.target.toUpperCase()}</b></p>
            <p style="color: #e0e0e0; margin: 10px 0;">Statut : <b style="color: ${statusColor}; font-size: 1.2em; letter-spacing: 1px;">${data.result}</b></p>
            <button class="btn" id="btn-ok" style="margin-top: 15px; width: 50%;">OK</button>
        </div>`;
        
    document.getElementById('btn-ok').onclick = () => conn.send({ type: 'SYNC_REQUEST' });
}

function showEndGame(data) {
    const isWin = data.personalResult === "MISSION RÉUSSIE";
    const color = isWin ? "#2ecc71" : "#e74c3c";
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 2px solid ${color}; padding: 20px; border-radius: 10px;">
            <h1 style="color:${color}">${data.personalResult}</h1>
            <p>Les <b>${data.team}</b> ont gagné.</p>
            <p style="font-size:0.8em; font-style:italic;">"${data.reason}"</p>
        </div>`;
}

function resetAffichageJ() {
// 1. On nettoie les données locales de la partie finie
    hasUsedPower = false;
    currentHand = [];
    serverState = {};
    
    // 2. On bascule l'affichage sur un mode "Lobby / Attente"
    const ui = document.getElementById('main-ui');
    const gameZone = document.getElementById('game');
    const memoBox = document.getElementById('memo-box');
    const jobUi = document.getElementById('job-ui');

    // On cache les éléments de la partie précédente
    if (memoBox) memoBox.style.display = "none";
    if (jobUi) {
        jobUi.innerHTML = "";
        jobUi.style.opacity = "1"; // On remet l'opacité à 100%
    }
    
    // On réinitialise l'en-tête (Rôle inconnu)
    document.getElementById('role-display').innerText = "RÔLE : EN ATTENTE...";
    document.getElementById('role-display').style.color = "#2ecc71";
    document.getElementById('role-display').parentElement.style.borderColor = "#2ecc71";
    document.getElementById('metier-display').innerText = "MÉTIER : ???";

    // 3. On affiche le message central pour éviter l'écran noir
    ui.innerHTML = `
        <div style="margin-top: 50px;">
            <h2 style="color: #f1c40f;">SYSTÈME RÉINITIALISÉ</h2>
            <p>Connexion maintenue avec le Bunker.</p>
            <div class="loader" style="margin: 20px auto; border: 4px solid #333; border-top: 4px solid #2ecc71; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite;"></div>
            <p style="font-size: 0.8em; color: #888;">En attente du lancement par le Gardien Principal...</p>
        </div>
    `;
}
