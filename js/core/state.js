export let players = [];
export let deck = [];
export let curG = 0;
export let curSIdx = -1;
export let votes = { oui: 0, non: 0, total: 0, list: [] };
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
export let isProcessingAction = false;
export let currentPhase = "DÉSIGNATION";
export let currentProposedS = null;
export let currentLegislativeCards = [];
export let currentPowerActive = false;
