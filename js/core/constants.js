
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

export const JOBS_LIST = ['Shérif', 'Docteur', 'Technicien', 'Journaliste', 'Militaire', 'Psychologue', 'Contrebandier', 'Fossoyeur', 'Éclaireur', 'Vigile', 'Scientifique', 'Ingénieur', 'Pilote'];
