import { state, players } from '../core/state.js';
import { Logger } from './logger.js';
import { POWER_MAP, DECREETS_DATABASE } from '../core/constants.js';

// Affichage Composition Partie (Mise à jour des couleurs)
export function displayComposition(roles) {
    const counts = roles.reduce((acc, r) => {
        acc[r] = (acc[r] || 0) + 1;
        return acc;
    }, {});

    const compDiv = document.getElementById('composition-display');
    
    const totalS = (counts['S'] || 0);
    const totalI = (counts['I'] || 0);

    let html = `<div style="color: #FFF; font-weight: bold; margin-bottom: 5px;">${players.length} SUJETS :</div>`;
    html += `<div style="color: #00e5ff;">• ${totalS} SURVIVANTS</div>`;
    html += `<div style="color: #ff1744;">• ${totalI} INFECTÉS</div>`;
    html += `<div style="color: #d500f9;">• 1 ALPHA</div>`;
    if (counts['M']) { html += `<div style="color: #00bfa5;">• ${counts['M']} MYCOLOGUE</div>`; }
    if (counts['IM']) { html += `<div style="color: #ffea00;">• ${counts['IM']} IMMUNISÉ</div>`; }

    compDiv.innerHTML = html;
}

// Affichage dernier conseil
export function updateLastCouncil() {
    if (state.lastGardien && state.lastSentinelle) {
        document.getElementById('last-council-display').innerHTML = `
            <span style="color: #ffea00;">${state.lastGardien}</span><br>
            &<br>
            <span style="color: #00e5ff;">${state.lastSentinelle}</span>
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
        <div class="p-job" style="font-size: 0.6em; opacity: 0.8; font-weight: normal; color: #00e5ff;"></div>
    `;
    
    const nameTagClone = nameTag.cloneNode(true);
    document.getElementById('player-list').appendChild(nameTag);
    document.getElementById('active-player-list').appendChild(nameTagClone);
}

// Reconstruit la liste active selon le nouvel ordre
export function rebuildActivePlayerTags() {
    const activeList = document.getElementById('active-player-list');
    if (!activeList) return;
    
    activeList.innerHTML = "";
    
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
    state.journalisteNames = players.filter(p => p.isAlive && p.metier === 'Journaliste').map(p => p.name);
    state.civilianNames = players.filter(p => p.isAlive && p.metier === 'Civil').map(p => p.name);
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
    const oxyBar = document.getElementById('oxy-level');
    if (oxyBar) {
        oxyBar.style.width = (state.oxy / 3 * 100) + "%";
        oxyBar.parentElement.className = (state.oxy <= 1) ? "critical" : "";
    }
    const oxyText = document.getElementById('oxy-text-central');
    if (oxyText) {
        oxyText.innerText = `SpO2 (NIVEAU D'OXYGÈNE) : ${state.oxy} / 3`;
        // Clignotement rouge si critique
        oxyText.style.color = (state.oxy <= 1) ? "#ff1744" : "#b2ebf2";
    }

    const deckCountEl = document.getElementById('deck-count');
    const discardCountEl = document.getElementById('discard-count');
    
    if (deckCountEl) deckCountEl.innerText = state.deck ? state.deck.length : 0;
    if (discardCountEl) discardCountEl.innerText = state.discard ? state.discard.length : 0;
    
    // Slots Décrets Survie (Bleu -> Cyan)
    document.getElementById('slots-s').innerHTML = Array(5).fill(0)
    .map((_, i) => {
        const cardId = state.slotsSurvieCards[i];
        const nameLabel = cardId ? `<div style="font-size:0.6em; color:#00e5ff; font-weight:bold; margin-top:4px;">${DECREETS_DATABASE[cardId].name.toUpperCase()}</div>` : "";
        return `
            <div style="display: inline-block; text-align: center; vertical-align: top; margin: 5px;">
                <div class="slot ${cardId ? 'filled-s' : ''}" style="margin: 0;"></div>
                ${nameLabel}
            </div>`;
    }).join('');
    
    // Slots Décrets Crise (Rouge Sang)
    const n = players.length;
    const configPouvoirs = POWER_MAP[n] || POWER_MAP['default'];

    document.getElementById('slots-c').innerHTML = Array(6).fill(0)
    .map((_, i) => {
        const caseNum = i + 1;
        const cardId = state.slotsCriseCards[i];
        const pouvoirNom = configPouvoirs[caseNum];
        
        let labelText = "";
        if (cardId) {
            labelText = `<div style="font-size:0.6em; color:#ff1744; font-weight:bold; margin-top:4px;">${DECREETS_DATABASE[cardId].name.toUpperCase()}</div>`;
        } else if (pouvoirNom && pouvoirNom !== 'null') {
            labelText = `<div style="font-size: 0.65em; color: #ff1744; font-weight: bold; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">${pouvoirNom}</div>`;
        }

        return `
            <div style="display: inline-block; text-align: center; vertical-align: top; margin: 5px;">
                <div class="slot ${cardId ? 'filled-c' : ''}" style="margin: 0;"></div>
                ${labelText}
            </div>`;
    }).join('');
    
    // Slots Ordre du jour (Gris Métal)
    const cardIdF = state.slotsSuffrageCard;
    const nameLabelF = cardIdF ? `<div style="font-size:0.6em; color:#b0bec5; font-weight:bold; margin-top:4px;">${DECREETS_DATABASE[cardIdF].name.toUpperCase()}</div>` : "";
    document.getElementById('slots-f').innerHTML = `
        <div style="display: inline-block; text-align: center; vertical-align: top; margin: 5px;">
            <div class="slot ${cardIdF ? 'filled-f' : ''}" style="margin: 0;"></div>
            ${nameLabelF}
        </div>`;

    // GESTION DYNAMIQUE DES ÉTIQUETTES DES JOUEURS
    players.forEach((p, idx) => {
        const activeList = document.getElementById('active-player-list');
        if (!activeList) return;
        
        const tag = activeList.querySelector(`[id="tag-${p.name.toLowerCase()}"]`);
        if (tag) {
            const nameDiv = tag.querySelector('.p-name');
            
            if (idx === state.propheteIdx) {
                tag.classList.add('prophete-style');
                if (nameDiv) {
                    nameDiv.innerHTML = p.name.toUpperCase(); 
                }
            } else {
                tag.classList.remove('prophete-style');
                if (nameDiv) {
                    nameDiv.innerHTML = p.name.toUpperCase(); 
                }
            }

            let weightDiv = tag.querySelector('.p-weight');
            if (!weightDiv) {
                weightDiv = document.createElement('div');
                weightDiv.className = 'p-weight';
                weightDiv.style.fontSize = '0.65em';
                weightDiv.style.marginTop = '4px';
                tag.appendChild(weightDiv);
            }

            if (!p.isAlive) {
                weightDiv.innerHTML = `<span style="color: #ff1744; font-weight: bold;">[DÉCÉDÉ]</span>`;
            } else if (p.isCensored) {
                weightDiv.innerHTML = `<span style="color: #b0bec5; font-weight: bold;">VOIX : 0 (MUET)</span>`;
            } else if (idx === state.propheteIdx) {
                weightDiv.innerHTML = `<span style="color: #ffffff; font-weight: bold; letter-spacing: 1px;">PAROLE DIVINE</span>`;
            } else {
                const currentWeight = calculatePlayerVoteWeight(p);
                const color = currentWeight > 1 ? '#ffea00' : '#00e5ff'; 
                weightDiv.innerHTML = `<span style="color: ${color}; font-weight: ${currentWeight > 1 ? 'bold' : 'normal'};">VOIX : ${currentWeight}</span>`;
            }
        }
    });

    // RENDU DES DIRECTIVES EN VIGUEUR
    const listBlue = document.getElementById('rules-list-blue');
    const listRed = document.getElementById('rules-list-red');
    const listGrey = document.getElementById('rules-list-grey');
    const countBlue = document.getElementById('count-blue');
    const countRed = document.getElementById('count-red');

    if (listBlue) {
        if (countBlue) countBlue.innerText = `(${state.activeEffectsS.length}/2)`;
        if (state.activeEffectsS.length === 0) {
            listBlue.innerHTML = `<li style="color: #5c8a99; font-style: italic; border: none; background: none; padding: 0;">Aucun effet permanent actif</li>`;
        } else {
            listBlue.innerHTML = state.activeEffectsS.map(id => `<li><strong>♾️ ${DECREETS_DATABASE[id].name.toUpperCase()}</strong><br><span style="font-size:0.9em; color:#84cdd5;">${DECREETS_DATABASE[id].desc}</span></li>`).join('');
        }
    }

    if (listRed) {
        if (countRed) countRed.innerText = `(${state.activeEffectsC.length}/2)`;
        if (state.activeEffectsC.length === 0) {
            listRed.innerHTML = `<li style="color: #5c8a99; font-style: italic; border: none; background: none; padding: 0;">Aucun effet permanent actif</li>`;
        } else {
            listRed.innerHTML = state.activeEffectsC.map(id => `<li><strong style="color:#ff1744;">♾️ ${DECREETS_DATABASE[id].name.toUpperCase()}</strong><br><span style="font-size:0.9em; color:#84cdd5;">${DECREETS_DATABASE[id].desc}</span></li>`).join('');
        }
    }

    if (listGrey) {
        if (!state.slotsSuffrageCard) {
            listGrey.innerHTML = `<li style="color: #5c8a99; font-style: italic; border: none; background: none; padding: 0;">Aucun décret de suffrage actif</li>`;
        } else {
            const idF = state.slotsSuffrageCard;
            listGrey.innerHTML = `<li><strong style="color:#b0bec5;">🗳️ ${DECREETS_DATABASE[idF].name.toUpperCase()}</strong><br><span style="font-size:0.9em; color:#84cdd5;">${DECREETS_DATABASE[idF].desc}</span></li>`;
        }
    }
}

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

export function resetLobbyVisuals() {
    const lobbyList = document.getElementById('player-list');
    const activeList = document.getElementById('active-player-list');
    
    // 1. On vide intégralement les anciens éléments HTML
    if (lobbyList) lobbyList.innerHTML = "";
    if (activeList) activeList.innerHTML = "";
    
    // 2. On recrée des étiquettes neuves pour chaque joueur toujours dans la partie
    players.forEach(p => {
        const nameTag = document.createElement('div');
        nameTag.className = 'player-tag'; 
        nameTag.id = `tag-${p.name.toLowerCase()}`;
        nameTag.innerHTML = `
            <div class="p-name">${p.name.toUpperCase()}</div>
            <div class="p-job" style="font-size: 0.6em; opacity: 0.8; font-weight: normal; color: #00e5ff;"></div>
        `;
        
        // Ajout dans le lobby
        if (lobbyList) lobbyList.appendChild(nameTag);
        
        // Ajout dans la zone de jeu (cachée pour le moment)
        const activeTag = nameTag.cloneNode(true);
        if (activeList) activeList.appendChild(activeTag);
    });

    // 3. On met à jour le compteur global
    const countEl = document.getElementById('count');
    if (countEl) countEl.innerText = players.length;
}

export function triggerWin(team, reason) {
    state.gameOver = true;
    const revealZone = document.getElementById('role-reveal-zone');
    if (revealZone) {
        revealZone.innerHTML = ""; 
        players.forEach(p => {
            const config = {
                'A':  { label: "ALPHA", color: "#d500f9" },
                'I':  { label: "INFECTÉ", color: "#ff1744" },
                'S':  { label: "SURVIVANT", color: "#00e5ff" },
                'M':  { label: "MYCOLOGUE", color: "#00bfa5" },
                'IM': { label: "IMMUNISÉ", color: "#ffea00" }
            };
            const { label, color } = config[p.role];
            const card = document.createElement('div');
            card.className = `reveal-card rev-${p.role}`;
            card.innerHTML = `
                <div style="font-weight:bold; color:#FFF; font-size:1.1em;">${p.name.toUpperCase()}</div>
                <div style="font-size:0.8em; color:#84cdd5; margin-bottom:5px;">${p.metier}</div>
                <div style="font-size:0.9em; color:${color}; font-weight:bold;">${label}</div>
            `;
            revealZone.appendChild(card);
        });
    }

    document.getElementById('end-screen').style.display = "flex";
    const titleEl = document.getElementById('victory-title');
    titleEl.innerText = "VICTOIRE : " + team;
    titleEl.style.color = team === "SURVIVANTS" ? "#00e5ff" : "#ff1744";
    document.getElementById('victory-reason').innerText = reason;
    Logger.add(`FIN DE PARTIE : Victoire des ${team}.`);

    players.forEach(p => {
        let hasWon = false;
        if (team === "SURVIVANTS" && ['S', 'IM'].includes(p.role)) hasWon = true;
        if (team === "INFECTES" && ['I', 'A', 'M'].includes(p.role)) hasWon = true;
        p.conn.send({ type: 'END_GAME', team, reason, personalResult: hasWon ? "MISSION RÉUSSIE" : "MISSION ÉCHOUÉE" });
    });
}

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

export function updatePlayerStatusUI(player, reveal) {
    const tags = document.querySelectorAll(`[id="tag-${player.name.toLowerCase()}"]`);
    const isInfected = reveal === "INFECTÉ";
    
    // Le Mort Clinique est barré, rouge s'il était infecté, vert d'eau si sain.
    const colorStatus = isInfected ? "#ff1744" : "#1de9b6";
    
    tags.forEach(tag => {
        tag.classList.remove('voted-oui', 'voted-non');
        
        // Style "Moniteur Éteint"
        tag.style.background = "rgba(0,0,0,0.8)"; 
        tag.style.borderColor = colorStatus; 
        tag.style.borderStyle = "dashed";
        tag.style.borderWidth = "1px";

        const nameDiv = tag.querySelector('.p-name');
        if (nameDiv) {
            nameDiv.style.opacity = "0.4";
            nameDiv.style.textDecoration = "line-through";
            nameDiv.style.textShadow = "none";
        }

        const jobDiv = tag.querySelector('.p-job');
        if (jobDiv) {
            jobDiv.style.opacity = "1";
            jobDiv.style.filter = "none";
            jobDiv.innerHTML = `<span style="color: ${colorStatus}; display: block; margin-top: 4px; font-weight: bold; font-size: 0.9em; letter-spacing: 0.5px;">☠️ [ ${reveal} ]</span>`;
        }
    });
}

export function updateCensureUI(player) {
    const tags = document.querySelectorAll(`[id="tag-${player.name.toLowerCase()}"]`);
    tags.forEach(tag => {
        const jobDiv = tag.querySelector('.p-job');
        if (jobDiv && !jobDiv.innerHTML.includes("🤐")) {
            jobDiv.innerHTML += ` <span class="censure-tag" style="color:#b0bec5; font-weight:bold; display:block; margin-top:4px;">[ CENSURÉ ]</span>`;
        }
    });
}

export function calculatePlayerVoteWeight(player) {
    if (!player.isAlive || player.isCensored) return 0;

    let weight = 1;

    if (player.metier === 'Shérif') {
        weight = 2;
    }

    if (player.metier === 'Fossoyeur') {
        const deadCount = players.filter(p => !p.isAlive).length;
        weight += deadCount;
    }
    
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

    if (state.slotsSuffrageCard === 'greve_zele') {
        const joueurAVote = state.votes.list.find(v => v.name.toLowerCase() === player.name.toLowerCase());
        if (joueurAVote && joueurAVote.choice === 'NON') {
            weight *= 2; 
        }
    }

    return weight;
}
