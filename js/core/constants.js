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
    default: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }
    //default: { 1: 'TEST', 2: 'CENSURE', 3: 'CENSURE', 4: 'CENSURE', 5: 'CENSURE' }

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

//export const JOBS_LIST = ['Shérif', 'Docteur', 'Technicien', 'Journaliste', 'Militaire', 'Psychologue', 'Contrebandier', 'Fossoyeur', 'Éclaireur', 'Vigile', 'Scientifique', 'Ingénieur', 'Pilote'];
//export const JOBS_LIST = ['Militaire', 'Docteur', 'Intendant', 'Shérif', 'Fossoyeur', 'Journaliste', 'Archiviste', 'Vigile']
//TEST
export const JOBS_LIST = ['Militaire', 'Fossoyeur']
export const DEFAULT_JOB = "Sans emploi";

/**
 * Base de données des Décrets du Bunker 402
 * Types -> S: Survie (Bleu), C: Crise (Rouge), F: Suffrage (Gris)
 * Symboles -> ⚡: Immédiat, ♾️: Permanent, 🗳️: Scrutin
 */
export const DECREETS_DATABASE = {
    // --- PROTOCOLES DE SURVIE (BLEU) ---
    'test_sanguin': { name: "Test Sanguin", type: "S", symbol: "⚡", desc: "Le Gardien actuel vérifie secrètement la carte de Test Sanguin d'un joueur." },
    'reorganisation': { name: "Réorganisation", type: "S", symbol: "⚡", desc: "Le Gardien force 2 joueurs à échanger leur carte Test Sanguin (y compris lui-même). N'impacte pas l'allégeance initiale." },
    'commission': { name: "Commission", type: "S", symbol: "⚡", desc: "La Sentinelle regarde la défausse de la partie pour voir ce qui a été jeté." },
    'purge': { name: "Purge des Systèmes", type: "S", symbol: "⚡", desc: "Le Gardien défausse la carte Décret de son choix sur le plateau des Directives de Crise. Son effet permanent s'arrête." },
    'presse': { name: "Liberté de la Presse", type: "S", symbol: "♾️", desc: "Le Gardien doit montrer la carte qu'il défausse avant de donner les 2 autres à la Sentinelle." },
    'rebellion': { name: "Rébellion", type: "S", symbol: "♾️", desc: "L'Alpha ne peut pas gagner par élection. S'annule dès qu'un Décret Directives de Crise est voté." },
    'transparence': { name: "Transparence", type: "S", symbol: "♾️", desc: "La Sentinelle doit annoncer à haute voix les deux cartes reçues avant d'en défausser une." },
    'contre_pouvoir': { name: "Contre-Pouvoir", type: "S", symbol: "♾️", desc: "C’est la Sentinelle qui pioche les 3 premières cartes, en défausse une, et donne les 2 restantes au Gardien." },
    'fuite_air_s': { name: "Fuite d'Air", type: "S", symbol: "♾️", desc: "L'Oxygène est par défaut à -1. Il ne peut plus monter au-dessus du Niveau 2 (ou Niveau 1 si double Fuite)." },

    // --- DIRECTIVES DE CRISE (ROUGE) ---
    'censure': { name: "Censure", type: "C", symbol: "⚡", desc: "Le Gardien désigne un joueur qui ne pourra pas voter au prochain tour." },
    'loi_493': { name: "49.3", type: "C", symbol: "⚡", desc: "Le prochain Gardien choisit le décret parmi les 2 restants après les avoir montrés à la Sentinelle." },
    'reelection': { name: "Réélection", type: "C", symbol: "⚡", desc: "Le binôme Gardien/Sentinelle actuel reste en place pour un tour supplémentaire (sans vote)." },
    'sabotage': { name: "Sabotage", type: "C", symbol: "⚡", desc: "Réduire le Niveau d'Oxygène de 1." },
    'coup_etat': { name: "Coup d'État", type: "C", symbol: "⚡", desc: "Le Gardien choisit le prochain Gardien (hors lui-même). Le prochain tour sera extraordinaire." },
    'court_circuit': { name: "Court-Circuit", type: "C", symbol: "⚡", desc: "Défaussez la carte de Suffrage active. Si aucune active, réduire l'Oxygène de 1." },
    'licenciement': { name: "Licenciement", type: "C", symbol: "⚡", desc: "Le Gardien cible un joueur qui ne pourra plus utiliser son pouvoir de carte Métier." },
    'silence': { name: "Code de Silence", type: "C", symbol: "♾️", desc: "Le Gardien interdit un mot. Si un joueur le prononce, il perd son vote au tour suivant." },
    'prophete': { name: "Prophète", type: "C", symbol: "♾️", desc: "Le Gardien devient Prophète. Il gère la pioche (4 cartes) mais ne vote plus. S'annule si Survie votée ou Prophète tué." },
    'talion': { name: "Loi du Talion", type: "C", symbol: "♾️", desc: "Si un vote échoue, le joueur qui devait être Gardien est privé de vote au tour suivant." },
    'fuite_air_c': { name: "Fuite d'Air", type: "C", symbol: "♾️", desc: "L'Oxygène est par défaut à -1. Il ne peut plus monter au-dessus du Niveau 2." },
    'secret_etat': { name: "Secret d’État", type: "C", symbol: "♾️", desc: "Tous les pouvoirs de type 'Regarder la pioche' ou 'Regarder la défausse' sont annulés." },

    // --- SUFFRAGE (GRIS) ---
    'conseil_restreint': { name: "Conseil Restreint", type: "F", symbol: "🗳️", desc: "Les votes du Gardien et de la Sentinelle comptent double." },
    'greve_zele': { name: "Grève du Zèle", type: "F", symbol: "🗳️", desc: "Les votes NON comptent double." },
    'chambre_noire': { name: "Chambre Noire", type: "F", symbol: "🗳️", desc: "Le choix individuel des votes (Oui/Non) reste anonyme sur la console centrale." },
    'insurrection_populaire': { name: "Insurrection Populaire", type: "F", symbol: "🗳️", desc: "Les votes du personnel ayant le métier de Civil comptent double." }
};

/**
 * Liste exacte des cartes à injecter dans le deck lors de l'initialisation
 */
export const INITIAL_DECK_LIST = [
    //TEST
    'conseil_restreint', 'greve_zele', 'chambre_noire', 'licenciement'
    /*
    // 10 Bleues
    'test_sanguin', 'test_sanguin', 'fuite_air_s', 'rebellion', 'purge', 'reorganisation',
    // 'commission', 'presse', 'transparence', 'contre_pouvoir',
    // 15 Rouges
    'censure', 'censure', 'censure', 'sabotage', 'fuite_air_c', 'court_circuit', 'coup_etat', 'loi_493', 'loi_493', 'reelection', 'prophete', 'talion', 'licenciement',
    // 'silence', 'secret_etat',
    // 4 Grises
    'conseil_restreint', 'greve_zele', 'chambre_noire', 'insurrection_populaire'
    */
];
