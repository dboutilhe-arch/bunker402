// js/network/mobile-handler.js

import { 
    updateMiniBoard, setupIdentity, showGardienUI, showVoteUI, 
    showLegislativeUI, openTargetSelector, showBloodResult, 
    showExecutionResult, showCensureResult, showCoupEtatResult, 
    showEndGame, resetAffichageJ, showView493, 
    showPurgeResult, showReorganisationResult, showBloodSwappedAlert,
    showWaitSentinelleUI, showWaitLegislationUI, showWaitPowerUI, 
    showDeadUI, showCensoredAlertUI, showCleanUI, showWaitPropheteVoteUI, showTalionUI,
    showLicenciementResult, showLicenciementAlert, showLobbyWaitingUI, showArchivisteConfirmUI
} from '../ui/mobile-render.js';

// Conteneur d'état dynamique partagé par référence entre les modules
export let mobileState = {
    peer: new Peer({ config: {'iceServers': [{ url: 'stun:stun.l.google.com:19302' }]} }),
    conn: null,
    myName: "",
    currentHand: [],
    allPlayers: [],
    hasUsedPower: false,
    serverState: {},
    hasVoted: false,
};

// Récupère le paramètre 'code' dans l'URL si on vient d'un scan de QR Code
const urlParams = new URLSearchParams(window.location.search);
const roomCodeFromUrl = urlParams.get('code');

if (roomCodeFromUrl) {
    // Remplace 'input-code' par le vrai ID de l'input où le joueur tape le code de la partie
    const codeInput = document.getElementById('input-code'); 
    if (codeInput) {
        codeInput.value = roomCodeFromUrl;
    }
}

// --- INITIALISATION AU CHARGEMENT ---
document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connect-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', () => connect());
    }
    if (sessionStorage.getItem('bunker_name')) {
        connect(true);
    }
});

// --- CONNEXION ET RÉSEAU ---
function connect(isReconnect = false) {
    let nameInput = isReconnect ? sessionStorage.getItem('bunker_name') : document.getElementById('p-name').value.trim();
    let codeInput = isReconnect ? sessionStorage.getItem('bunker_code') : document.getElementById('r-code').value.trim();

    if (!nameInput || !codeInput) return;

    nameInput = nameInput.toUpperCase();
    const validPattern = /^[a-zA-Z0-9àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ\-_ ]+$/;
    
    if (!validPattern.test(nameInput)) {
        alert("Pseudo invalide ! Uniquement des lettres, chiffres, espaces, '-' ou '_'.");
        return;
    }
    if (nameInput.length < 2) {
        alert("Le pseudo doit contenir au moins 2 caractères.");
        return;
    }

    mobileState.myName = nameInput;
    mobileState.conn = mobileState.peer.connect(codeInput);

    mobileState.conn.on('open', () => {
        sessionStorage.setItem('bunker_name', mobileState.myName);
        sessionStorage.setItem('bunker_code', codeInput);
        
        mobileState.conn.send({ type: 'JOIN', name: mobileState.myName, reconnect: isReconnect });
        
        document.getElementById('setup').classList.add('hidden');
        document.getElementById('game').classList.remove('hidden');
        document.getElementById('display-name').innerText = mobileState.myName.toUpperCase();

        showLobbyWaitingUI();
    });

    mobileState.conn.on('data', handleData);
}

// --- GESTIONNAIRE DE MESSAGES (DATA HANDLER) ---
function handleData(data) {
    // Sécurité affichage écrans de transition
    if (data.type === 'CONNECTED' || data.type === 'INIT') {
        document.getElementById('setup').classList.add('hidden');
        document.getElementById('game').classList.remove('hidden');
    }

    switch (data.type) {
        case 'INIT':
            mobileState.allPlayers = data.all;
            mobileState.hasUsedPower = data.powerUsed || false;
            setupIdentity(data);
            break;

        case 'SYNC_STATE':
            handleSyncStateAction(data.state);
            break;

        case 'YOUR_TURN':
            showGardienUI(data.eligible);
            break;

        case 'VOTE_START':
            mobileState.hasVoted = false;
            showVoteUI(data);
            break;

        case 'WAIT_SENTINELLE':
            showWaitSentinelleUI(data.gardienName);
            break;

        case 'WAIT_LEGISLATION':
            showWaitLegislationUI(data.step);
            break;

        case 'WAIT_POWER':
            showWaitPowerUI(data.gardienName, data.title);
            break;

        case 'WAIT_PROPHETE_VOTE':
            showWaitPropheteVoteUI(data.g, data.s);
            break;

        case 'GARDIEN_PICK':
            showLegislativeUI("GARDIEN", data.cards);
            break;

        case 'SENTINELLE_PICK':
            showLegislativeUI("SENTINELLE", data.cards);
            break;

        case 'PROPHETE_PICK':
            showLegislativeUI("PROPHÈTE", data.cards);
            break;

        case 'SENTINELLE_DISCARD_PICK':
            showLegislativeUI("SENTINELLE (DÉFAUSSE)", data.cards);
            break;
            
        case 'GARDIEN_ENACT_PICK':
            showLegislativeUI("GARDIEN (PROMULGATION)", data.cards);
            break;
            
        case 'SENTINELLE_493_PICK':
            showLegislativeUI("SENTINELLE (49.3 - CHOIX FINAL)", data.cards);
            break;
            
        case 'GARDIEN_493_VIEW':
            showView493(data.cards, "SENTINELLE"); 
            break;
            
        case 'SENTINELLE_493_VIEW':
            showView493(data.cards, "GARDIEN"); 
            break;

        case 'BLOOD_TEST_RESULT':
            showBloodResult(data);
            break;

        case 'EXECUTION_RESULT':
            showExecutionResult(data);
            break;

        case 'CENSURE_RESULT':
            showCensureResult(data);
            break;

        case 'PURGE_RESULT':
            showPurgeResult(data);
            break;

        case 'COUP_ETAT_RESULT':
            showCoupEtatResult(data);
            break;
        
        case 'YOU_ARE_DEAD':
            showDeadUI(data.reveal);
            break;
        
        case 'CENSORED_ALERT':
            showCensoredAlertUI(data.by);
            break;

        case 'TALION_ALERT':
            showTalionUI();
            break;

        case 'FORCE_POWER_SELECT':
            const jobBtn = document.getElementById('btn-power');
            if (jobBtn) {
                jobBtn.disabled = true; jobBtn.style.opacity = "0.3"; jobBtn.style.pointerEvents = "none";
            }
            openTargetSelector(data.action, data.title, true);
            document.body.style.backgroundColor = "#1a0000";
            setTimeout(() => { document.body.style.backgroundColor = "#000"; }, 500);
            break;

        case 'POWER_ACTIVATED_CONFIRM':
            mobileState.hasUsedPower = true;
            const archivistBtn = document.getElementById('btn-power');
            if (archivistBtn) {
                archivistBtn.disabled = true; archivistBtn.style.opacity = "0.3"; archivistBtn.style.pointerEvents = "none";
                archivistBtn.innerText = "📜 PROTOCOLE ENCLENCHÉ";
            }
            break;

        case 'CLEAN_UI':
            showCleanUI(data.choice);
            break;
        
        case 'REFRESH_INTERFACE':
            mobileState.conn.send({ type: 'SYNC_REQUEST' }); 
            break;

        case 'END_GAME':
            showEndGame(data);
            break;

        case 'RESET_TO_LOBBY':
            resetAffichageJ();
            break;

        case 'GARDIEN_493_PICK':
            showLegislativeUI("GARDIEN (49.3 - CHOIX FINAL)", data.cards);
            break;

        case 'REORGANISATION_RESULT':
            showReorganisationResult(data);
            break;

        case 'BLOOD_SWAPPED_ALERT':
            showBloodSwappedAlert(data);
            break;

        case 'LICENCIEMENT_RESULT':
            showLicenciementResult(data);
            break;
        case 'LICENCIEMENT_ALERT':
            showLicenciementAlert();
            break;
    }
}

// --- CENTRALISATION DE LA SYNCHRONISATION DE L'ÉTAT ---
function handleSyncStateAction(stateData) {
    mobileState.serverState = stateData;
    updateMiniBoard(stateData);
    
    const ui = document.getElementById('main-ui');
    if (ui && ui.innerText.includes("VOUS ÊTES MORT")) return;

    const metierText = document.getElementById('metier-display')?.innerText || "";
    const isVigile = metierText.includes("Vigile");
    const isFossoyeur = metierText.includes("Fossoyeur");
    const isArchiviste = metierText.includes("Archiviste");
    const btn = document.getElementById('btn-power');

    if (btn) {
        if (isVigile) {
            if (!mobileState.hasUsedPower && stateData.currentPhase === "DÉSIGNATION") {
                btn.disabled = false; btn.style.opacity = "1"; btn.style.pointerEvents = "auto";
            } else {
                btn.disabled = true; btn.style.opacity = "0.3"; btn.style.pointerEvents = "none";
            }
        } 
        else if (isFossoyeur) {
            const deadCount = stateData.deadCount || 0;
            btn.innerText = `NÉCROLOGIE : +${deadCount} VOIX (${deadCount} CADAVRE${deadCount > 1 ? 'S' : ''})`;
        }
        else if (!isArchiviste) { 
            if (!mobileState.hasUsedPower && !stateData.currentPowerActive) {
                btn.disabled = false; btn.style.opacity = "1"; btn.style.pointerEvents = "auto";
            } else {
                btn.disabled = true; btn.style.opacity = "0.3"; btn.style.pointerEvents = "none";
            }
        }
    }

    if (isArchiviste) {
        const jobZone = document.getElementById('job-ui');
        if (jobZone) {
            jobZone.innerHTML = ""; 
    
            const btnPower = document.createElement('button');
            btnPower.id = "btn-power"; btnPower.className = "btn-power";
            btnPower.innerText = mobileState.hasUsedPower ? "📜 PROTOCOLE ENCLENCHÉ" : "📜 ARCHIVER LE PROCHAIN VOTE";
            
            if (mobileState.hasUsedPower || stateData.currentPhase.startsWith("LÉGISLATION")) {
                btnPower.disabled = true; btnPower.style.opacity = "0.3"; btnPower.style.pointerEvents = "none";
            }
    
            btnPower.onclick = () => {
                showArchivisteConfirmUI();
            };
            jobZone.appendChild(btnPower);
        }
    }
}

// UTITLITAIRE D'ÉMISSION
export function sendPowerAction(actionType, extraData, isForced) {
    if (!isForced) {
        mobileState.hasUsedPower = true;
        const jobUi = document.getElementById('job-ui');
        if (jobUi) jobUi.style.opacity = "0.3";
    }
    mobileState.conn.send({ type: actionType, isForced: isForced, ...extraData });
    document.getElementById('main-ui').innerHTML = "Traitement du protocole...";
}
