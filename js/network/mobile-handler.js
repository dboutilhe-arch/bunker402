// js/network/mobile-handler.js

import { 
    updateMiniBoard, setupIdentity, showGardienUI, showVoteUI, 
    showLegislativeUI, openTargetSelector, showBloodResult, 
    showExecutionResult, showCensureResult, showCoupEtatResult, 
    showEndGame, resetAffichageJ, showSentinelle493View, 
    showPurgeResult, showReorganisationResult, showBloodSwappedAlert 
} from '../ui/mobile-render.js';

// Conteneur d'état dynamique partagé par référence entre les modules
export let mobileState = {
    peer: new Peer({ config: {'iceServers': [{ url: 'stun:stun.l.google.com:19302' }]} }),
    conn: null,
    myName: "",
    currentHand: [],
    allPlayers: [],
    hasUsedPower: false,
    serverState: {}
};

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
    });

    mobileState.conn.on('data', handleData);
}

// --- GESTIONNAIRE DE MESSAGES (DATA HANDLER) ---
function handleData(data) {
    const ui = document.getElementById('main-ui');

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
            showVoteUI(data);
            break;

        case 'WAIT_SENTINELLE':
            ui.innerHTML = `
                <div style="margin-top: 40px;">
                    <h2 style="color: #f1c40f; text-transform: uppercase;">FORMATION DU CONSEIL</h2>
                    <p style="color: #e0e0e0;">Le Gardien <b>${data.gardienName}</b> choisit sa Sentinelle...</p>
                    <div class="loader" style="margin: 30px auto; border: 4px solid #111; border-top: 4px solid #f1c40f; border-radius: 50%; width: 35px; height: 35px; animation: spin 1s linear infinite;"></div>
                    <p style="font-size: 0.8em; color: #666; letter-spacing: 1px;">[ANALYSE DES ACCÈS RÉSEAU EN COURS]</p>
                </div>`;
            break;

        case 'WAIT_LEGISLATION':
            ui.innerHTML = `
                <div style="margin-top: 40px;">
                    <h2 style="color: #3498db; text-transform: uppercase;">SESSION LÉGISLATIVE</h2>
                    <p style="color: #e0e0e0;">Le Conseil applique les protocoles secrets (Aiguillage : <b>${data.step}</b>)...</p>
                    <div class="loader" style="margin: 30px auto; border: 4px solid #111; border-top: 4px solid #3498db; border-radius: 50%; width: 35px; height: 35px; animation: spin 1.5s linear infinite;"></div>
                    <p style="font-size: 0.8em; color: #666; letter-spacing: 1px;">[CHIFFREMENT DES DÉCRETS DE SÉCURITÉ]</p>
                </div>`;
            break;

        case 'WAIT_POWER':
            ui.innerHTML = `
                <div style="margin-top: 40px; ">
                    <h2 style="color: #ff00ff; text-transform: uppercase; letter-spacing: 1px;">PROTOCOLE INTERACTIF</h2>
                    <p style="color: #e0e0e0; font-size: 0.9em;">Le Gardien <b>${data.gardienName}</b> applique le décret :</p>
                    <p style="color: #ff00ff; font-weight: bold; font-size: 1.1em; text-transform: uppercase;">[ ${data.title} ]</p>
                    <div class="loader" style="margin: 30px auto; border: 4px solid #111; border-top: 4px solid #ff00ff; border-radius: 50%; width: 35px; height: 35px; animation: spin 1.2s linear infinite; box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);"></div>
                    <p style="font-size: 0.75em; color: #555; letter-spacing: 1px;">[SÉCURISATION DES TERMINAUX DISTANTS EN COURS]</p>
                </div>`;
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
            const colReveal = data.reveal === "INFECTÉ" ? "#e74c3c" : "#2ecc71";
            document.getElementById('main-ui').innerHTML = `
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
                </div>`;
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
            ui.innerHTML = `
                <div style="margin-top: 40px;">
                    <h2 style="color: #2ecc71; text-transform: uppercase;">TRANSMISSION REÇUE</h2>
                    <p style="color: #e0e0e0;">Votre vote a été enregistré par la console centrale.</p>
                    <div class="loader" style="margin: 30px auto; border: 4px solid #111; border-top: 4px solid #2ecc71; border-radius: 50%; width: 35px; height: 35px; animation: spin 2s linear infinite;"></div>
                    <p style="font-size: 0.8em; color: #666; letter-spacing: 1px;">[SYNCHRONISATION TERMINAL EN ATTENTE DU SCRUTIN]</p>
                </div>`;
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

        case 'SENTINELLE_493_VIEW':
            showSentinelle493View(data.cards);
            break;

        case 'REORGANISATION_RESULT':
            showReorganisationResult(data);
            break;

        case 'BLOOD_SWAPPED_ALERT':
            showBloodSwappedAlert(data);
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
                if (!confirm("Forcer le Gardien à piocher 4 cartes lors du prochain vote valide ?")) return;
                btnPower.disabled = true; btnPower.style.opacity = "0.3"; btnPower.style.pointerEvents = "none";
                btnPower.innerText = "📜 PROTOCOLE ENCLENCHÉ...";
                mobileState.hasUsedPower = true;
                mobileState.conn.send({ type: 'USE_ARCHIVISTE_POWER' });
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
