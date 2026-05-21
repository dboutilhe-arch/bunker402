// js/ui/mobile-render.js

import { DECREETS_DB_LOCAL } from '../core/mobile-constants.js';
import { mobileState, sendPowerAction } from '../network/mobile-handler.js';

export function updateMiniBoard(state) {
    const oxyEl = document.getElementById('oxy-mini');
    oxyEl.style.width = (state.oxy / 3 * 100) + "%";
    // Si oxy <= 1, l'ECG passe au rouge sang et clignote
    if (state.oxy <= 1) {
        oxyEl.style.background = "#ff1744";
        oxyEl.style.boxShadow = "0 0 10px #ff1744";
        oxyEl.style.animation = "pulse 0.5s infinite";
    } else {
        oxyEl.style.background = "#00e5ff";
        oxyEl.style.boxShadow = "0 0 8px #00e5ff";
        oxyEl.style.animation = "none";
    }
    document.getElementById('oxy-text-mini').innerText = `SpO2: ${state.oxy}/3`;
    
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

    // NOUVELLES COULEURS CLINIQUES
    const roles = {
        'S':  { label: "SURVIVANT", color: "#00e5ff", goal: "Rétablir les protocoles de survie.", win: "5 décrets BLEUS ou éliminer l'Alpha.", blood: "SAIN", bColor: "#1de9b6" },
        'I':  { label: "INFECTÉ", color: "#ff1744", goal: "Propager l'infection.", win: "6 décrets ROUGES ou Alpha élu Sentinelle avec 3 décrets ROUGES.", blood: "INFECTÉ", bColor: "#ff1744" },
        'A':  { label: "ALPHA", color: "#d500f9", goal: "Propager l'infection.", win: "6 décrets ROUGES ou être élu Sentinelle avec 3 décrets ROUGES.", blood: "INFECTÉ", bColor: "#ff1744" },
        'M':  { label: "MYCOLOGUE", color: "#00bfa5", goal: "Propager l'infection (Infiltré).", win: "6 décrets ROUGES ou Alpha élu Sentinelle avec 3 décrets ROUGES.", blood: "SAIN", bColor: "#1de9b6" },
        'IM': { label: "IMMUNISÉ", color: "#ffea00", goal: "Rétablir les protocoles (Résistant).", win: "5 décrets BLEUS ou éliminer l'Alpha.", blood: "INFECTÉ", bColor: "#ff1744" }
    };

    const config = roles[data.role];
    rDisplay.innerText = "RÔLE : " + config.label;
    rDisplay.style.color = config.color;
    rDisplay.parentElement.style.borderColor = config.color;
    rDisplay.parentElement.style.boxShadow = `inset 0 0 15px ${config.color}20`; // Lueur de fond légère
    
    document.getElementById('team-goal').innerText = "OBJECTIF : " + config.goal;
    document.getElementById('win-cond').innerText = "Conditions : " + config.win;
    document.getElementById('blood-status').innerHTML = `ANALYSE BIOLOGIQUE : <span style="color: ${config.bColor}">${config.blood}</span>`;
    document.getElementById('blood-status').style.borderColor = config.bColor;

    if (data.alphaName && (data.role === 'I' || data.role === 'M')) {
        document.getElementById('alpha-info').innerHTML = `SOUCHE ALPHA DÉTECTÉE : <span>${data.alphaName.toUpperCase()}</span>`;
    } else {
        document.getElementById('alpha-info').innerHTML = "";
    }

    jobUi.innerHTML = "";
    jobUi.style.opacity = "1";
 
    // Logique de création des boutons (inchangée, mais le CSS gère le look médical)
    if (data.metier === 'Docteur') {
        const btn = document.createElement('button');
        btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "PRÉLÈVEMENT SANGUIN";
        if (mobileState.hasUsedPower) jobUi.style.opacity = "0.3";
        btn.onclick = () => openTargetSelector('REQUEST_BLOOD_TEST', 'ANALYSE BIOLOGIQUE');
        jobUi.appendChild(btn);
    }
    if (data.metier === 'Militaire') {
       const btn = document.createElement('button');
       btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "PROTOCOLE LÉTHAL";
       if (mobileState.hasUsedPower) jobUi.style.opacity = "0.3";
       btn.onclick = () => openTargetSelector('REQUEST_EXECUTION', "PROTOCOLE D'ÉLIMINATION");
       jobUi.appendChild(btn);
   }
   if (data.metier === 'Intendant') {
          const btn = document.createElement('button');
          btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "VERROUILLAGE SYSTÈME (CENSURE)";
          if (mobileState.hasUsedPower) jobUi.style.opacity = "0.3";
          btn.onclick = () => openTargetSelector('REQUEST_CENSURE', 'PROTOCOLE DE CENSURE');
          jobUi.appendChild(btn);
   }
   if (data.metier === 'Shérif') {
        const btn = document.createElement('button');
        btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "PASSIF: VOTE DOUBLE";
        btn.disabled = true; btn.style.opacity = "0.5"; btn.style.pointerEvents = "none";
        jobUi.appendChild(btn);
   }
   if (data.metier === 'Journaliste') {
        const btn = document.createElement('button');
        btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "PASSIF: IMMUNITÉ CENSURE";
        btn.disabled = true; btn.style.opacity = "0.5"; btn.style.pointerEvents = "none";
        jobUi.appendChild(btn);
   }
   if (data.metier === 'Fossoyeur') {
        const btn = document.createElement('button');
        btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "NÉCROLOGIE : +0 VOIX (0 MORT)";
        btn.disabled = true; btn.style.opacity = "0.5"; btn.style.pointerEvents = "none";
        jobUi.appendChild(btn);
   }
   if (data.metier === 'Archiviste') {
        const btn = document.createElement('button');
        btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "EXTRACTION DOSSIERS";
        if (mobileState.hasUsedPower) jobUi.style.opacity = "0.3";
        btn.onclick = () => {
            showArchivisteConfirmUI();
        };
        jobUi.appendChild(btn);
    }
    if (data.metier === 'Vigile') {
        const btn = document.createElement('button');
        btn.id = "btn-power"; btn.className = "btn-power"; btn.innerText = "RÉVOCATION ACCÈS SENTINELLE";
        if (mobileState.hasUsedPower) jobUi.style.opacity = "0.3";
        btn.onclick = () => openTargetSelector('REQUEST_VIGILE_BAN', 'CONTRÔLE DES ACCÈS');
        jobUi.appendChild(btn);
    }
}

export function showGardienUI(eligible) {
    const ui = document.getElementById('main-ui');
    ui.innerHTML = `<h3 style="color:#00e5ff; border-bottom:1px solid #00e5ff; padding-bottom:5px;">AUTORISATION GARDIEN</h3><p style="font-size:0.85em;">Sélectionnez le sujet Sentinelle :</p>`;
    
    const container = document.createElement('div');
    container.className = "theme-sentinelle";
    
    const controls = document.createElement('div');
    controls.className = "action-controls";
    
    const btnValidate = document.createElement('button');
    btnValidate.className = "btn-action validate";
    btnValidate.innerText = "VALIDER SUJET";
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
        ui.innerHTML = `<div style="margin-top:40px; color:#5c8a99; font-size:0.85em;">[ CRYPTAGE ET TRANSMISSION EN COURS... ]</div>`;
    };

    ui.appendChild(container);
}

export function showVoteUI(data) {
    const ui = document.getElementById('main-ui');
    ui.innerHTML = `<h3 style="color:#b2ebf2;">VOTE DU CONSEIL</h3>`;
    
    if (mobileState.myName === data.g) ui.innerHTML += `<p style="border:1px solid #ffea00; color:#ffea00; padding:4px; font-size:0.8em; border-radius:2px;">[ STATUT ACTUEL : GARDIEN ]</p>`;
    else if (mobileState.myName === data.s) ui.innerHTML += `<p style="border:1px solid #00e5ff; color:#00e5ff; padding:4px; font-size:0.8em; border-radius:2px;">[ STATUT ACTUEL : SENTINELLE ]</p>`;

    ui.innerHTML += `<p style="font-size:0.9em; margin:15px 0;">Validation des sujets :<br><b style="color:#fff; font-size:1.1em;">${data.g} & ${data.s}</b></p>`;
    
    const actionBox = document.createElement('div');
    actionBox.style.display = "flex"; actionBox.style.justifyContent = "center"; actionBox.style.gap = "10px";

    const btnOui = document.createElement('button');
    btnOui.className = "btn"; btnOui.style.borderColor = "#1de9b6"; btnOui.style.color = "#1de9b6"; btnOui.innerText = "APPROUVER";
    btnOui.onmousedown = () => { btnOui.style.background = "#1de9b6"; btnOui.style.color = "#000"; };
    btnOui.onclick = () => {
        showCleanUI('APPROUVÉ');
        mobileState.conn.send({ type: 'VOTE_DONE', choice: 'OUI', playerName: mobileState.myName });
    };

    const btnNon = document.createElement('button');
    btnNon.className = "btn"; btnNon.style.borderColor = "#ff1744"; btnNon.style.color = "#ff1744"; btnNon.innerText = "REJETER";
    btnNon.onmousedown = () => { btnNon.style.background = "#ff1744"; btnNon.style.color = "#000"; };
    btnNon.onclick = () => {
        showCleanUI('REJETÉ'); 
        mobileState.conn.send({ type: 'VOTE_DONE', choice: 'NON', playerName: mobileState.myName });
    };

    actionBox.appendChild(btnOui);
    actionBox.appendChild(btnNon);
    ui.appendChild(actionBox);
}

export function showLegislativeUI(role, cards) {
    const ui = document.getElementById('main-ui');
    mobileState.currentHand = cards;
    ui.innerHTML = `<h3 style="color:#00e5ff; border-bottom:1px dashed #00e5ff; padding-bottom:5px;">LÉGISLATION : ${role}</h3>`;
    
    let descAction = 'SÉLECTIONNEZ LE DOSSIER À PROMULGUER';
    if (role === 'PROPHÈTE') descAction = 'SÉLECTIONNEZ LE DOSSIER À ÉCARTER';
    else if (role === 'GARDIEN' || role === 'SENTINELLE (DÉFAUSSE)') descAction = 'SÉLECTIONNEZ LE DOSSIER À DÉFAUSSER';
    
    ui.innerHTML += `<p style="font-size:0.75em; color:#5c8a99;">[ ${descAction} ]</p>`;
    
    const controls = document.createElement('div');
    controls.className = "action-controls theme-power"; // Utilise le style de validation vert
    const btnValidate = document.createElement('button');
    btnValidate.className = "btn-action validate";
    
    btnValidate.innerText = (role === 'PROPHÈTE' || role === 'GARDIEN' || role === 'SENTINELLE (DÉFAUSSE)') ? "DÉFAUSSER LE DOSSIER" : "VALIDER LE DOSSIER";
    
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
            cardsElements.forEach(el => el.style.boxShadow = `inset 0 0 20px rgba(255,255,255,0.05)`);
            selectedCardId = cardId;
            selectedCardIndex = i;
            
            // Halo de sélection médical
            const glowColor = data.type === 'S' ? '#00e5ff' : (data.type === 'C' ? '#ff1744' : '#b0bec5');
            cardElement.style.boxShadow = `0 0 15px ${glowColor}, inset 0 0 10px ${glowColor}50`;
            
            btnValidate.classList.add('ready');
        };
        cardContainer.appendChild(cardElement);
    });
    
   btnValidate.onclick = () => {
        if (selectedCardId === null) return;
        
        if (role === 'PROPHÈTE') {
            let remaining = [...mobileState.currentHand];
            remaining.splice(selectedCardIndex, 1);
            mobileState.conn.send({ type: 'PROPHETE_DISCARD_DONE', discardedCardId: selectedCardId, remaining: remaining });
            ui.innerHTML = `<div style="margin-top:40px; color:#d500f9;">[ PROPHÉTIE CODÉE ET TRANSMISE ]</div>`;
            
        } else if (role === 'GARDIEN' || role === 'SENTINELLE (DÉFAUSSE)') {
            let remaining = [...mobileState.currentHand]; 
            remaining.splice(selectedCardIndex, 1);
            mobileState.conn.send({ type: 'DISCARD_DONE', discardedCardId: selectedCardId, remaining: remaining });
            ui.innerHTML = `<div style="margin-top:40px; color:#5c8a99;">[ TRANSFERT DES DOSSIERS RESTANTS ]</div>`;
            
        } else {
            mobileState.conn.send({ type: 'FINAL_CHOICE', card: selectedCardId });
            ui.innerHTML = `<div style="margin-top:40px; color:#5c8a99;">[ PROMULGATION EN COURS... ]</div>`;
        }
    };
    ui.appendChild(cardContainer);
}

export function openTargetSelector(actionType, title, isForced = false) {
    if (!isForced && mobileState.hasUsedPower) return alert("Action déjà effectuée.");
        
    const ui = document.getElementById('main-ui');
    ui.innerHTML = `<h3 style="color:#d500f9;">${title}</h3><p style="font-size:0.85em; color:#b2ebf2;">Sélectionnez le(s) sujet(s) :</p>`;

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
    btnValidate.className = "btn-action validate"; btnValidate.innerText = "EXÉCUTER";
    controls.appendChild(btnValidate);
    container.appendChild(controls);

    let selectedTargets = [];
    const isReorganisation = (actionType === 'REQUEST_REORGANISATION');
    const targetLimit = isReorganisation ? 2 : 1;

    const updateValidationButtonText = () => {
        btnValidate.innerText = isReorganisation ? `ÉCHANGER (${selectedTargets.length}/2)` : "EXÉCUTER PROCÉDURE";
    };
    updateValidationButtonText();

    if (actionType === 'REQUEST_PURGE') {
        const crisesActives = mobileState.serverState?.slotsCriseCards || [];
        if (crisesActives.length === 0) {
            ui.innerHTML += "<p style='color:#5c8a99;'>[ AUCUNE INFECTION SYSTÈME À PURGER ]</p>";
            btnValidate.innerText = "CLÔTURER"; btnValidate.classList.add('ready');
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

        if (actionType === 'REQUEST_LICENCIEMENT') {
            if (mobileState.serverState?.civilianNames?.includes(name)) return; 
        }
        
        const pIdx = mobileState.allPlayers.findIndex(plName => plName.toUpperCase() === name.toUpperCase());
        if (actionType === 'REQUEST_COUP_ETAT' && pIdx === mobileState.serverState?.propheteIdx) {
            return;
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

// --- RÉSULTATS CLINIQUES ---

export function showBloodResult(data) {
    const isSain = data.result === "SAIN";
    const cardColor = isSain ? "#1de9b6" : "#ff1744";
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 1px solid ${cardColor}; padding: 15px; border-radius: 4px; background: rgba(0,0,0,0.6); box-shadow: 0 0 15px ${cardColor}40;">
            <h3 style="color: ${cardColor}; margin-top: 0; font-size:1.1em; border-bottom:1px solid ${cardColor}50; padding-bottom:5px;">RAPPPORT DE LABORATOIRE</h3>
            <p style="color: #b2ebf2; margin: 15px 0; font-size:0.9em;">SUJET : <b style="color:#fff;">${data.target.toUpperCase()}</b></p>
            <p style="color: #b2ebf2; margin: 15px 0; font-size:0.9em;">ANALYSE : <b style="color: ${cardColor}; font-size: 1.3em; display:block; margin-top:5px; text-shadow: 0 0 5px ${cardColor};">[ ${data.result} ]</b></p>
            <button class="btn" id="btn-ok" style="margin-top: 15px; width: 60%; border-color:${cardColor}; color:${cardColor};">CLÔTURER DOSSIER</button>
        </div>`;
    document.getElementById('btn-ok').onclick = () => mobileState.conn.send({ type: data.isForced ? 'ACTION_CONFIRMED' : 'SYNC_REQUEST' });
}

export function showExecutionResult(data) {
    const isSain = data.result === "SAIN";
    const cardColor = isSain ? "#1de9b6" : "#ff1744";
    document.getElementById('main-ui').innerHTML = `
        <div class="corrupted-panel" style="padding: 15px; border-radius: 4px;">
            <h3 style="margin-top: 0; border-bottom:1px solid #ff1744; padding-bottom:5px;">CERTIFICAT DE DÉCÈS</h3>
            <p style="margin: 15px 0; font-size:0.9em; color:#fff;">SUJET ÉLIMINÉ : <b>${data.target.toUpperCase()}</b></p>
            <p style="margin: 15px 0; font-size:0.9em;">AUTOPSIE : <b style="color: ${cardColor}; font-size: 1.2em; display:block; margin-top:5px;">[ ${data.result} ]</b></p>
            <button class="btn" id="btn-ok" style="margin-top: 15px; width: 60%; border-color:#ff1744; color:#ff1744;">CONFIRMER DÉCÈS</button>
        </div>`;
    document.getElementById('btn-ok').onclick = () => mobileState.conn.send({ type: data.isForced ? 'ACTION_CONFIRMED' : 'SYNC_REQUEST' });
}

export function showCensureResult(data) {
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 1px solid #b0bec5; padding: 15px; border-radius: 4px; background: rgba(176, 190, 197, 0.1);">
            <h3 style="color: #b0bec5; margin-top: 0;">SYSTÈME VERROUILLÉ</h3>
            <p style="color: #b2ebf2; font-size:0.85em;">Accès au vote révoqué pour :</p>
            <p style="color: #fff; font-weight:bold; font-size:1.1em;">${data.target.toUpperCase()}</p>
            <button class="btn" id="btn-ok" style="margin-top: 15px; width: 60%; border-color:#b0bec5; color:#b0bec5;">OK</button>
        </div>`;
    document.getElementById('btn-ok').onclick = () => mobileState.conn.send({ type: data.isForced ? 'ACTION_CONFIRMED' : 'SYNC_REQUEST' });
}

export function showCoupEtatResult(data) {
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 1px solid #ffea00; padding: 15px; border-radius: 4px; background: rgba(255, 234, 0, 0.1); box-shadow: 0 0 15px rgba(255, 234, 0, 0.3);">
            <h3 style="color: #ffea00; margin-top: 0;">ORDRE EXTRAORDINAIRE</h3>
            <p style="color: #b2ebf2; font-size:0.85em;">Passation de pouvoir forcée vers :</p>
            <p style="color: #fff; font-weight:bold; font-size:1.2em;">${data.target.toUpperCase()}</p>
            <button class="btn" id="btn-ok" style="margin-top: 15px; width: 60%; border-color:#ffea00; color:#ffea00;">CONFIRMER</button>
        </div>`;
    document.getElementById('btn-ok').onclick = () => mobileState.conn.send({ type: data.isForced ? 'ACTION_CONFIRMED' : 'SYNC_REQUEST' });
}

export function showEndGame(data) {
    const isWin = data.personalResult === "MISSION RÉUSSIE";
    const color = isWin ? "#1de9b6" : "#ff1744";
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 1px solid ${color}; padding: 20px; border-radius: 4px; background: rgba(0,0,0,0.8); box-shadow: 0 0 20px ${color}40;">
            <h2 style="color:${color}; text-shadow: 0 0 10px ${color};">${data.personalResult}</h2>
            <p style="color:#fff; font-size:0.9em;">Victoire du camp : <b style="color:${color};">${data.team}</b></p>
            <p style="font-size:0.75em; color:#5c8a99; margin-top:15px;">[ ${data.reason} ]</p>
        </div>`;
}

export function showView493(cards, decisionMaker) {
    const cardContainer = document.createElement('div');
    cardContainer.className = "legislative-container";

    cards.forEach(cardId => {
        const data = DECREETS_DB_LOCAL[cardId];
        if (!data) return;

        const cardElement = document.createElement('div');
        cardElement.className = `decree-card card-type-${data.type}`;
        cardElement.style.opacity = "0.7"; cardElement.style.cursor = "not-allowed";
        
        let typeText = data.type === 'S' ? "SURVIE" : (data.type === 'C' ? "CRISE" : "SUFFRAGE");

        cardElement.innerHTML = `
            <div class="card-header card-header-${data.type}"><span>${typeText}</span><span>${data.symbol}</span></div>
            <div class="card-title">${data.name}</div>
            <div class="card-desc">${data.desc}</div>
        `;
        cardContainer.appendChild(cardElement);
    });

    const ui = document.getElementById('main-ui');
    ui.innerHTML = `<h3 style="color:#b0bec5; font-size:1em;">VISUEL DOSSIERS (49.3)</h3><p style="font-size:0.75em; color:#ffea00; font-weight:bold;">[ EN ATTENTE CHOIX DE ${decisionMaker} ]</p>`;
    ui.appendChild(cardContainer);
}

export function showPurgeResult(data) {
    const cardName = DECREETS_DB_LOCAL[data.cardId]?.name || data.cardId;
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 1px solid #1de9b6; padding: 15px; border-radius: 4px; background: rgba(29, 233, 182, 0.1);">
            <h3 style="color: #1de9b6; margin-top: 0;">PURGE COMPLÈTE</h3>
            <p style="color: #b2ebf2; font-size:0.85em;">Infection supprimée du système :</p>
            <p style="color: #fff; font-weight:bold;">${cardName.toUpperCase()}</p>
            <button class="btn" id="btn-ok" style="margin-top: 15px; width: 60%; border-color:#1de9b6; color:#1de9b6;">OK</button>
        </div>`;
    document.getElementById('btn-ok').onclick = () => mobileState.conn.send({ type: data.isForced ? 'ACTION_CONFIRMED' : 'SYNC_REQUEST' });
}

export function showReorganisationResult(data) {
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 1px solid #00e5ff; padding: 15px; border-radius: 4px; background: rgba(0, 229, 255, 0.1);">
            <h3 style="color: #00e5ff; margin-top: 0;">ÉCHANGE RÉUSSI</h3>
            <p style="color: #b2ebf2; font-size:0.85em;">Dossiers permutés :</p>
            <p style="color: #fff; font-weight:bold;">${data.targetA.toUpperCase()} ⇄ ${data.targetB.toUpperCase()}</p>
            <button class="btn" id="btn-ok" style="margin-top: 15px; width: 60%; border-color:#00e5ff; color:#00e5ff;">OK</button>
        </div>`;
    document.getElementById('btn-ok').onclick = () => mobileState.conn.send({ type: data.isForced ? 'ACTION_CONFIRMED' : 'SYNC_REQUEST' });
}

export function showBloodSwappedAlert(data) {
    const bColor = data.newBlood === "SAIN" ? "#1de9b6" : "#ff1744";
    document.getElementById('blood-status').innerHTML = `ANALYSE BIOLOGIQUE : <span style="color: ${bColor}">${data.newBlood}</span>`;
    document.getElementById('blood-status').style.borderColor = bColor;
    
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 1px solid #00e5ff; padding: 20px; border-radius: 4px; background: rgba(0, 229, 255, 0.1); box-shadow: 0 0 20px rgba(0,229,255,0.2);">
            <h3 style="color: #00e5ff;">AVIS DE MODIFICATION</h3>
            <p style="color: #b2ebf2; font-size:0.85em;">Le Gardien a réassigné votre dossier avec celui de : <b style="color: #fff;">${data.withPlayer.toUpperCase()}</b></p>
            <p style="font-size: 0.9em; margin-top: 15px; color: #5c8a99;">NOUVELLE ANALYSE : <b style="color: ${bColor}; font-size:1.1em;">[ ${data.newBlood} ]</b></p>
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
    
    document.getElementById('role-display').innerText = "RÔLE :    ";
    document.getElementById('role-display').style.color = "#00e5ff";
    document.getElementById('role-display').parentElement.style.borderColor = "#00e5ff";
    document.getElementById('role-display').parentElement.style.boxShadow = "none";
    document.getElementById('metier-display').innerText = "MÉTIER :    ";

    ui.innerHTML = `
        <div style="margin-top: 50px;">
            <h3 style="color: #ffea00;">RÉINITIALISATION</h3>
            <p style="font-size:0.8em; color:#b2ebf2;">Moniteur en attente de données patient.</p>
            <div class="loader"></div>
        </div>`;
}

export function showWaitSentinelleUI(gardienName) {
    document.getElementById('main-ui').innerHTML = `
        <div style="margin-top: 40px;">
            <h3 style="color: #ffea00;">SÉLECTION SENTINELLE</h3>
            <p style="color: #b2ebf2; font-size:0.85em;">Patient d'autorisation du Gardien <b style="color:#fff;">${gardienName}</b>.</p>
            <div class="loader" style="border-top-color:#ffea00;"></div>
        </div>`;
}

export function showWaitLegislationUI(step) {
    document.getElementById('main-ui').innerHTML = `
        <div style="margin-top: 40px;">
            <h3 style="color: #00e5ff;">EXAMEN DES DOSSIERS</h3>
            <p style="color: #b2ebf2; font-size:0.85em;">Responsable actif : <b style="color:#fff;">${step}</b>.</p>
            <div class="loader"></div>
        </div>`;
}

export function showWaitPowerUI(gardienName, title) {
    document.getElementById('main-ui').innerHTML = `
        <div style="margin-top: 40px;">
            <h3 style="color: #d500f9;">PROTOCOLE SPÉCIAL</h3>
            <p style="color: #b2ebf2; font-size:0.85em;">Le Gardien <b style="color:#fff;">${gardienName}</b> exécute :</p>
            <p style="color: #d500f9; font-weight: bold; font-size: 1em;">[ ${title} ]</p>
            <div class="loader" style="border-top-color:#d500f9;"></div>
        </div>`;
}

export function showDeadUI(reveal) {
    const colReveal = reveal === "INFECTÉ" ? "#ff1744" : "#1de9b6";
    document.getElementById('main-ui').innerHTML = `
        <div class="corrupted-panel" style="padding:20px; border-radius:4px; margin-top:20px;">
            <h2 style="margin:0;">DÉCÈS ENREGISTRÉ</h2>
            <p style="font-size:0.85em; color:#fff; margin-top:15px;">AUTOPSIE : <b style="color: ${colReveal}">[ ${reveal} ]</b></p>
            <p style="font-size:0.75em; opacity: 0.6; margin-top:20px;">Fonctions du terminal désactivées.</p>
        </div>
    `;
    document.getElementById('job-ui').innerHTML = "";
}

export function showCensoredAlertUI(byPlayer) {
    document.getElementById('main-ui').innerHTML = `
        <div class="corrupted-panel" style="padding:20px; border-radius:4px;">
             <h3 style="margin:0;">ACCÈS RÉVOQUÉ</h3>
             <p style="font-size:0.85em; color:#fff; margin-top:15px;">Droits de vote suspendus par <b>${byPlayer}</b>.</p>
        </div>`;
}

export function showCleanUI(choix) {
    const colorChoix = choix === 'APPROUVÉ' ? '#1de9b6' : '#ff1744';
    document.getElementById('main-ui').innerHTML = `
        <div style="margin-top: 40px;">
            <h3 style="color: #b0bec5;">DÉCISION ENREGISTRÉE</h3>
            <div style="margin: 20px auto; padding: 10px; border: 1px solid ${colorChoix}; color:${colorChoix}; font-weight:bold; width:60%; box-shadow: 0 0 10px ${colorChoix}30;">
                [ ${choix} ]
            </div>
            <div class="loader" style="border-top-color:#b0bec5; width:20px; height:20px; border-width:1px;"></div>
        </div>`;
}

export function showWaitPropheteVoteUI(gardienName, sentinelleName) {
    document.getElementById('main-ui').innerHTML = `
        <div style="margin-top: 40px; border: 1px solid #d500f9; padding: 20px; border-radius: 4px; box-shadow: inset 0 0 20px rgba(213,0,249,0.1);">
            <h3 style="color: #d500f9;">VOIX DIVINE</h3>
            <p style="color: #b2ebf2; font-size: 0.85em;">Vos adeptes se prononcent sur :</p>
            <p style="color: #fff; font-weight: bold; font-size: 1em;">
                ${gardienName} & ${sentinelleName}
            </p>
            <div class="loader" style="border-top-color:#d500f9;"></div>
        </div>`;
}

export function showTalionUI() {
    document.getElementById('main-ui').innerHTML = `
        <div class="corrupted-panel" style="padding:20px; border-radius:4px;">
             <h3 style="margin:0;">SANCTION SYSTÈME</h3>
             <p style="font-size:0.85em; color:#fff; margin-top:15px;">Échec gouvernemental détecté. Droits de vote gelés.</p>
        </div>`;
    document.getElementById('job-ui').innerHTML = ""; 
}

export function showLicenciementResult(data) {
    document.getElementById('main-ui').innerHTML = `
        <div style="border: 1px solid #ffea00; padding: 15px; border-radius: 4px; background: rgba(255, 234, 0, 0.1);">
            <h3 style="color: #ffea00; margin-top: 0;">ACCRÉDITATIONS RÉVOQUÉES</h3>
            <p style="color: #b2ebf2; font-size:0.85em;">Cible rétrogradée en Civil :</p>
            <p style="color: #fff; font-weight:bold; font-size:1.1em;">${data.target.toUpperCase()}</p>
            <button class="btn" id="btn-ok" style="margin-top: 15px; width: 60%; border-color:#ffea00; color:#ffea00;">OK</button>
        </div>`;
    document.getElementById('btn-ok').onclick = () => mobileState.conn.send({ type: data.isForced ? 'ACTION_CONFIRMED' : 'SYNC_REQUEST' });
}

export function showLicenciementAlert() {
    const metierEl = document.getElementById('metier-display');
    if (metierEl) metierEl.innerText = "MÉTIER : CIVIL";
    
    const jobZone = document.getElementById('job-ui');
    if (jobZone) {
        jobZone.innerHTML = "<p style='color:#ffea00; border: 1px dashed #ffea00; padding: 10px; font-size: 0.8em;'>[ FONCTIONS BLOQUÉES ]</p>";
        jobZone.style.opacity = "1";
    }

    document.getElementById('main-ui').innerHTML = `
        <div style="border: 1px solid #ffea00; padding: 20px; border-radius: 4px; background: rgba(255, 234, 0, 0.1); margin-top:15px;">
             <h3 style="color: #ffea00; margin:0;">RÉTROGRADATION</h3>
             <p style="font-size:0.85em; color:#b2ebf2; margin-top:15px;">Vos accès métier ont été supprimés du registre par le Gardien.</p>
        </div>`;
}

export function showLobbyWaitingUI() {
    const ui = document.getElementById('main-ui');
    ui.innerHTML = `
        <div style="margin-top: 40px; border: 1px solid #00e5ff; padding: 20px; border-radius: 4px; box-shadow: inset 0 0 15px rgba(0, 229, 255, 0.05);">
            <h3 style="color: #00e5ff;">CONNEXION ÉTABLIE</h3>
            <p style="color: #b2ebf2; font-size: 0.85em;">En attente des données médicales centrales.</p>
            <div class="loader"></div>
        </div>`;
}

export function showArchivisteConfirmUI() {
    const ui = document.getElementById('main-ui');
    
    // On efface le contenu actuel pour afficher la demande de confirmation
    ui.innerHTML = `
        <h3 style="color:#d500f9;">PROTOCOLE D'EXTRACTION</h3>
        <p style="font-size:0.85em; color:#b2ebf2; margin-bottom: 20px;">
            Voulez-vous vraiment forcer le Gardien à piocher 4 dossiers lors du prochain vote approuvé ?<br><br>
            <i style="color:#5c8a99;">(Cette action est à usage unique)</i>
        </p>
    `;

    const container = document.createElement('div');
    container.className = "theme-power";

    const controls = document.createElement('div');
    controls.className = "action-controls";

    // Bouton ANNULER (Rouge)
    const btnCancel = document.createElement('button');
    btnCancel.className = "btn-action cancel";
    btnCancel.innerText = "ANNULER";
    btnCancel.onclick = () => {
        // En demandant un SYNC, le serveur va rafraîchir l'écran et remettre l'interface normale
        mobileState.conn.send({ type: 'SYNC_REQUEST' });
    };

    // Bouton CONFIRMER (Vert/Cyan médical)
    const btnValidate = document.createElement('button');
    btnValidate.className = "btn-action validate ready"; // Le 'ready' force l'opacité et la couleur cliquable
    btnValidate.innerText = "CONFIRMER";
    btnValidate.onclick = () => {
        const btnPower = document.getElementById('btn-power');
        if (btnPower) {
            btnPower.disabled = true;
            btnPower.style.opacity = "0.3";
            btnPower.style.pointerEvents = "none";
            btnPower.innerText = "📜 PROTOCOLE ENCLENCHÉ...";
        }
        mobileState.hasUsedPower = true;
        mobileState.conn.send({ type: 'USE_ARCHIVISTE_POWER' });
        
        ui.innerHTML = "<div style='margin-top:40px; color:#5c8a99;'>[ TRANSMISSION EN COURS... ]</div>";
    };

    controls.appendChild(btnCancel);
    controls.appendChild(btnValidate);
    container.appendChild(controls);
    ui.appendChild(container);
    
    // Petit flash violet pour le côté "Terminal corrompu/spécial"
    document.body.style.backgroundColor = "#1a001a";
    setTimeout(() => { document.body.style.backgroundColor = "#03080c"; }, 300);
}
