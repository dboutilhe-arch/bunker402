import { state, players } from '../core/state.js';
import { Logger } from './logger.js';

// Affichage Composition Partie
export function displayComposition(roles) {
    const counts = roles.reduce((acc, r) => {
        acc[r] = (acc[r] || 0) + 1;
        return acc;
    }, {});

    const compDiv = document.getElementById('composition-display');
    
    // On ne compte que les rôles de base ici
    const totalS = (counts['S'] || 0);
    const totalI = (counts['I'] || 0);

    let html = `<div style="color: #FFF; font-weight: bold; margin-bottom: 5px;">${players.length} PERSONNELS :</div>`;
    // Affichage des Survivants standards
    html += `<div style="color: #3498db;">• ${totalS} SURVIVANTS</div>`;
    // Affichage des Infectés standards
    html += `<div style="color: #e74c3c;">• ${totalI} INFECTÉS</div>`;
    // Ligne Alpha (Toujours présent)
    html += `<div style="color: #9400d3;">• 1 ALPHA</div>`;
    // Affichage conditionnel du Mycologue (Infiltré)
    if (counts['M']) { html += `<div style="color: #1b4d3e;">• ${counts['M']} MYCOLOGUE</div>`; }
    // Affichage conditionnel de l'Immunisé (Résistant)
    if (counts['IM']) { html += `<div style="color: #d4af37;">• ${counts['IM']} IMMUNISÉ</div>`; }

    compDiv.innerHTML = html;
}

// Affichage dernier conseil
export function updateLastCouncil() {
    if (state.lastGardien && state.lastSentinelle) {
        document.getElementById('last-council-display').innerHTML = `
            <span style="color: #f1c40f;">${state.lastGardien}</span><br>
            &<br>
            <span style="color: #3498db;">${state.lastSentinelle}</span>
        `;
    }
}

// Création étiquette
export function createPlayerTag(name) {
    const nameTag = document.createElement('div');
    nameTag.className = 'player-tag'; 
    nameTag.id = `tag-${name.toLowerCase()}`;
    nameTag.innerHTML = `
        <div class="p-name">${name.toUpperCase()}</div>
        <div class="p-job" style="font-size: 0.6em; opacity: 0.8; font-weight: normal; color: #2ecc71;"></div>
    `;
    
    const nameTagClone = nameTag.cloneNode(true);
    document.getElementById('player-list').appendChild(nameTag);
    document.getElementById('active-player-list').appendChild(nameTagClone);
}

// Synchronisation
export function syncTerminals() {
    // On injecte la liste des noms vivants juste avant l'envoi
    state.aliveNames = players.filter(p => p.isAlive).map(p => p.name);
    // On injecte aussi les noms des censurés
    state.censoredNames = players.filter(p => p.isCensored).map(p => p.name);
    
    players.forEach(p => {
        if (p.conn && p.conn.open) {
            p.conn.send({ type: 'SYNC_STATE', state: state });
        }
    });
}

/**
 * Mise à jour des plateaux (Oxygène, Survie, Crise, Suffrage)
 */
export function render() {
    const oxyBar = document.getElementById('oxy-level');
    if (oxyBar) {
        oxyBar.style.width = (state.oxy / 3 * 100) + "%";
        oxyBar.className = (state.oxy <= 1) ? "critical" : "";
    }
    
    // Slots Décrets
    document.getElementById('slots-s').innerHTML = Array(5).fill(0)
        .map((_, i) => `<div class="slot ${i < state.survie ? 'filled-s' : ''}"></div>`).join('');
    
    document.getElementById('slots-c').innerHTML = Array(6).fill(0)
        .map((_, i) => `<div class="slot ${i < state.crise ? 'filled-c' : ''}"></div>`).join('');
    
    document.getElementById('slots-f').innerHTML = 
        `<div class="slot ${state.suffrage !== "Aucun" ? 'filled-f' : ''}"></div>`;
}

/**
 * Affiche les métiers sur les étiquettes
 */
export function updateTagsWithJobs() {
    players.forEach(p => {
        const tags = document.querySelectorAll(`[id="tag-${p.name.toLowerCase()}"]`);
        tags.forEach(tag => {
            tag.innerHTML = `
                <div class="p-name">${p.name.toUpperCase()}</div>
                <div class="p-job" style="font-size: 0.65em; opacity: 0.8; font-weight: normal; margin-top: 2px;">
                    ${p.metier}
                </div>
            `;
        });
    });
}

/**
 * Reset complet des étiquettes pour le Lobby
 */
export function resetLobbyVisuals() {
    players.forEach(p => {
        const tags = document.querySelectorAll(`[id="tag-${p.name.toLowerCase()}"]`);
        tags.forEach(tag => {
            tag.className = 'player-tag';
            tag.style = ""; // Reset de tous les styles inline
            tag.innerHTML = `
                <div class="p-name">${p.name.toUpperCase()}</div>
                <div class="p-job" style="font-size: 0.6em; opacity: 0.8; font-weight: normal; color: #2ecc71;"></div>
            `;
        });
    });
}

/**
 * Gère l'affichage des résultats finaux
 */
export function triggerWin(team, reason) {
    state.gameOver = true;
    const revealZone = document.getElementById('role-reveal-zone');
    if (revealZone) {
        revealZone.innerHTML = ""; 
        players.forEach(p => {
            const config = {
                'A':  { label: "ALPHA", color: "#9400d3" },
                'I':  { label: "INFECTÉ", color: "#e74c3c" },
                'S':  { label: "SURVIVANT", color: "#3498db" },
                'M':  { label: "MYCOLOGUE", color: "#1b4d3e" },
                'IM': { label: "IMMUNISÉ", color: "#d4af37" }
            };
            const { label, color } = config[p.role];
            const card = document.createElement('div');
            card.className = `reveal-card rev-${p.role}`;
            card.innerHTML = `
                <div style="font-weight:bold; color:#FFF; font-size:1.1em;">${p.name.toUpperCase()}</div>
                <div style="font-size:0.8em; color:#888; margin-bottom:5px;">${p.metier}</div>
                <div style="font-size:0.9em; color:${color}; font-weight:bold;">${label}</div>
            `;
            revealZone.appendChild(card);
        });
    }

    document.getElementById('end-screen').style.display = "flex";
    document.getElementById('victory-title').innerText = "VICTOIRE : " + team;
    document.getElementById('victory-reason').innerText = reason;
    Logger.add(`FIN DE PARTIE : Victoire des ${team}.`);

    players.forEach(p => {
        let hasWon = false;
        if (team === "SURVIVANTS" && ['S', 'IM'].includes(p.role)) hasWon = true;
        if (team === "INFECTES" && ['I', 'A', 'M'].includes(p.role)) hasWon = true;
        p.conn.send({ type: 'END_GAME', team, reason, personalResult: hasWon ? "MISSION RÉUSSIE" : "MISSION ÉCHOUÉE" });
    });
}

/**
 * Retire UNIQUEMENT les cadres (jaune/bleu) et l'étoile.
 * Appelée dès que le vote est fini.
 */
export function clearCouncilVisuals() {
    players.forEach(p => {
        const tags = document.querySelectorAll(`[id="tag-${p.name.toLowerCase()}"]`);
        tags.forEach(tag => {
            // On reset la bordure sans toucher aux classes CSS (vote)
            tag.style.borderColor = "";   
            tag.style.borderWidth = "1px";
            
            // On remet le nom sans l'étoile
            const nameDiv = tag.querySelector('.p-name');
            if (nameDiv) nameDiv.innerText = p.name.toUpperCase();
        });
    });
}

/**
 * Retire UNIQUEMENT les couleurs de vote (vert/rouge).
 * Appelée au début du tour suivant.
 */
export function resetVoteColors() {
    players.forEach(p => {
        const tags = document.querySelectorAll(`[id="tag-${p.name.toLowerCase()}"]`);
        tags.forEach(tag => {
            tag.classList.remove('voted-oui', 'voted-non');
            const cTag = tag.querySelector('.censure-tag');
            if (cTag) cTag.remove();
        });
    });
}

/**
 * Rayer les morts de l'écran
 */
export function updatePlayerStatusUI(player, reveal) {
    const tags = document.querySelectorAll(`[id="tag-${player.name.toLowerCase()}"]`);
    const color = reveal === "INFECTÉ" ? "#e74c3c" : "#2ecc71";
    
    tags.forEach(tag => {
        tag.style.opacity = "0.4";
        tag.style.filter = "grayscale(100%)";
        tag.style.textDecoration = "line-through";
        const jobDiv = tag.querySelector('.p-job');
        if (jobDiv) {
            jobDiv.innerHTML = `<span style="color: ${color}; text-decoration: none;">● DÉCÉDÉ (${reveal})</span>`;
        }
    });
}

// Pour ajouter le badge 🤐 sans effacer le reste
export function updateCensureUI(player) {
    const tags = document.querySelectorAll(`[id="tag-${player.name.toLowerCase()}"]`);
    tags.forEach(tag => {
        const jobDiv = tag.querySelector('.p-job');
        if (jobDiv && !jobDiv.innerHTML.includes("🤐")) {
            jobDiv.innerHTML += ` <span class="censure-tag" style="color:#e74c3c; font-weight:bold;">🤐</span>`;
        }
    });
}
