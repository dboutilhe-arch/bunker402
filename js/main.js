import { startServer } from './network/peer-manager.js'; 
import { initGame, globalReset } from './game/engine.js';

// Écouteurs d'événements (remplacent les onclick="")
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

    // Boutons Reset (Admin et Fin de partie)
    const adminReset = document.getElementById('admin-reset');
    const endReset = document.getElementById('end-reset-btn');
    
    [adminReset, endReset].forEach(btn => {
        if (btn) btn.addEventListener('click', globalReset);
    });
});

// Génération du QR Code
const qrContainer = document.getElementById("qrcode");
qrContainer.innerHTML = ""; // On nettoie au cas où il y en a déjà un

// On fabrique l'URL vers le téléphone en remplaçant index.html par joueur.html et en passant le code en paramètre
const baseUrl = window.location.href.split('?')[0].replace('index.html', '').replace(/\/$/, "");
const joinUrl = `${baseUrl}/joueur.html?code=${lobbyCode}`;

// On dessine le QR Code
new QRCode(qrContainer, {
    text: joinUrl,
    width: 160,
    height: 160,
    colorDark: "#000000", // Noir pour un bon contraste de scan
    colorLight: "#ffffff", // Blanc pour un bon contraste de scan
    correctLevel: QRCode.CorrectLevel.M // Tolérance moyenne aux erreurs de scan
});
