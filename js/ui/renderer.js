import { state, players } from '../core/state.js';
import { Logger } from './logger.js';
import { POWER_MAP, DECREETS_DATABASE } from '../core/constants.js'; // <-- AJOUT : On importe la carte des pouvoirs

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

// Reconstruit la liste active selon le nouvel ordre mélangé des joueurs
export function rebuildActivePlayerTags() {
    const activeList = document.getElementById('active-player-list');
    if (!activeList) return;
    
    // 1. On vide la liste désordonnée de la phase de Lobby
    activeList.innerHTML = "";
    
    // 2. On recrée les étiquettes une par une dans le nouvel ordre de jeu
    players.forEach(p => {
        const nameTag = document.createElement('div');
        nameTag.className = 'player-tag'; 
        nameTag.id = `tag-${p.name.toLowerCase()}`;
        nameTag.innerHTML = `
            <div class="p-name">${p.name.toUpperCase()}</div>
            <div class="p-job" style="font-size: 0.65em; opacity: 0.8; font-weight: normal; margin-top: 2px;"></div>
        `;
        activeList.appendChild(nameTag);
    });
}

// Synchronisation
export function syncTerminals() {
    state.aliveNames = players.filter(p => p.isAlive).map(p => p.name);
    state.censoredNames = players.filter(p => p.isCensored).map(p => p.name);
    
    // ON ENVOIE LES JOURNALISTES AU STATE POUR LES SMARTPHONES
    state.journalisteNames = players.filter(p => p.isAlive && p.metier === 'Journaliste').map(p => p.name);
    // ON ENVOIE LE NOMBRE DE MORTS AU STATE POUR LE FOSSOYEUR
    state.deadCount = players.filter(p => !p.isAlive).length;
    
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
    // 1. Mise à jour de la barre d'oxygène
    const oxyBar = document.getElementById('oxy-level');
    if (oxyBar) {
        oxyBar.style.width = (state.oxy / 3 * 100) + "%";
        oxyBar.className = (state.oxy <= 1) ? "critical" : "";
    }
    // Mise à jour du texte oxygène
    const oxyText = document.getElementById('oxy-text-central');
    if (oxyText) {
        oxyText.innerText = `NIVEAU D'OXYGÈNE : ${state.oxy} / 3`;
    }

    // 2. Mise à jour des compteurs de pioche et défausse
    const deckCountEl = document.getElementById('deck-count');
    const discardCountEl = document.getElementById('discard-count');
    
    if (deckCountEl) deckCountEl.innerText = state.deck ? state.deck.length : 0;
    if (discardCountEl) discardCountEl.innerText = state.discard ? state.discard.length : 0;
    
    // 3. Slots Décrets Survie (Bleu)
    document.getElementById('slots-s').innerHTML = Array(5).fill(0)
    .map((_, i) => {
        const cardId = state.slotsSurvieCards[i];
        const nameLabel = cardId ? `<div style="font-size:0.6em; color:#3498db; font-weight:bold; margin-top:4px;">${DECREETS_DATABASE[cardId].name.toUpperCase()}</div>` : "";
        return `
            <div style="display: inline-block; text-align: center; vertical-align: top; margin: 5px;">
                <div class="slot ${cardId ? 'filled-s' : ''}" style="margin: 0;"></div>
                ${nameLabel}
            </div>`;
    }).join('');
    
    // 4. Slots Décrets Crise avec affichage des Pouvoirs
    const n = players.length;
    const configPouvoirs = POWER_MAP[n] || POWER_MAP['default'];

    document.getElementById('slots-c').innerHTML = Array(6).fill(0)
    .map((_, i) => {
        const caseNum = i + 1;
        const cardId = state.slotsCriseCards[i];
        const pouvoirNom = configPouvoirs[caseNum];
        
        let labelText = "";
        if (cardId) {
            labelText = `<div style="font-size:0.6em; color:#e74c3c; font-weight:bold; margin-top:4px;">${DECREETS_DATABASE[cardId].name.toUpperCase()}</div>`;
        } else if (pouvoirNom && pouvoirNom !== 'null') {
            labelText = `<div style="font-size: 0.65em; color: #e74c3c; font-weight: bold; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">${pouvoirNom}</div>`;
        }

        return `
            <div style="display: inline-block; text-align: center; vertical-align: top; margin: 5px;">
                <div class="slot ${cardId ? 'filled-c' : ''}" style="margin: 0;"></div>
                ${labelText}
            </div>`;
    }).join('');
    
    // 5. Slots Ordre du jour (Gris)
    const cardIdF = state.slotsSuffrageCard;
    const nameLabelF = cardIdF ? `<div style="font-size:0.6em; color:#7f8c8d; font-weight:bold; margin-top:4px;">${DECREETS_DATABASE[cardIdF].name.toUpperCase()}</div>` : "";
    document.getElementById('slots-f').innerHTML = `
        <div style="display: inline-block; text-align: center; vertical-align: top; margin: 5px;">
            <div class="slot ${cardIdF ? 'filled-f' : ''}" style="margin: 0;"></div>
            ${nameLabelF}
        </div>`;

    // 6. ✨ GESTION DYNAMIQUE DES ÉTIQUETTES DES JOUEURS
    players.forEach((p, idx) => {
        const activeList = document.getElementById('active-player-list');
        if (!activeList) return;
        
        const tag = activeList.querySelector(`[id="tag-${p.name.toLowerCase()}"]`);
        if (tag) {
            const nameDiv = tag.querySelector('.p-name');
            
            // Gestion visuelle exclusive du Prophète
            if (idx === state.propheteIdx) {
                tag.classList.add('prophete-style');
                if (nameDiv && !nameDiv.innerHTML.includes("🔮")) {
                    nameDiv.innerHTML = `🔮 ${p.name.toUpperCase()} [PROPHÈTE]`;
                }
            } else {
                tag.classList.remove('prophete-style');
            }

            // Création ou récupération de la zone du poids de vote
            let weightDiv = tag.querySelector('.p-weight');
            if (!weightDiv) {
                weightDiv = document.createElement('div');
                weightDiv.className = 'p-weight';
                weightDiv.style.fontSize = '0.65em';
                weightDiv.style.marginTop = '4px';
                tag.appendChild(weightDiv);
            }

            // Contenu de la div selon le statut vital et politique
            if (!p.isAlive) {
                weightDiv.innerHTML = `<span style="color: #555;">[ÉLIMINÉ]</span>`;
            } else if (p.isCensored) {
                weightDiv.innerHTML = `<span style="color: #e74c3c; font-weight: bold;">VOIX : 0 (MUET)</span>`;
            } else if (idx === state.propheteIdx) {
                // Le prophète est vivant, non censuré, mais n'a pas de voix !
                weightDiv.innerHTML = `<span style="color: #9b59b6; font-weight: bold;">VOIX : PROPHÈTE</span>`;
            } else {
                const currentWeight = calculatePlayerVoteWeight(p);
                const color = currentWeight > 1 ? '#f1c40f' : '#2ecc71'; 
                weightDiv.innerHTML = `<span style="color: ${color}; font-weight: ${currentWeight > 1 ? 'bold' : 'normal'};">VOIX : ${currentWeight}</span>`;
            }
        }
    });

    // 7. --- RENDU DES DIRECTIVES EN VIGUEUR (BAS D'ÉCRAN) ---
    const listBlue = document.getElementById('rules-list-blue');
    const listRed = document.getElementById('rules-list-red');
    const listGrey = document.getElementById('rules-list-grey');
    const countBlue = document.getElementById('count-blue');
    const countRed = document.getElementById('count-red');

    if (listBlue) {
        if (countBlue) countBlue.innerText = `(${state.activeEffectsS.length}/2)`;
        if (state.activeEffectsS.length === 0) {
            listBlue.innerHTML = `<li style="color: #555; font-style: italic; border: none; background: none; padding: 0;">Aucun effet permanent actif</li>`;
        } else {
            listBlue.innerHTML = state.activeEffectsS.map(id => `<li><strong>♾️ ${DECREETS_DATABASE[id].name.toUpperCase()}</strong><br><span style="font-size:0.9em; color:#aaa;">${DECREETS_DATABASE[id].desc}</span></li>`).join('');
        }
    }

    if (listRed) {
        if (countRed) countRed.innerText = `(${state.activeEffectsC.length}/2)`;
        if (state.activeEffectsC.length === 0) {
            listRed.innerHTML = `<li style="color: #555; font-style: italic; border: none; background: none; padding: 0;">Aucun effet permanent actif</li>`;
        } else {
            listRed.innerHTML = state.activeEffectsC.map(id => `<li><strong>♾️ ${DECREETS_DATABASE[id].name.toUpperCase()}</strong><br><span style="font-size:0.9em; color:#aaa;">${DECREETS_DATABASE[id].desc}</span></li>`).join('');
        }
    }

    if (listGrey) {
        if (!state.slotsSuffrageCard) {
            listGrey.innerHTML = `<li style="color: #555; font-style: italic; border: none; background: none; padding: 0;">Aucun décret de suffrage actif</li>`;
        } else {
            const idF = state.slotsSuffrageCard;
            listGrey.innerHTML = `<li><strong style="color:#7f8c8d;">🗳️ ${DECREETS_DATABASE[idF].name.toUpperCase()}</strong><br><span style="font-size:0.9em; color:#aaa;">${DECREETS_DATABASE[idF].desc}</span></li>`;
        }
    }
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
            tag.classList.remove('voted-oui', 'voted-non', 'voted-secret');
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
    const isInfected = reveal === "INFECTÉ";
    
    // Définition de couleurs ultra-flashs (Néon) pour le statut
    const colorStatus = isInfected ? "#ff3333" : "#00ff66";
    
    tags.forEach(tag => {
        tag.classList.remove('voted-oui', 'voted-non');
        
        // On change le fond pour un noir profond "hors-service"
        tag.style.background = "#050505"; 
        tag.style.borderColor = isInfected ? "#e74c3c" : "#2ecc71"; // La bordure prend discrètement la couleur
        tag.style.borderWidth = "1px";

        // On applique le gris/barré UNIQUEMENT sur le nom du joueur pour qu'il ait l'air mort
        const nameDiv = tag.querySelector('.p-name');
        if (nameDiv) {
            nameDiv.style.opacity = "0.3";
            nameDiv.style.filter = "grayscale(100%)";
            nameDiv.style.textDecoration = "line-through";
        }

        // Le job div reste à 100% d'opacité et sans filtre pour flasher l'analyse bio !
        const jobDiv = tag.querySelector('.p-job');
        if (jobDiv) {
            jobDiv.style.opacity = "1";
            jobDiv.style.filter = "none";
            jobDiv.innerHTML = `<span style="color: ${colorStatus}; display: block; margin-top: 4px; font-weight: bold; font-size: 0.9em; letter-spacing: 0.5px;">☠️ ${reveal}</span>`;
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

/**
 * Calcule le poids de vote dynamique d'un joueur selon ses passifs et le suffrage actif (Effets cumulés)
 */
export function calculatePlayerVoteWeight(player) {
    if (!player.isAlive || player.isCensored) return 0;

    // 1. CALCUL DE LA BASE (Métiers)
    let weight = 1;

    if (player.metier === 'Shérif') {
        weight = 2;
    }

    if (player.metier === 'Fossoyeur') {
        const deadCount = players.filter(p => !p.isAlive).length;
        weight += deadCount;
    }
    
    // 2. APPLICATION DES MULTIPLICATEURS (Décrets de Suffrage)
    if (state.slotsSuffrageCard === 'conseil_restreint') {
        const isGardien = (player.name === players[state.curG]?.name);
        const isSentinelle = (state.curSIdx !== -1 && player.name === players[state.curSIdx]?.name);
        if (isGardien || isSentinelle) {
            weight *= 2;
        }
    } 
    else if (state.slotsSuffrageCard === 'insurrection_populaire' && player.metier === 'Civil') {
        weight *= 2;
    }

    // Si la Grève du Zèle est active, on regarde si le joueur A DÉJÀ voté NON
    if (state.slotsSuffrageCard === 'greve_zele') {
        const joueurAVote = state.votes.list.find(v => v.name.toLowerCase() === player.name.toLowerCase());
        if (joueurAVote && joueurAVote.choice === 'NON') {
            weight *= 2; // Le poids double rétroactivement sur l'étiquette s'il a refusé !
        }
    }

    return weight;
}
