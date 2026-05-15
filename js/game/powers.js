import { state, players } from '../core/state.js'; 
import { nextTurn } from './engine.js';
import { Logger } from '../ui/logger.js';
import { POWER_MAP } from '../core/constants.js';
import { syncTerminals, triggerWin, updatePlayerStatusUI } from '../ui/renderer.js';

/**
 * Analyse biologique d'un joueur (Pouvoir du Docteur ou Case de Crise)
 */
export function testPlayerBlood(requester, targetName) {
    const target = players.find(p => p.name === targetName);
    if (!target) return;

    const isInfected = ['A', 'I', 'IM'].includes(target.role);
    const bloodResult = isInfected ? "INFECTÉ" : "SAIN";

    Logger.add(`POUVOIR : ${requester.name} a analysé ${targetName}.`);

    requester.conn.send({
        type: 'BLOOD_TEST_RESULT',
        target: targetName,
        result: bloodResult
    });

    // Gestion de la fin de l'action de case
    if (state.currentPowerActive) {
        state.currentPowerActive = false;
        syncTerminals();
        setTimeout(() => {
            state.curG = (state.curG + 1) % players.length;
            state.isProcessingAction = false;
            nextTurn();
        }, 2000); 
    }
}

/**
 * Exécution (Pouvoir du Militaire ou Case de Crise)
 */
export function executePlayer(requester, targetName) {
    const target = players.find(p => p.name === targetName);
    if (!target || !target.isAlive) return;

    target.isAlive = false;
    const isInfected = ['A', 'I', 'IM'].includes(target.role);
    const revealResult = isInfected ? "INFECTÉ" : "SAIN";

    Logger.add(`🚨 EXÉCUTION : ${requester.name} a éliminé ${targetName}.`);
    Logger.add(`SYSTÈME : Le sujet ${targetName} était ${revealResult}.`);

    target.conn.send({ type: 'YOU_ARE_DEAD', reveal: revealResult });

    // Mise à jour visuelle immédiate sur l'écran central
    updatePlayerStatusUI(target, revealResult);

    if (target.role === 'A') {
        return triggerWin("SURVIVANTS", "L'Alpha a été éliminé.");
    }

    if (state.currentPowerActive) {
        state.currentPowerActive = false;
        syncTerminals(); 
        setTimeout(() => {
            state.curG = (state.curG + 1) % players.length;
            state.isProcessingAction = false;
            nextTurn();
        }, 2000); 
    }
}

/**
 * Vérification des pouvoirs lors de l'atteinte d'une case de crise
 * (A déplacer ici si ce n'est pas déjà fait)
 */
export function checkCasePower(caseNumber) {
    const n = players.length;
    const config = POWER_MAP[n] || POWER_MAP['default'];
    const power = config[caseNumber];

    if (!power) return;

    state.currentPowerActive = true;
    const gardien = players[state.curG];
    Logger.add(`SYSTÈME : Case de Crise ${caseNumber} atteinte. Protocole : ${power}.`);

    switch (power) {
        case 'TEST':
            gardien.conn.send({ 
                type: 'FORCE_POWER_SELECT', 
                action: 'REQUEST_BLOOD_TEST', 
                title: 'ANALYSE BIOLOGIQUE (DÉCRET)' 
            });
            break;
        case 'CENSURE':
            gardien.conn.send({ 
                type: 'FORCE_POWER_SELECT', 
                action: 'REQUEST_CENSURE', 
                title: 'PROTOCOLE DE CENSURE' 
            });
            break;
        case 'EXEC':
            gardien.conn.send({ 
                type: 'FORCE_POWER_SELECT', 
                action: 'REQUEST_EXECUTION', 
                title: 'EXÉCUTION SOMMAIRE' 
            });
            break;
    }
}
