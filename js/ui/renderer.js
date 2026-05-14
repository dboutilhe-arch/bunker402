import { state, players, curG, votes } from '../core/state.js';

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
