// renderer.js
// Dessin des plateaux & Mise à jour du DOM de la console centrale

import { gameState, players, curG, curSIdx, votes } from '../core/state.js';

export function render() {
    // Mise à jour de l'oxygène
    const oxyBar = document.getElementById('oxy-level');
    if (oxyBar) {
        oxyBar.style.width = (gameState.oxy / 3 * 100) + "%";
        oxyBar.className = (gameState.oxy <= 1) ? "critical" : "";
    }
    
    // Mise à jour des plateaux de décrets
    renderSlots('slots-s', 5, gameState.survie, 'filled-s');
    renderSlots('slots-c', 6, gameState.crise, 'filled-c');
    
    const suffrageSlot = document.getElementById('slots-f');
    if (suffrageSlot) {
        suffrageSlot.innerHTML = `<div class="slot ${gameState.suffrage !== "Aucun" ? 'filled-f' : ''}"></div>`;
    }
}

function renderSlots(containerId, total, current, className) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = "";
    for (let i = 0; i < total; i++) {
        html += `<div class="slot ${i < current ? className : ''}"></div>`;
    }
    container.innerHTML = html;
}

export function syncTerminals() {
    players.forEach(p => {
        p.conn.send({ type: 'SYNC_STATE', state: gameState });
    });
}

// Mise à jour visuelle des étiquettes (tags) des joueurs
export function updatePlayerTags() {
    const list = document.getElementById('active-player-list');
    if (!list) return;
    // ... logique de mise à jour des bordures (Jaune pour G, Bleu pour S)
}
