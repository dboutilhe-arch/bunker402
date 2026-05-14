
// state.js
// Ce fichier centralise toutes les variables qui évoluent pendant la partie.

// L'objet principal de l'état du bunker
export let state = {  
    survie: 0, 
    crise: 0, 
    oxy: 3,  
    gameOver: false, 
    suffrage: "Aucun",
    lastSentinelle: null,
    lastGardien: null,
    censoredPlayer: null
};

// Variables de gestion des joueurs et du deck
export let players = []; 
export let deck = []; 
export let curG = 0; 
export let curSIdx = -1;

// Gestion des votes
export let votes = { 
    oui: 0, 
    non: 0, 
    total: 0, 
    list: [] 
};

// Variables de phase et contrôle
export let isProcessingAction = false;
export let currentPhase = "DÉSIGNATION"; // "DÉSIGNATION", "VOTE", "LÉGISLATION_G", "LÉGISLATION_S"
export let currentProposedS = null;      
export let currentLegislativeCards = []; 
export let currentPowerActive = false;

/**
 * Fonction pour remettre l'état à zéro (utile pour le globalReset)
 */
export function resetGameState() {
    state.survie = 0;
    state.crise = 0;
    state.oxy = 3;
    state.gameOver = false;
    state.suffrage = "Aucun";
    state.lastSentinelle = null;
    state.lastGardien = null;
    
    curG = 0;
    curSIdx = -1;
    votes = { oui: 0, non: 0, total: 0, list: [] };
    
    isProcessingAction = false;
    currentPhase = "DÉSIGNATION";
    currentProposedS = null;
    currentLegislativeCards = [];
    currentPowerActive = false;
    
    // Note : On ne vide pas players ici car ils restent dans le lobby
    players.forEach(p => p.powerUsed = false);
}
