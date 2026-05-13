// state.js
// Variables qui vivent le temps d'une session

export let gameState = {
    survie: 0,
    crise: 0,
    oxy: 3,
    gameOver: false,
    suffrage: "Aucun",
    lastSentinelle: null,
    lastGardien: null,
    censoredPlayer: null,
    currentPhase: "DÉSIGNATION",
    currentProposedS: null,
    currentLegislativeCards: [],
    isProcessingAction: false,
    currentPowerActive: false
};

export let players = []; // Liste des objets joueurs {name, conn, role, metier, powerUsed}
export let deck = [];
export let curG = 0; // Index du Gardien actuel
export let curSIdx = -1; // Index de la Sentinelle actuelle
export let votes = { oui: 0, non: 0, total: 0, list: [] };

// Fonction Reset des variables
export function resetState() {
    gameState.survie = 0;
    gameState.crise = 0;
    gameState.oxy = 3;
    gameState.gameOver = false;
    gameState.currentPhase = "DÉSIGNATION";
    currentProposedS: null;
    currentLegislativeCards: [];
    isProcessingAction: false;
    currentPowerActive: false;
    players = [];
    deck = [];
    curG = 0;
    curSIdx = -1;
    votes = { oui: 0, non: 0, total: 0, list: [] };
}
