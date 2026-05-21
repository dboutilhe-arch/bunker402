// js/core/mobile-constants.js

export const DECREETS_DB_LOCAL = {
    // --- PROTOCOLES DE SURVIE (BLEU) ---
    'test_sanguin': { name: "Test Sanguin", type: "S", symbol: "⚡", desc: "Le Gardien actuel vérifie secrètement la carte de Test Sanguin d'un joueur." },
    'reorganisation': { name: "Réorganisation", type: "S", symbol: "⚡", desc: "Le Gardien force 2 joueurs à échanger leur carte Test Sanguin (y compris lui-même). N'impacte pas l'allégeance initiale." },
    'purge': { name: "Purge des Systèmes", type: "S", symbol: "⚡", desc: "Le Gardien défausse la carte Décret de son choix sur le plateau des Directives de Crise. Son effet permanent s'arrête." },
    'neutralisation_ciblee': { name: "Neutralisation Ciblée", type: "S", symbol: "⚡", desc: "Le Gardien exécute immédiatement un joueur de son choix." },
    'presse': { name: "Liberté de la Presse", type: "S", symbol: "♾️", desc: "Le Gardien doit montrer la carte qu'il défausse avant de donner les 2 autres à la Sentinelle." },
    'rebellion': { name: "Rébellion", type: "S", symbol: "♾️", desc: "L'Alpha ne peut pas gagner par élection. S'annule dès qu'un Décret Directives de Crise est voté." },
    'contre_pouvoir': { name: "Contre-Pouvoir", type: "S", symbol: "♾️", desc: "C’est la Sentinelle qui pioche les 3 premières cartes, en défausse une, et donne les 2 restantes au Gardien." },
    'fuite_air_s': { name: "Fuite d'Air", type: "S", symbol: "♾️", desc: "L'Oxygène est par défaut à -1. Il ne peut plus monter au-dessus du Niveau 2 (ou Niveau 1 si double Fuite)." },
    'propagande_s': { name: "Propagande Positive", type: "S", symbol: "♾️", desc: "N'a aucun effet mécanique. Maintient artificiellement le moral du personnel." },
    //'transparence': { name: "Transparence", type: "S", symbol: "♾️", desc: "La Sentinelle doit annoncer à haute voix les deux cartes reçues avant d'en défausser une." },
    //'commission': { name: "Commission", type: "S", symbol: "⚡", desc: "La Sentinelle regarde la défausse de la partie pour voir ce qui a été jeté." },

    // --- DIRECTIVES DE CRISE (ROUGE) ---
    'censure': { name: "Censure", type: "C", symbol: "⚡", desc: "Le Gardien désigne un joueur qui ne pourra pas voter au prochain tour." },
    'loi_493': { name: "49.3", type: "C", symbol: "⚡", desc: "Le prochain Gardien choisit le décret parmi les 2 restants après les avoir montrés à la Sentinelle." },
    'reelection': { name: "Réélection", type: "C", symbol: "⚡", desc: "Le binôme Gardien/Sentinelle actuel reste en place pour un tour supplémentaire (sans vote)." },
    'sabotage': { name: "Sabotage", type: "C", symbol: "⚡", desc: "Réduire le Niveau d'Oxygène de 1." },
    'coup_etat': { name: "Coup d'État", type: "C", symbol: "⚡", desc: "Le Gardien choisit le prochain Gardien (hors lui-même). Le prochain tour sera extraordinaire." },
    'court_circuit': { name: "Court-Circuit", type: "C", symbol: "⚡", desc: "Défaussez la carte de Suffrage active. Si aucune active, réduire l'Oxygène de 1." },
    'licenciement': { name: "Licenciement", type: "C", symbol: "⚡", desc: "Le Gardien cible un joueur qui ne pourra plus utiliser son pouvoir de carte Métier." },
    'execution_sommaire': { name: "Exécution Sommaire", type: "C", symbol: "⚡", desc: "Le Gardien exécute immédiatement un joueur de son choix." },
    'prophete': { name: "Prophète", type: "C", symbol: "♾️", desc: "Le Gardien devient Prophète. Il gère la pioche (4 cartes) mais ne vote plus. S'annule si Survie votée ou Prophète tué." },
    'talion': { name: "Loi du Talion", type: "C", symbol: "♾️", desc: "Si un vote échoue, le joueur qui devait être Gardien est privé de vote au tour suivant." },
    'fuite_air_c': { name: "Fuite d'Air", type: "C", symbol: "♾️", desc: "L'Oxygène est par défaut à -1. Il ne peut plus monter au-dessus du Niveau 2." },
    'climat_terreur': { name: "Climat de Terreur", type: "C", symbol: "♾️", desc: "N'a aucun effet mécanique. Rappelle simplement au personnel qui dirige." },
    //'secret_etat': { name: "Secret d’État", type: "C", symbol: "♾️", desc: "Tous les pouvoirs de type 'Regarder la pioche' ou 'Regarder la défausse' sont annulés." },
    //'silence': { name: "Code de Silence", type: "C", symbol: "♾️", desc: "Le Gardien interdit un mot. Si un joueur le prononce, il perd son vote au tour suivant." },

    // --- SUFFRAGE (GRIS) ---
    'conseil_restreint': { name: "Conseil Restreint", type: "F", symbol: "🗳️", desc: "Les votes du Gardien et de la Sentinelle comptent double." },
    'greve_zele': { name: "Grève du Zèle", type: "F", symbol: "🗳️", desc: "Les votes NON comptent double." },
    'chambre_noire': { name: "Chambre Noire", type: "F", symbol: "🗳️", desc: "Le choix individuel des votes (Oui/Non) reste anonyme sur la console centrale." },
    'insurrection_populaire': { name: "Insurrection Populaire", type: "F", symbol: "🗳️", desc: "Les votes du personnel ayant le métier de Civil comptent double." }
};
