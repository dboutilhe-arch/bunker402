// rules.js

import { players, gameState } from '../core/state.js';

/**
 * Vérifie si une équipe a rempli ses conditions de victoire
 * @returns {string|null} Le nom de l'équipe gagnante ou null
 */
export function checkWinConditions() {
    if (gameState.survie >= 5) return "SURVIVANTS";
    if (gameState.crise >= 6) return "INFECTÉS";
    return null;
}

/**
 * Détermine si le conseil proposé est valide selon les règles de succession
 */
export function isCouncilEligible(gName, sName) {
    if (gName === sName) return false;
    if (sName === gameState.lastSentinelle) return false;
    if (players.length > 5 && sName === gameState.lastGardien) return false;
    return true;
}
