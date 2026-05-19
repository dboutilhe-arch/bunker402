// js/ui/mobile-render.js

import { DECREETS_DB_LOCAL } from '../core/mobile-constants.js';
import { mobileState, sendPowerAction } from '../network/mobile-handler.js';

export function updateMiniBoard(state) {
    document.getElementById('oxy-mini').style.width = (state.oxy / 3 * 100) + "%";
    document.getElementById('oxy-mini').style.background = state.oxy <= 1 ? "#e74c3c" : "#3498db";
    document.getElementById('oxy-text-mini').innerText = `NIVEAU D'OXYGENE: ${state.oxy}/3`;
    
    document.getElementById('m-s').innerHTML = Array(5).fill(0).map((_, i) => `<div class="dot ${i < state.survie ? 'f-s' : ''}"></div>`).join('');
    document.getElementById('m-c').innerHTML = Array(6).fill(0).map((_, i) => `<div class="dot ${i < state.crise ? 'f-c' : ''}"></div>`).join('');
}

export function setupIdentity(data) {
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
    } else {
        document.getElementById('alpha-info').innerHTML = "";
    }

    jobUi.innerHTML = "";
    jobUi.style.opacity = "1";
 
    if (data.metier === 'Docteur') {
        const btn = document.createElement('button');
        btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "TEST SANGUIN";
        if (mobileState.hasUsedPower) jobUi.style.opacity = "0.3";
        btn.onclick = () => openTargetSelector('REQUEST_BLOOD_TEST', 'ANALYSE BIOLOGIQUE');
        jobUi.appendChild(btn);
    }
    if (data.metier === 'Militaire') {
       const btn = document.createElement('button');
       btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "EXÉCUTER UN INDIVIDU";
       if (mobileState.hasUsedPower) jobUi.style.opacity = "0.3";
       btn.onclick = () => openTargetSelector('REQUEST_EXECUTION', "PROTOCOLE D'ÉLIMINATION");
       jobUi.appendChild(btn);
   }
   if (data.metier === 'Intendant') {
          const btn = document.createElement('button');
          btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "VERROUILLER UN TERMINAL (CENSURE)";
          if (mobileState.hasUsedPower) jobUi.style.opacity = "0.3";
          btn.onclick = () => openTargetSelector('REQUEST_CENSURE', 'PROTOCOLE DE CENSURE');
          jobUi.appendChild(btn);
   }
   if (data.metier === 'Shérif') {
        const btn = document.createElement('button');
        btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "PASSIF: VOTE DOUBLE";
        btn.disabled = true; btn.style.opacity = "0.6"; btn.style.background = "#4a004a"; btn.style.borderColor = "#ff00ff"; btn.style.color = "#ff00ff"; btn.style.pointerEvents = "none";
        jobUi.appendChild(btn);
   }
   if (data.metier === 'Journaliste') {
        const btn = document.createElement('button');
        btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "PASSIF: IMMUNITÉ CENSURE";
        btn.disabled = true; btn.style.opacity = "0.6"; btn.style.background = "#002b36"; btn.style.borderColor = "#00ffff"; btn.style.color = "#00ffff"; btn.style.pointerEvents = "none";
        jobUi.appendChild(btn);
   }
   if (data.metier === 'Fossoyeur') {
        const btn = document.createElement('button');
        btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "NÉCROLOGIE : +0 VOIX (0 MORT)";
        btn.disabled = true; btn.style.opacity = "0.7"; btn.style.background = "#1a1105"; btn.style.borderColor = "#964b00"; btn.style.color = "#d2b48c"; btn.style.pointerEvents = "none";
        jobUi.appendChild(btn);
   }
   if (data.metier === 'Archiviste') {
        const btn = document.createElement('button');
        btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "📜 ARCHIVER LE PROCHAIN VOTE";
        if (mobileState.hasUsedPower) jobUi.style.opacity = "0.3";
        btn.onclick = () => {
            if (!confirm("Forcer le Gardien à piocher 4 cartes lors du prochain vote valide ?")) return;
            btn.disabled = true; btn.style.opacity = "0.3"; btn.style.pointerEvents = "none"; btn.innerText = "📜 PROTOCOLE ENCLENCHÉ...";
            mobileState.hasUsedPower = true;
            mobileState.conn.send({ type: 'USE_ARCHIVISTE_POWER' });
        };
        jobUi.appendChild(btn);
    }
    if (data.metier === 'Vigile') {
        const btn = document.createElement('button');
        btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "🛑 SÉCURISER UN INDIVIDU (BAN SENTINELLE)";
        if (mobileState.hasUsedPower) jobUi.style.opacity = "0.3";
        btn.onclick = () => openTargetSelector('REQUEST_VIGILE_BAN', 'CONTRÔLE DES ACCÈS');
        jobUi.appendChild(btn);
    }
}

export function showGardienUI(eligible) {
    const ui = document.getElementById('main-ui');
    ui.innerHTML = `<h3>TOUR DU GARDIEN</h3><p>Désignez votre Sentinelle :</p>`;
    
    const container = document.createElement('div');
    container.className = "theme-sentinelle";
    
    const controls = document.createElement('div');
    controls.className = "action-controls";
    
    const btnValidate = document.createElement('button');
    btnValidate.className = "btn-action validate";
    btnValidate.innerText = "NOMMER LA SENTINELLE";
    controls.appendChild(btnValidate);
    container.appendChild(controls);

    let selectedSentinelle = null;
    const buttonsMap = {};

    eligible.forEach(name => {
        const btn = document.createElement('button');
        btn.className = "btn-target";
        btn.innerText = name.toUpperCase();
        buttonsMap[name] = btn;

        btn.onclick = () => {
            if (selectedSentinelle && buttonsMap[selectedSentinelle]) {
                buttonsMap[selectedSentinelle].classList.remove('selected');
            }
            selectedSentinelle = name;
            btn.classList.add('selected');
            btnValidate.classList.add('ready');
        };
        container.appendChild(btn);
    });

    btnValidate.onclick = () => {
        if (!selectedSentinelle) return;
        mobileState.conn.send({ type: 'SENTINELLE_CHOISIE', gardienName: mobileState.myName, sentinelleName: selectedSentinelle });
        ui.innerHTML = `<div style="margin-top:40px;">Transmission des codes d'accès...</div>`;
    };

    ui.appendChild(container);
}

export function showVoteUI(data) {
    const ui = document.getElementById('main-ui');
    ui.innerHTML = `<h3>VOTE CONSEIL</h3>`;
    if (mobileState.myName === data.g) ui.innerHTML += `<p style="background: #f1c40f; color: black; padding: 5px;">⚠️ VOUS ÊTES LE GARDIEN</p>`;
    else if (mobileState.myName === data.s) ui.innerHTML += `<p style="background: #3498db; color: white; padding: 5px;">⚠️ VOUS ÊTES LA SENTINELLE</p>`;

    ui.innerHTML += `<p>Approuvez-vous ce Conseil ?<br><b>${data.g} & ${data.s}</b></p>`;
    
    const btnOui = document.createElement('button');
    btnOui.className = "btn"; btnOui.style.background = "#2ecc71"; btnOui.style.color = "#000"; btnOui.style.borderColor = "#000"; btnOui.innerText = "ACCEPTER";
    btnOui.onclick = () => {
        document.getElementById('main-ui').innerHTML = "Vote OUI transmis...";
        mobileState.conn.send({ type: 'VOTE_DONE', choice: 'OUI', playerName: mobileState.myName });
    };
    
    const btnNon = document.createElement('button');
    btnNon.className = "btn"; btnNon.style.background = "#e74c3c"; btnNon.style.color = "#000"; btnNon.style.borderColor = "#000"; btnNon.innerText = "REFUSER";
    btnNon.onclick = () => {
        document.getElementById('main-ui').innerHTML = "Vote NON transmis...";
        mobileState.conn.send({ type: 'VOTE_DONE', choice: 'NON', playerName: mobileState.myName });
    };

    ui.appendChild(btnOui);
    ui.appendChild(btnNon);
}

export function showLegislativeUI(role, cards) {
    const ui = document.getElementById('main-ui');
    mobileState.currentHand = cards;
    
    ui.innerHTML = `<h3>LÉGISLATION : ${role}</h3>`;
    ui.innerHTML += `<p style="font-size:0.85em; color:#888;">${role === 'GARDIEN' ? 'SÉLECTIONNEZ LE DÉCRET À DÉFAUSSER' : 'SÉLECTIONNEZ LE DÉCRET À PROMULGUER'}</p>`;
    
    const controls = document.createElement('div');
    controls.className = "action-controls theme-power";
    
    const btnValidate = document.createElement('button');
    btnValidate.className = "btn-action validate";
    btnValidate.innerText = role === 'GARDIEN' ? "DÉFAUSSER" : "PROMULGUER";
    controls.appendChild(btnValidate);
    ui.appendChild(controls);

    const cardContainer = document.createElement('div');
    cardContainer.className = "legislative-container";
    
    let selectedCardId = null;
    let selectedCardIndex = null;
    const cardsElements = [];
    
    cards.forEach((cardId, i) => {
        const data = DECREETS_DB_LOCAL[cardId];
        if (!data) return;

        const cardElement = document.createElement('div');
        cardElement.className = `decree-card card-type-${data.type}`;
        cardsElements.push(cardElement);
        
        let typeText = data.type === 'S' ? "SURVIE" : (data.type === 'C' ? "CRISE" : "SUFFRAGE");

        cardElement.innerHTML = `
            <div class="card-header card-header-${data.type}">
                <span>${typeText}</span>
                <span>${data.symbol}</span>
            </div>
            <div class="card-title">${data.name}</div>
            <div class="card-desc">${data.desc}</div>
        `;
        
        cardElement.onclick = () => {
            cardsElements.forEach(el => el.style.boxShadow = "");
            selectedCardId = cardId;
            selectedCardIndex = i;
            cardElement.style.boxShadow = "0 0 20px #ffffff, inset 0 0 10px #ffffff";
            btnValidate.classList.add('ready');
        };
        cardContainer.appendChild(cardElement);
    });
    
    btnValidate.onclick = () => {
        if (selectedCardId === null) return;
        
        if (role === 'GARDIEN') {
            let remaining = [...mobileState.currentHand]; 
            remaining.splice(selectedCardIndex, 1);
            mobileState.conn.send({ type: 'DISCARD_DONE', discardedCardId: selectedCardId, remaining: remaining });
        } else {
            mobileState.conn.send({ type: 'FINAL_CHOICE', card: selectedCardId });
        }
        ui.innerHTML = `<div style="margin-top:40px;">Transmission des données cryptées...</div>`;
    };
    
    ui.appendChild(cardContainer);
}

export function openTargetSelector(actionType, title, isForced = false) {
    if (!isForced && mobileState.hasUsedPower) return alert("Capacité déjà utilisée.");
        
    const ui = document.getElementById('main-ui');
    ui.innerHTML = `<h3>${title}</h3><p>Sélectionnez une ou plusieurs cibles :</p>`;

    const container = document.createElement('div');
    container.className = "theme-power";

    const controls = document.createElement('div');
    controls.className = "action-controls";

    if (!isForced) {
        const btnCancel = document.createElement('button');
        btnCancel.className = "btn-action cancel"; btnCancel.innerText = "ANNULER";
        btnCancel.onclick = () => mobileState.conn.send({ type: 'SYNC_REQUEST' });
        controls.appendChild(btnCancel);
    }

    const btnValidate = document.createElement('button');
    btnValidate.className = "btn-action validate"; btnValidate.innerText = "VALIDER L'ACTION";
    controls.appendChild(btnValidate);
    container.appendChild(controls);

    let selectedTargets = [];
    const isReorganisation = (actionType === 'REQUEST_REORGANISATION');
    const targetLimit = isReorganisation ? 2 : 1;

    const updateValidationButtonText = () => {
        btnValidate.innerText = isReorganisation ? `ÉCHANGE (${selectedTargets.length}/2)` : "VALIDER L'ACTION";
    };
    updateValidationButtonText();

    if (actionType === 'REQUEST_PURGE') {
        const crisesActives = mobileState.serverState?.slotsCriseCards || [];
        if (crisesActives.length === 0) {
            ui.innerHTML += "<p style='color:#888;'>Aucun décret de crise actif sur le plateau.</p>";
            btnValidate.innerText = "CONFIRMER (PLATEAU VIDE)"; btnValidate.classList.add('ready');
            btnValidate.onclick = () => mobileState.conn.send({ type: 'ACTION_CONFIRMED' });
            ui.appendChild(container); return;
        }

        let selectedPurgeCard = null;
        const purgeButtons = {};

        crisesActives.forEach(cardId => {
            const cardData = DECREETS_DB_LOCAL[cardId] || { name: cardId };
            const btn = document.createElement('button');
            btn.className = "btn-target"; btn.innerText = cardData.name.toUpperCase();
            purgeButtons[cardId] = btn;

            btn.onclick = () => {
                if (selectedPurgeCard && purgeButtons[selectedPurgeCard]) purgeButtons[selectedPurgeCard].classList.remove('selected');
                selectedPurgeCard = cardId; btn.classList.add('selected'); btnValidate.classList.add('ready');
            };
            container.appendChild(btn);
        });

        btnValidate.onclick = () => {
            if (!selectedPurgeCard) return;
            sendPowerAction(actionType, { cardId: selectedPurgeCard }, isForced);
        };
        ui.appendChild(container); return;
    }

    const listToUse = mobileState.serverState?.aliveNames || mobileState.allPlayers;
    const playerButtons = {};

    listToUse.forEach(name => {
        if (name.toLowerCase() === mobileState.myName.toLowerCase()) return;
        if (actionType === 'REQUEST_CENSURE') {
            if (mobileState.serverState?.censoredNames?.includes(name)) return;
            if (mobileState.serverState?.journalisteNames?.includes(name)) return;
        }
        
        const btn = document.createElement('button');
        btn.className = "btn-target"; btn.innerText = name.toUpperCase();
        playerButtons[name] = btn;

        btn.onclick = () => {
            const idx = selectedTargets.indexOf(name);
            if (idx !== -1) {
                selectedTargets.splice(idx, 1); btn.classList.remove('selected');
            } else {
                if (selectedTargets.length >= targetLimit) {
                    if (targetLimit === 1) {
                        const oldTarget = selectedTargets.pop();
                        if (playerButtons[oldTarget]) playerButtons[oldTarget].classList.remove('selected');
                    } else return;
                }
                selectedTargets.push(name); btn.classList.add('selected');
            }

            if (selectedTargets.length === targetLimit) btnValidate.classList.add('ready');
            else btnValidate.classList.remove('ready');
            updateValidationButtonText();
        };
        container.appendChild(btn);
    });

    btnValidate.onclick = () => {
        if (selectedTargets.length !== targetLimit) return;
        if (isReorganisation) {
            sendPowerAction(actionType, { targetAName: selectedTargets[0], targetBName: selectedTargets[1] }, isForced);
        } else {
            sendPowerAction(actionType, { targetName: selectedTargets[0] }, isForced);
        }
    };
    ui.appendChild(container);
}

export function showBloodResult(data) {
    const cardColor = data.result === "SAIN" ? "#2ecc71" : "#e74c3c";
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 2px solid ${cardColor}; padding: 15px; border-radius: 10px; background: rgba(0,0,0,0.5);">
            <h3 style="color: ${cardColor}; margin-top: 0; letter-spacing: 1px;">RÉSULTAT D'ANALYSE</h3>
            <p style="color: #e0e0e0; margin: 10px 0;">Sujet : <b>${data.target.toUpperCase()}</b></p>
            <p style="color: #e0e0e0; margin: 10px 0;">Statut : <b style="color: ${cardColor}; font-size: 1.2em; letter-spacing: 1px;">${data.result}</b></p>
            <button class="btn" id="btn-ok" style="margin-top: 15px; width: 50%;">OK</button>
        </div>`;
    document.getElementById('btn-ok').onclick = () => mobileState.conn.send({ type: 'SYNC_REQUEST' });
}

export function showExecutionResult(data) {
    const color = data.result === "INFECTÉ" ? "#e74c3c" : "#2ecc71";
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 2px solid #e74c3c; padding: 15px; border-radius: 10px; background: rgba(0,0,0,0.5);">
            <h3 style="color: #e74c3c; margin-top: 0; letter-spacing: 1px;">RAPPORT D'ÉLIMINATION</h3>
            <p style="color: #e0e0e0; margin: 10px 0;">Sujet exécuté : <b>${data.target.toUpperCase()}</b></p>
            <p style="color: #e0e0e0; margin: 10px 0;">Registre biologique : <b style="color: ${color}; font-size: 1.1em;">${data.result}</b></p>
            <button class="btn" id="btn-ok" style="margin-top: 15px; width: 50%; background: #e74c3c; color: #000; border-color: #000;">OK</button>
        </div>`;
    document.getElementById('btn-ok').onclick = () => mobileState.conn.send({ type: data.isForced ? 'ACTION_CONFIRMED' : 'SYNC_REQUEST' });
}

export function showCensureResult(data) {
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 2px solid #ff00ff; padding: 15px; border-radius: 10px; background: rgba(0,0,0,0.5);">
            <h3 style="color: #ff00ff; margin-top: 0; letter-spacing: 1px;">TERMINAL VERROUILLÉ</h3>
            <p style="color: #e0e0e0; margin: 10px 0;">Le protocole de restriction a été appliqué avec succès.</p>
            <p style="color: #f1c40f; margin: 10px 0;">Cible : <b>${data.target.toUpperCase()}</b></p>
            <button class="btn" id="btn-ok" style="margin-top: 15px; width: 50%; background: #ff00ff; color: #000; border-color: #000;">OK</button>
        </div>`;
    document.getElementById('btn-ok').onclick = () => mobileState.conn.send({ type: data.isForced ? 'ACTION_CONFIRMED' : 'SYNC_REQUEST' });
}

export function showCoupEtatResult(data) {
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 2px solid #ff5722; padding: 15px; border-radius: 10px; background: rgba(0,0,0,0.5);">
            <h3 style="color: #ff5722; margin-top: 0; letter-spacing: 1px;">📢 ORDRE EXTRAORDINAIRE</h3>
            <p style="color: #e0e0e0; margin: 10px 0;">Le protocole de transition forcée a été injecté.</p>
            <p style="color: #f1c40f; margin: 10px 0;">Prochain Gardien temporaire : <b>${data.target.toUpperCase()}</b></p>
            <button class="btn" id="btn-ok" style="margin-top: 15px; width: 50%; background: #ff5722; color: #000; border-color: #000;">OK</button>
        </div>`;
    document.getElementById('btn-ok').onclick = () => mobileState.conn.send({ type: data.isForced ? 'ACTION_CONFIRMED' : 'SYNC_REQUEST' });
}

export function showEndGame(data) {
    const isWin = data.personalResult === "MISSION RÉUSSIE";
    const color = isWin ? "#2ecc71" : "#e74c3c";
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 2px solid ${color}; padding: 20px; border-radius: 10px;">
            <h1 style="color:${color}">${data.personalResult}</h1>
            <p>Les <b>${data.team}</b> ont gagné.</p>
            <p style="font-size:0.8em; font-style:italic;">"${data.reason}"</p>
        </div>`;
}

export function showSentinelle493View(cards) {
    const cardContainer = document.createElement('div');
    cardContainer.className = "legislative-container";

    cards.forEach(cardId => {
        const data = DECREETS_DB_LOCAL[cardId];
        if (!data) return;

        const cardElement = document.createElement('div');
        cardElement.className = `decree-card card-type-${data.type}`;
        cardElement.style.opacity = "0.85"; cardElement.style.cursor = "not-allowed";
        
        let typeText = data.type === 'S' ? "SURVIE" : (data.type === 'C' ? "CRISE" : "SUFFRAGE");

        cardElement.innerHTML = `
            <div class="card-header card-header-${data.type}">
                <span>${typeText}</span>
                <span>${data.symbol}</span>
            </div>
            <div class="card-title">${data.name}</div>
            <div class="card-desc">${data.desc}</div>
        `;
        cardContainer.appendChild(cardElement);
    });

    const ui = document.getElementById('main-ui');
    ui.innerHTML = `<h3>👁️ VISUEL TERMINAL (49.3)</h3><p style="font-size:0.85em; color:#ff3333; font-weight:bold;">[LECTURE SEULE] LE GARDIEN SÉLECTIONNE LE DÉCRET FINAL...</p>`;
    ui.appendChild(cardContainer);
}

export function showPurgeResult(data) {
    const cardName = DECREETS_DB_LOCAL[data.cardId]?.name || data.cardId;
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 2px solid #2ecc71; padding: 15px; border-radius: 10px; background: rgba(0,0,0,0.5);">
            <h3 style="color: #2ecc71; margin-top: 0; letter-spacing: 1px;">⚙️ PURGE DU PLATEAU</h3>
            <p style="color: #e0e0e0; margin: 10px 0;">Le protocole de nettoyage de la mémoire centrale a été exécuté.</p>
            <p style="color: #f1c40f; margin: 10px 0;">Directive supprimée : <b style="text-transform: uppercase;">${cardName}</b></p>
            <button class="btn" id="btn-ok" style="margin-top: 15px; width: 50%; background: #2ecc71; color: #000; border-color: #000;">OK</button>
        </div>`;
    document.getElementById('btn-ok').onclick = () => mobileState.conn.send({ type: data.isForced ? 'ACTION_CONFIRMED' : 'SYNC_REQUEST' });
}

export function showReorganisationResult(data) {
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 2px solid #3498db; padding: 15px; border-radius: 10px; background: rgba(0,0,0,0.5);">
            <h3 style="color: #3498db; margin-top: 0; letter-spacing: 1px;">🔄 RÉORGANISATION EFFECTUÉE</h3>
            <p style="color: #e0e0e0; margin: 10px 0;">Les bases de données biologiques ont été permutées.</p>
            <p style="color: #f1c40f; margin: 10px 0;"><b>${data.targetA.toUpperCase()}</b> ⇄ <b>${data.targetB.toUpperCase()}</b></p>
            <button class="btn" id="btn-ok" style="margin-top: 15px; width: 50%; background: #3498db; color: #000; border-color: #000;">OK</button>
        </div>`;
    document.getElementById('btn-ok').onclick = () => mobileState.conn.send({ type: data.isForced ? 'ACTION_CONFIRMED' : 'SYNC_REQUEST' });
}

export function showBloodSwappedAlert(data) {
    const bColor = data.newBlood === "SAIN" ? "#2ecc71" : "#e74c3c";
    document.getElementById('blood-status').innerHTML = `🩸 SANG : <span style="color: ${bColor}">${data.newBlood}</span>`;
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 2px solid #3498db; padding: 20px; border-radius: 10px; background: rgba(52, 152, 219, 0.1);">
            <h2 style="color: #3498db; letter-spacing: 1px;">⚠️ DOSSIER INTERVERTI</h2>
            <p style="color: #e0e0e0;">Le Gardien a réorganisé les archives médicales.</p>
            <p style="color: #fff;">Votre dossier biologique a été échangé avec celui de : <b style="color: #f1c40f;">${data.withPlayer.toUpperCase()}</b></p>
            <p style="font-size: 0.9em; margin-top: 15px; color: #aaa;">Votre nouveau statut sanguin est : <b style="color: ${bColor}">${data.newBlood}</b></p>
            <p style="font-size: 0.75em; color: #555; margin-top: 20px;">[SYNCHRONISATION DES TERMINAUX TERMINÉE]</p>
        </div>`;
}

export function resetAffichageJ() {
    mobileState.hasUsedPower = false;
    mobileState.currentHand = [];
    mobileState.serverState = {};
    
    const ui = document.getElementById('main-ui');
    const memoBox = document.getElementById('memo-box');
    const jobUi = document.getElementById('job-ui');

    if (memoBox) memoBox.style.display = "none";
    if (jobUi) { jobUi.innerHTML = ""; jobUi.style.opacity = "1"; }
    
    if (document.getElementById('alpha-info')) document.getElementById('alpha-info').innerHTML = ""; 
    if (document.getElementById('team-goal')) document.getElementById('team-goal').innerHTML = "";
    if (document.getElementById('blood-status')) document.getElementById('blood-status').innerHTML = "";
    if (document.getElementById('win-cond')) document.getElementById('win-cond').innerHTML = "";
    
    document.getElementById('role-display').innerText = "RÔLE : EN ATTENTE...";
    document.getElementById('role-display').style.color = "#2ecc71";
    document.getElementById('role-display').parentElement.style.borderColor = "#2ecc71";
    document.getElementById('metier-display').innerText = "MÉTIER : ???";

    ui.innerHTML = `
        <div style="margin-top: 50px;">
            <h2 style="color: #f1c40f;">SYSTÈME RÉINITIALISÉ</h2>
            <p>Connexion maintenue avec le Bunker.</p>
            <div class="loader" style="margin: 20px auto; border: 4px solid #333; border-top: 4px solid #2ecc71; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite;"></div>
            <p style="font-size: 0.8em; color: #888;">En attente du lancement par le Gardien Principal...</p>
        </div>`;
}

export function showWaitSentinelleUI(gardienName) {
    document.getElementById('main-ui').innerHTML = `
        <div style="margin-top: 40px;">
            <h2 style="color: #f1c40f; text-transform: uppercase;">FORMATION DU CONSEIL</h2>
            <p style="color: #e0e0e0;">Le Gardien <b>${gardienName}</b> choisit sa Sentinelle...</p>
            <div class="loader" style="margin: 30px auto; border: 4px solid #111; border-top: 4px solid #f1c40f; border-radius: 50%; width: 35px; height: 35px; animation: spin 1s linear infinite;"></div>
            <p style="font-size: 0.8em; color: #666; letter-spacing: 1px;">[ANALYSE DES ACCÈS RÉSEAU EN COURS]</p>
        </div>`;
}

export function showWaitLegislationUI(step) {
    document.getElementById('main-ui').innerHTML = `
        <div style="margin-top: 40px;">
            <h2 style="color: #3498db; text-transform: uppercase;">SESSION LÉGISLATIVE</h2>
            <p style="color: #e0e0e0;">Le Conseil applique les protocoles secrets (Aiguillage : <b>${step}</b>)...</p>
            <div class="loader" style="margin: 30px auto; border: 4px solid #111; border-top: 4px solid #3498db; border-radius: 50%; width: 35px; height: 35px; animation: spin 1.5s linear infinite;"></div>
            <p style="font-size: 0.8em; color: #666; letter-spacing: 1px;">[CHIFFREMENT DES DÉCRETS DE SÉCURITÉ]</p>
        </div>`;
}

export function showWaitPowerUI(gardienName, title) {
    document.getElementById('main-ui').innerHTML = `
        <div style="margin-top: 40px; ">
            <h2 style="color: #ff00ff; text-transform: uppercase; letter-spacing: 1px;">PROTOCOLE INTERACTIF</h2>
            <p style="color: #e0e0e0; font-size: 0.9em;">Le Gardien <b>${gardienName}</b> applique le décret :</p>
            <p style="color: #ff00ff; font-weight: bold; font-size: 1.1em; text-transform: uppercase;">[ ${title} ]</p>
            <div class="loader" style="margin: 30px auto; border: 4px solid #111; border-top: 4px solid #ff00ff; border-radius: 50%; width: 35px; height: 35px; animation: spin 1.2s linear infinite; box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);"></div>
            <p style="font-size: 0.75em; color: #555; letter-spacing: 1px;">[SÉCURISATION DES TERMINAUX DISTANTS EN COURS]</p>
        </div>`;
}

export function showDeadUI(reveal) {
    const colReveal = reveal === "INFECTÉ" ? "#e74c3c" : "#2ecc71";
    document.getElementById('main-ui').innerHTML = `
        <h1 style="color: #e74c3c;">VOUS ÊTES MORT</h1>
        <p>Analyse post-mortem : <b style="color: ${colReveal}">${reveal}</b></p>
        <p style="opacity: 0.6;">Vous ne pouvez plus voter ni participer.</p>
    `;
    document.getElementById('job-ui').innerHTML = "";
}

export function showCensoredAlertUI(byPlayer) {
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 2px solid #e74c3c; padding: 20px; border-radius: 10px; background: rgba(231, 76, 60, 0.1);">
            <h2 style="color: #e74c3c;">🤐 CENSURE ACTIVÉE</h2>
            <p>Le joueur <b>${byPlayer}</b> a suspendu vos droits de vote pour ce scrutin.</p>
            <p style="font-size: 0.8em; opacity: 0.6; margin-top: 20px;">Attendez la fin du tour...</p>
        </div>`;
}

export function showCleanUI() {
    document.getElementById('main-ui').innerHTML = `
        <div style="margin-top: 40px;">
            <h2 style="color: #2ecc71; text-transform: uppercase;">TRANSMISSION REÇUE</h2>
            <p style="color: #e0e0e0;">Votre vote a été enregistré par la console centrale.</p>
            <div class="loader" style="margin: 30px auto; border: 4px solid #111; border-top: 4px solid #2ecc71; border-radius: 50%; width: 35px; height: 35px; animation: spin 2s linear infinite;"></div>
            <p style="font-size: 0.8em; color: #666; letter-spacing: 1px;">[SYNCHRONISATION TERMINAL EN ATTENTE DU SCRUTIN]</p>
        </div>`;
}
