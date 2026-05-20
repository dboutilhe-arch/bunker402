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
    
    // --- PILES DE CARTES DYNAMIQUES ---
    deck: [],       // Contient les IDs des cartes de la pioche (ex: ['censure', 'piston'])
    discard: [],    // Contient les IDs des cartes envoyées en défausse
    
    // Historique des décrets physiquement posés sur le plateau pour l'affichage index
    slotsSurvieCards: [], 
    slotsCriseCards: [],
    slotsSuffrageCard: null,
    activeEffectsS: [], // Contient les IDs des décrets bleus dont l'effet permanent est actif (Max 2)
    activeEffectsC: [], // Contient les IDs des décrets rouges dont l'effet permanent est actif (Max 2)
    rebellionActive: false, // Suivi du décret Rébellion
    loi493Active: false,
    
    // Historique et pointeurs du Conseil
    lastSentinelle: null,
    lastGardien: null,
    censoredPlayer: null,
    vigileBannedPlayer: null, // Pouvoir du Vigile
    curG: 0, 
    curSIdx: -1,
    nextNormalGardien: null, //Stockage du prochain Gardien pour le coup d'état
    nextForcedS: null,

    // Gestion des votes
    votes: { oui: 0, non: 0, total: 0, list: [] },
    
    // Variables de phase et contrôle
    isProcessingAction: false,
    currentPhase: "DÉSIGNATION", 
    currentProposedS: null,      
    currentLegislativeCards: [], // Contient les 3 (ou 2) cartes en main du Conseil
    currentPowerActive: false,

    // Variable de métier
    archivistePowerActive: false
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
    state.discard = [];
    state.slotsSurvieCards = [];
    state.slotsCriseCards = [];
    state.slotsSuffrageCard = null;
    state.activeEffectsS = [];
    state.activeEffectsC = [];
    state.votes = { oui: 0, non: 0, total: 0, list: [] };
    state.isProcessingAction = false;
    state.currentPhase = "DÉSIGNATION";
    state.currentProposedS = null;
    state.currentLegislativeCards = [];
    state.currentPowerActive = false;
    state.rebellionActive = false;
    state.archivistePowerActive = false;
    state.nextNormalGardien = null;
    state.nextForcedS = null;
    state.loi493Active = false;
    state.vigileBannedPlayer = null;
    
    players.forEach(p => {
        p.jobPowerUsed = false;  
        p.casePowerUsed = false; 
        p.isAlive = true;        
        p.isCensored = false;    
        p.censoredBy = "";   
        p.blood = "SAIN";
    });
}
