import { state, players } from '../core/state.js';
import { DECREETS_DATABASE, INITIAL_DECK_LIST } from '../core/constants.js';
import { Logger } from '../ui/logger.js';
import { render, syncTerminals, triggerWin, clearCouncilVisuals } from '../ui/renderer.js';
import { checkCasePower, executeDecreetPower } from './powers.js';
import { nextTurn } from './engine.js';

/**
 * Fonction utilitaire de pioche sécurisée avec recyclage de la défausse
 */
export function drawCard() {
    if (state.deck.length === 0) {
        if (state.discard.length === 0) {
            Logger.add("ALERTE CRITIQUE : Plus aucune carte disponible dans tout le complexe !");
            return null;
        }
        // Recyclage
        state.deck = [...state.discard].sort(() => Math.random() - 0.5);
        state.discard = [];
        Logger.add("🔊 SYSTÈME : Pioche épuisée. Défausse recyclée et remélangée.");
    }
    return state.deck.pop();
}

/**
 * Handler pour la défausse du Gardien
 */
export function handleDiscardFromNet(cardId, remainingCards) {
    state.discard.push(cardId); 
    state.currentLegislativeCards = remainingCards; // Contient les 2 cartes restantes

    // INTERCEPTION 49.3 ACTIVÉ
    if (state.loi493Active) {
        state.loi493Active = false; // Effet consommé !
        state.currentPhase = "LÉGISLATION_493"; // Nouvelle phase temporaire pour la synchro

        Logger.add(`⚖️ SYSTÈME [49.3] : Le Gardien transmet le visuel des 2 décrets restants à la Sentinelle.`);

        // 1. On donne le visuel "Lecture seule" à la Sentinelle
        if (players[state.curSIdx] && players[state.curSIdx].conn.open) {
            players[state.curSIdx].conn.send({ 
                type: 'SENTINELLE_493_VIEW', 
                cards: state.currentLegislativeCards 
            });
        }

        // 2. On met instantanément les AUTRES joueurs en attente
        players.forEach((p, idx) => {
            if (p.isAlive && idx !== state.curG && idx !== state.curSIdx) {
                p.conn.send({ type: 'WAIT_LEGISLATION', step: 'CHOIX FINAL GARDIEN (49.3)' });
            }
        });

        // 3. On rallume l'écran du Gardien pour qu'il choisisse la carte à PROMULGUER
        setTimeout(() => {
            players[state.curG].conn.send({ 
                type: 'GARDIEN_493_PICK', 
                cards: state.currentLegislativeCards 
            });
        }, 100);

    } else {
        // --- FLUX NORMAL STANDARD ---
        state.currentPhase = "LÉGISLATION_S";
        players.filter(p => p.isAlive).forEach(p => p.conn.send({ type: 'WAIT_LEGISLATION', step: 'SENTINELLE' }));
        setTimeout(() => {
            if (players[state.curSIdx] && players[state.curSIdx].conn.open) {
                players[state.curSIdx].conn.send({ type: 'SENTINELLE_PICK', cards: state.currentLegislativeCards });
            }
        }, 100);
    }

    syncTerminals();
    render();
}

/**
 * Application d'un décret (Survie, Crise ou Suffrage)
 */
export function applyDecret(cardId, type, isForced = false) {
    const card = DECREETS_DATABASE[cardId];
    clearCouncilVisuals();
    state.lastSentinelle = players[state.curSIdx].name;
    state.lastGardien = players[state.curG].name;
    
    // Import dynamique pour éviter une dépendance cyclique lors de la mise à jour de l'UI
    import('../ui/renderer.js').then(m => m.updateLastCouncil());

    let decreetBloquant = false;

    if (cardId === 'prophete') {
        state.propheteIdx = state.curG; // Le Gardien actuel devient le Prophète
        Logger.add(`🔮 PROPHÉTIE : ${players[state.propheteIdx].name} abandonne son droit de vote et devient le PROPHÈTE !`);
    }

    if (type === 'S') {
        state.survie++;
        state.slotsSurvieCards.push(cardId); // Le point reste TOUJOURS acquis sur le plateau

        // 🔒 GESTION DE L'EFFET PERMANENT BLEU
        if (card.symbol === '♾️') {
            if (state.activeEffectsS.length >= 2) {
                const oldestEffectId = state.activeEffectsS.shift(); // Retire le plus ancien du registre d'effets
                Logger.add(`🛡️ SYSTÈME : Le décret permanent '${DECREETS_DATABASE[oldestEffectId].name.toUpperCase()}' est neutralisé (Limite de 2 actifs), mais reste sur le plateau.`);
            }
            state.activeEffectsS.push(cardId); // On active le nouvel effet
        }

        if (cardId === 'rebellion' && state.activeEffectsS.includes('rebellion')) {
            state.rebellionActive = true;
            Logger.add("✊ SYSTÈME : Le décret RÉBELLION est promulgué. L'Alpha ne peut plus gagner par élection.");
        }

        if (state.propheteIdx !== -1) {
            Logger.add(`⚖️ SYSTÈME : Un décret de Survie a été voté. Le Prophète ${players[state.propheteIdx].name} perd ses pouvoirs et redevient un citoyen normal.`);
            state.propheteIdx = -1;
            state.activeEffectsC = state.activeEffectsC.filter(id => id !== 'prophete'); // On libère l'emplacement d'effet Rouge
        }
        
        if (!isForced) {
            decreetBloquant = executeDecreetPower(cardId);
        }
        
    } else if (type === 'C') {
        state.crise++;
        state.slotsCriseCards.push(cardId); // Le point reste TOUJOURS acquis sur le plateau
        
        // 🔒 GESTION DE L'EFFET PERMANENT ROUGE
        if (card.symbol === '♾️') {
            if (state.activeEffectsC.length >= 2) {
                const oldestEffectId = state.activeEffectsC.shift(); // Retire le plus ancien du registre d'effets
                Logger.add(`💥 SYSTÈME : La directive permanente '${DECREETS_DATABASE[oldestEffectId].name.toUpperCase()}' est neutralisée (Limite de 2 actifs), mais reste sur le plateau.`);
                if (oldestEffectId === 'prophete') state.propheteIdx = -1;
            }
            state.activeEffectsC.push(cardId); // On active le nouvel effet
        }


        if (!isForced) {
            decreetBloquant = executeDecreetPower(cardId);
            checkCasePower(state.crise);
        }

        // On neutralise Rébellion et la retire du tableau des effets bleus actifs
        if (state.rebellionActive) {
            state.rebellionActive = false;
            state.activeEffectsS = state.activeEffectsS.filter(id => id !== 'rebellion');
            
            Logger.add("💥 SYSTÈME : Une Directive de Crise a été promulguée. L'effet du décret RÉBELLION est désormais obsolète (Emplacement d'effet libéré).");
        }
        
    } else if (type === 'F') {
        if (state.slotsSuffrageCard) {
            state.discard.push(state.slotsSuffrageCard);
            Logger.add(`🗳️ SUFFRAGE : L'ancien décret '${state.slotsSuffrageCard}' est écrasé et envoyé à la défausse.`);
        }
        
        state.slotsSuffrageCard = cardId;
        state.suffrage = card.name;
    }

    const maxOxy = getOxygenMaxLimit();
    if (state.oxy > maxOxy) {
        state.oxy = maxOxy;
        Logger.add(`💨 ATMOSPHÈRE : Le niveau d'oxygène s'ajuste au nouveau plafond critique (${state.oxy}/3).`);
    }

    render();
    syncTerminals();

    if (state.survie >= 5) return triggerWin("SURVIVANTS", "Protocoles rétablis.");
    if (state.crise >= 6) return triggerWin("INFECTES", "Infection totale.");

    if (state.oxy <= 0) {
        Logger.add("⚠️ ALERTE : Le niveau d'oxygène a atteint le seuil critique 0 !");
        state.isProcessingAction = false; 
        setTimeout(() => {
            applyForced();
        }, 1500);
        return;
    }

    // --- LOGIQUE DE TRANSITION DE TOUR ---
    if (!state.currentPowerActive && !decreetBloquant) {
        state.curG = (state.curG + 1) % players.length;
        // On saute le joueur s'il est mort OU s'il est le Prophète
        while (!players[state.curG].isAlive || state.curG === state.propheteIdx) {
            state.curG = (state.curG + 1) % players.length;
        }
        setTimeout(() => { 
            state.isProcessingAction = false; 
            nextTurn(); 
        }, 1000);
    } else {
        // ✨ Si decreetBloquant est true (Coup d'état, Censure, Test), on fige et on attend le mobile !
        state.isProcessingAction = true;
    }
}

/**
 * Décret forcé (Oxygène à zéro)
 */
export function applyForced() {
    let cardId = drawCard(); 

    while(cardId && DECREETS_DATABASE[cardId].type === 'F') {
        state.discard.push(cardId);
        cardId = drawCard();
    }

    state.oxy = getOxygenMaxLimit(); 
    
    if(cardId) {
        Logger.add(`URGENCE : Déploiement forcé du décret : ${DECREETS_DATABASE[cardId].name.toUpperCase()} (Pouvoirs désactivés)`);
        applyDecret(cardId, DECREETS_DATABASE[cardId].type, true); 
    }
}

/**
 * Calcule le niveau d'oxygène par défaut en fonction des fuites d'air actives
 */
export function getOxygenMaxLimit() {
    let fuiteCount = 0;
    // On vérifie si l'EFFET est actif, et non pas si la carte est juste posée
    if (state.activeEffectsS.includes('fuite_air_s')) fuiteCount++;
    if (state.activeEffectsC.includes('fuite_air_c')) fuiteCount++;
    
    return Math.max(1, 3 - fuiteCount);
}
