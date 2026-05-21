import { startServer } from './network/peer-manager.js'; 
import { initGame, globalReset } from './game/engine.js';

// Fonction exportée pour générer le QR Code dynamiquement
export function generateLobbyQR(lobbyCode) {
    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = ""; // Nettoyage

    // Construction de l'URL de connexion (adapté à ton structure)
    const baseUrl = window.location.href.split('?')[0].replace('index.html', '').replace(/\/$/, "");
    const joinUrl = `${baseUrl}/joueur.html?code=${lobbyCode}`;

    // Génération via la bibliothèque qrcode.min.js chargée dans index.html
    new QRCode(qrContainer, {
        text: joinUrl,
        width: 160,
        height: 160,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Bouton Créer Serveur
    const startServerBtn = document.getElementById('start-server-btn');
    if (startServerBtn) {
        startServerBtn.addEventListener('click', startServer);
    }

    // Bouton Lancer Partie
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', initGame);
    }

    // Boutons Reset
    const adminReset = document.getElementById('admin-reset');
    const endReset = document.getElementById('end-reset-btn');
    
    [adminReset, endReset].forEach(btn => {
        if (btn) btn.addEventListener('click', globalReset);
    });
});
