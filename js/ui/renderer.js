import { state, players } from '../core/state.js';
import { Logger } from './logger.js';
import { POWER_MAP } from '../core/constants.js'; // <-- AJOUT : On importe la carte des pouvoirs

// Affichage Composition Partie
export function displayComposition(roles) {
    const counts = roles.reduce((acc, r) => {
        acc[r] = (acc[r] || 0) + 1;
        return acc;
    }, {});

    const compDiv = document.getElementById('composition-display');
    
    const totalS = (counts['S'] || 0);
    const totalI = (counts['I'] || 0);

    let html = `<div style="color: #FFF; font-weight: bold; margin-bottom: 5px;">${players.length} PERSONNELS :</div>`;
    html += `<div style="color: #3498db;">• ${totalS} SURVIVANTS</div>`;
    html += `<div style="color: #e74c3c;">• ${totalI} INFECTÉS</div>`;
    html += `<div style="color: #9400d3;">• 1 ALPHA</div>`;
    if (counts['M']) { html += `<div style="color: #1b4d3e;">• ${counts['M']} MYCOLOGUE</div>`; }
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
    state.aliveNames = players.filter(p => p.isAlive).map(p => p.name);
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
    
    // Slots Décrets Survie (Bleu)
    document.getElementById('slots-s').innerHTML = Array(5).fill(0)
        .map((_, i) => `<div class="slot ${i < state.survie ? 'filled-s' : ''}"></div>`).join('');
    
    // Slots Décrets Crise avec affichage des Pouvoirs
    const n = players.length;
    const configPouvoirs = POWER_MAP[n] || POWER_MAP['default']; // Récupère la config selon le nombre de joueurs

    document.getElementById('slots-c').innerHTML = Array(6).fill(0)
        .map((_, i) => {
            const caseNum = i + 1; // Les cases vont de 1 à 6
            const pouvoirNom = configPouvoirs[caseNum];
            const estRemplie = caseNum <= state.crise;
            
            // Si un pouvoir existe sur cette case (ex: 'CENSURE', 'EXEC'), on prépare un petit badge textuel
            let badgePouvoir = "";
            if (pouvoirNom && pouvoirNom !== 'null') {
                const couleurBadge = "#e74c3c";
                badgePouvoir = `<div style="font-size: 0.65em; color: ${couleurBadge}; font-weight: bold; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">${pouvoirNom}</div>`;
            }

            // On englobe le slot et son texte dans un conteneur inline-block pour que le texte reste bien aligné sous sa case
            return `
                <div style="display: inline-block; text-align: center; vertical-align: top; margin: 5px;">
                    <div class="slot ${estRemplie ? 'filled-c' : ''}" style="margin: 0;"></div>
                    ${badgePouvoir}
                </div>
            `;
        }).join('');
    
    // Slots Ordre du jour (Gris)
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
            tag.style = ""; 
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
 * Retire Council Visuals
 */
export function clearCouncilVisuals() {
    players.forEach(p => {
        const tags = document.querySelectorAll(`[id="tag-${p.name.toLowerCase()}"]`);
        tags.forEach(tag => {
            tag.style.borderColor = "";   
            tag.style.borderWidth = "1px";
            const nameDiv = tag.querySelector('.p-name');
            if (nameDiv) nameDiv.innerText = p.name.toUpperCase();
        });
    });
}

/**
 * Reset Vote Colors
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
 * Rayer les morts et nettoyer les restes visuels de vote
 */
export function updatePlayerStatusUI(player, reveal) {
    const tags = document.querySelectorAll(`[id="tag-${player.name.toLowerCase()}"]`);
    const color = reveal === "INFECTÉ" ? "#e74c3c" : "#2ecc71";
    
    tags.forEach(tag => {
        // On supprime les classes de vote qui bloquent le fond
        tag.classList.remove('voted-oui', 'voted-non');
        
        // On applique les styles de mort
        tag.style.opacity = "0.4";
        tag.style.filter = "grayscale(100%)";
        tag.style.textDecoration = "line-through";
        
        // On s'assure que le background ne force plus une couleur opaque
        tag.style.background = "#1a1a1a"; 

        const jobDiv = tag.querySelector('.p-job');
        if (jobDiv) {
            // style="display: block;" s'assure que le texte se place bien en dessous sans être écrasé
            jobDiv.innerHTML = `<span style="color: ${color}; text-decoration: none; display: block; margin-top: 4px; font-weight: bold;">● DÉCÉDÉ (${reveal})</span>`;
        }
    });
}

export function updateCensureUI(player) {
    const tags = document.querySelectorAll(`[id="tag-${player.name.toLowerCase()}"]`);
    tags.forEach(tag => {
        const jobDiv = tag.querySelector('.p-job');
        if (jobDiv && !jobDiv.innerHTML.includes("🤐")) {
            jobDiv.innerHTML += ` <span class="censure-tag" style="color:#e74c3c; font-weight:bold;">🤐</span>`;
        }
    });
}
