// state.js
// Ce fichier centralise toutes les variables qui évoluent pendant la partie.

export let players = []; // On garde players à part car c'est un tableau de référence

export let state = {  
    // Statistiques du bunker
    survie: 0, 
    crise: 0, 
    oxy: 3,  
    gameOver: false, 
    suffrage: "Aucun",
    
    // Historique et censure
    lastSentinelle: null,
    lastGardien: null,
    censoredPlayer: null,

    // Deck et Index
    deck: [], 
    curG: 0, 
    curSIdx: -1,

    // Gestion des votes
    votes: { 
        oui: 0, 
        non: 0, 
        total: 0, 
        list: [] 
    },

    // Variables de phase et contrôle
    isProcessingAction: false,
    currentPhase: "DÉSIGNATION", 
    currentProposedS: null,      
    currentLegislativeCards: [], 
    currentPowerActive: false
};

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
    state.censoredPlayer = null;
    
    state.deck = [];
    state.curG = 0;
    state.curSIdx = -1;
    
    state.votes = { oui: 0, non: 0, total: 0, list: [] };
    
    state.isProcessingAction = false;
    state.currentPhase = "DÉSIGNATION";
    state.currentProposedS = null;
    state.currentLegislativeCards = [];
    state.currentPowerActive = false;
    state.jobPowerUsed: false;
    state.casePowerUsed: false;
    
    // Reset des pouvoirs joueurs sans vider la liste
    players.forEach(p => {
        p.jobPowerUsed = false;  // Métier
        p.casePowerUsed = false; // Case
    });
}
