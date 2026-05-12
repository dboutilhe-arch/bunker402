// Variables Globales de l'état du bunker
let peer = null; 
let players = []; 
let deck = []; 
let curG = 0; 
let curSIdx = -1;
let votes = { oui: 0, non: 0, total: 0, list: [] };
let state = {  survie: 0, 
               crise: 0, 
               oxy: 3,  
               gameOver: false, 
               suffrage: "Aucun",
               lastSentinelle: null,
               lastGardien: null};
let isProcessingAction = false;
let currentPhase = "DÉSIGNATION"; // "DÉSIGNATION", "VOTE", "LÉGISLATION_G", "LÉGISLATION_S"
let currentProposedS = null;      // Nom de la sentinelle proposée
let currentLegislativeCards = []; // Cartes envoyées au Gardien ou à la Sentinelle
const ROLES_CONFIG = {
    'S': {
        label: "SURVIVANT",
        color: "#3498db", // Bleu
        goal: "🎯 OBJECTIF : Rétablir les protocoles de survie.",
        winCond: "Conditions : 5 décrets BLEUS ou éliminer l'Alpha."
    },
    'I': {
        label: "INFECTÉ",
        color: "#e74c3c", // Rouge
        goal: "🎯 OBJECTIF : Propager l'infection.",
        winCond: "Conditions : 6 décrets ROUGES ou élire l'Alpha comme Sentinelle (si 3 décrets rouges posés)."
    },
    'A': {
        label: "ALPHA",
        color: "#9400d3", // Violet
        goal: "🎯 OBJECTIF : Propager l'infection.",
        winCond: "Conditions : 6 décrets ROUGES ou être élu Sentinelle (si 3 décrets rouges posés)."
    }
};
