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
