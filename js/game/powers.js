import { state, players } from '../core/state.js';
import { nextTurn } from './engine.js';
import { Logger } from '../ui/logger.js';
import { POWER_MAP } from '../core/constants.js';

/**
 * Analyse biologique d'un joueur (Pouvoir du Docteur ou Case de Crise)
 */
export function testPlayerBlood(requester, targetName) {
    const target = players.find(p => p.name === targetName);
    if (!target) return;

    // Règles de Sang :
    // INFECTÉ : Alpha (A), Infecté (I), Immunisé (IM)
    // SAIN : Survivant (S), Mycologue (M)
    const isInfected = ['A', 'I', 'IM'].includes(target.role);
    const bloodResult = isInfected ? "INFECTÉ" : "SAIN";

    // On logue l'action sur le PC
    Logger.add(`POUVOIR : Le Docteur ${requester.name} a prélevé un échantillon de ${targetName}.`);

    // On renvoie le résultat UNIQUEMENT au Docteur (Terminal mobile)
    requester.conn.send({
        type: 'BLOOD_TEST_RESULT',
        target: targetName,
        result: bloodResult
    });

    // Si le pouvoir a été déclenché par une case du plateau (Urgence)
    if (state.currentPowerActive) {
        state.currentPowerActive = false;
        
        // On attend 2 secondes pour laisser le temps au joueur de lire son résultat
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
    }
}
