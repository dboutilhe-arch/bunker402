// Variables Globales de l'état du bunker
let peer = null; 
let players = []; 
let deck = []; 
let curG = 0; 
let curSIdx = -1;
let votes = { oui: 0, non: 0, total: 0, list: [] };
let state = { survie: 0, crise: 0, oxy: 3, gameOver: false, suffrage: "Aucun" };
let isProcessingAction = false;
let lastSentinelle = null;
let lastGardien = null;
let currentPhase = "DÉSIGNATION"; // "DÉSIGNATION", "VOTE", "LÉGISLATION_G", "LÉGISLATION_S"
let currentProposedS = null;      // Nom de la sentinelle proposée
let currentLegislativeCards = []; // Cartes envoyées au Gardien ou à la Sentinelle
