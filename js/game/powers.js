import { state, players, currentPowerActive } from '../core/state.js';
import { POWER_MAP } from '../core/constants.js';
import { Logger } from '../ui/logger.js';

export function checkCasePower(caseNumber) {
    const n = players.length;
    const config = POWER_MAP[n] || POWER_MAP['default'];
    const power = config[caseNumber];

    if (!power) return;

    state.currentPowerActive = true;
    
    const gardien = players.find(p => p.name === state.lastGardien);
    Logger.add(`SYSTÈME : Case de Crise ${caseNumber} atteinte. Activation du protocole : ${power}.`);

    switch (power) {
        case 'TEST':
            // On force l'ouverture du sélecteur chez le Gardien
            gardien.conn.send({ 
                type: 'FORCE_POWER_SELECT', 
                action: 'REQUEST_BLOOD_TEST', 
                title: 'ANALYSE BIOLOGIQUE (DÉCRET)' 
            });
            break;
        case 'EXEC':
            // À implémenter : openTargetSelector('REQUEST_EXECUTION', 'PROTOCOLE D\'ÉLIMINATION')
            break;
        case 'CENSURE':
            // On force l'ouverture du sélecteur chez le Gardien
            gardien.conn.send({ 
                    type: 'FORCE_POWER_SELECT', 
                    action: 'REQUEST_CENSURE', 
                    title: 'PROTOCOLE DE CENSURE' 
                });
            break;
    }
}
