// Constants.js
// Logique Pure et données
// ôles, Config, PowerMap)

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

export const POWER_MAP = {
    default: { 1: 'TEST', 2: 'CENSURE', 3: 'TEST', 4: 'EXEC', 5: 'EXEC' }
};
