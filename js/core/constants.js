// Constants.js
// Ce fichier contient les données "statiques" qui ne changent pas pendant la partie. Cela permet d'équilibrer le jeu sans fouiller dans le code logique.

export const DECK_COMPOSITION = {
    S: 40, // Survie
    C: 60, // Crise
    F: 10  // Suffrage
};

export const ROLES_CONFIG = {
    SMALL: { min: 5, max: 6, roles: ['S', 'S', 'S', 'S', 'I', 'A'] },
    MEDIUM: { min: 7, max: 10, roles: ['S', 'S', 'S', 'S', 'S', 'S', 'I', 'I', 'A', 'S'] },
    LARGE: { min: 11, max: 100, roles: ['S', 'S', 'S', 'S', 'S', 'S', 'I', 'I', 'A', 'M', 'IM'] }
};

export const JOBS_LIST = [
    'Shérif', 'Docteur', 'Technicien', 'Journaliste', 'Militaire', 
    'Psychologue', 'Contrebandier', 'Fossoyeur', 'Éclaireur', 
    'Vigile', 'Scientifique', 'Ingénieur', 'Pilote'
];

// Répartition des pouvoirs de case en fonction du nombre de joueur
export const POWER_MAP = {
    // TEST
    default: { 1: 'TEST', 2: 'TEST', 3: 'TEST', 4: 'TEST', 5: 'TEST' }

    // 5 joueurs
    //5:  { 3: null, 4: 'TEST', 5: 'EXEC' },
    // 6 à 7 joueurs
    //6:  { 3: 'TEST', 4: 'TEST', 5: 'EXEC' },
    //7:  { 3: 'TEST', 4: 'TEST', 5: 'EXEC' },
    // 8 à 10 joueurs
    //8:  { 3: 'TEST', 4: 'EXEC', 5: 'EXEC' },
    //9:  { 3: 'TEST', 4: 'EXEC', 5: 'EXEC' },
    //10: { 3: 'TEST', 4: 'EXEC', 5: 'EXEC' },
    // 11 joueurs et plus
    //default: { 2: 'CENSURE', 3: 'TEST', 4: 'EXEC', 5: 'EXEC' }
};
