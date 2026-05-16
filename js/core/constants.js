/**
 * Composition initiale du deck de décrets du Bunker
 * S : Survie (Bleu), C : Crise (Rouge), F : Suffrage / Ordre du jour (Gris)
 */
export const DECK_COMPOSITION = {
    'S': 40,
    'C': 60,
    'F': 10
};

/** 
 * Répartition des rôles par nombre de joueurs
 * S: Survivant, I: Infecté, A: Alpha, M: Mycologue, IM: Immunisé
 */
export const ROLE_COMPOSITIONS = {
    5:  ['A', 'I', 'S', 'S', 'S'],
    6:  ['A', 'I', 'S', 'S', 'S', 'S'],
    7:  ['A', 'I', 'I', 'S', 'S', 'S', 'S'],
    8:  ['A', 'I', 'I', 'S', 'S', 'S', 'S', 'S'],
    9:  ['A', 'I', 'I', 'S', 'S', 'S', 'S', 'S', 'S'],
    10: ['A', 'I', 'I', 'I', 'S', 'S', 'S', 'S', 'S', 'S'],
    11: ['A', 'I', 'I', 'I', 'S', 'S', 'S', 'S', 'S', 'S', 'IM'],
    12: ['A', 'I', 'I', 'I', 'S', 'S', 'S', 'S', 'S', 'S', 'IM', 'M'],
    // Valeur par défaut si on dépasse 12 joueurs
    default: (n) => {
        let base = ['A', 'I', 'I', 'I', 'S', 'S', 'S', 'S', 'S', 'S', 'IM', 'M'];
        while (base.length < n) {
            base.push(Math.random() > 0.3 ? 'S' : 'I');
        }
        return base;
    }
};

// Répartition des pouvoirs de case en fonction du nombre de joueur
export const POWER_MAP = {
    // TEST
    //default: { 1: null, 2: 'CENSURE', 3: 'TEST', 4: 'EXEC', 5: 'EXEC' }
    //default: { 1: 'CENSURE', 2: 'CENSURE', 3: 'CENSURE', 4: 'CENSURE', 5: 'CENSURE' }

    // 5 joueurs
    5:  { 3: null, 4: 'TEST', 5: 'EXEC' },
    // 6 à 7 joueurs
    6:  { 3: 'TEST', 4: 'TEST', 5: 'EXEC' },
    7:  { 3: 'TEST', 4: 'TEST', 5: 'EXEC' },
    // 8 à 10 joueurs
    8:  { 3: 'TEST', 4: 'EXEC', 5: 'EXEC' },
    9:  { 3: 'TEST', 4: 'EXEC', 5: 'EXEC' },
    10: { 3: 'TEST', 4: 'EXEC', 5: 'EXEC' },
    // 11 joueurs et plus
    default: { 2: 'CENSURE', 3: 'TEST', 4: 'EXEC', 5: 'EXEC' }
};

//export const JOBS_LIST = ['Shérif', 'Docteur', 'Technicien', 'Journaliste', 'Militaire', 'Psychologue', 'Contrebandier', 'Fossoyeur', 'Éclaireur', 'Vigile', 'Scientifique', 'Ingénieur', 'Pilote'];
export const JOBS_LIST = ['Militaire', 'Docteur', 'Intendant']
export const DEFAULT_JOB = "Sans emploi";
