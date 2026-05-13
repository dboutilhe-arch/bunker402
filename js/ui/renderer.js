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

    players.forEach(p => {
        // On récupère toutes les instances de l'étiquette (Lobby et Jeu)
        const tags = document.querySelectorAll(`[id="tag-${p.name.toLowerCase()}"]`);
        
        tags.forEach(tag => {
            const nameDiv = tag.querySelector('.p-name');
            const jobDiv = tag.querySelector('.p-job');

            // 1. Reset des styles par défaut
            tag.className = 'player-tag'; 
            tag.style.borderColor = "";
            tag.style.borderWidth = "1px";
            tag.style.opacity = "1";

            // 2. Affichage du métier (si défini)
            if (jobDiv && p.metier) {
                jobDiv.innerText = p.metier;
            }

            // 3. Identification du Gardien (⭐ + Bordure Jaune)
            if (players[curG] && p.name === players[curG].name) {
                if (nameDiv) nameDiv.innerHTML = `⭐ ${p.name.toUpperCase()}`;
                tag.style.borderColor = "#f1c40f"; // Jaune
                tag.style.borderWidth = "2px";
            } else {
                if (nameDiv) nameDiv.innerText = p.name.toUpperCase();
            }

            // 4. Identification de la Sentinelle proposée (Bordure Bleue)
            // On utilise gameState.currentProposedS défini dans le moteur
            if (gameState.currentProposedS && p.name === gameState.currentProposedS) {
                tag.style.borderColor = "#3498db"; // Bleu
                tag.style.borderWidth = "2px";
            }

            // 5. Affichage visuel des votes (si on est en phase de vote)
            const voteData = votes.list.find(v => v.name.toLowerCase() === p.name.toLowerCase());
            if (voteData) {
                tag.classList.add(voteData.choice === 'OUI' ? 'voted-oui' : 'voted-non');
            }
        });
    });
}
