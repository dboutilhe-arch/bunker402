// powers.js

import { players } from '../core/state.js';
import { Logger } from '../ui/logger.js';

export function testPlayerBlood(requester, targetName) {
    const target = players.find(p => p.name === targetName);
    if (!target) return;

    // Règle : Infecté = Alpha, Infecté, Immunisé | Sain = Survivant, Mycologue
    const isInfected = ['A', 'I', 'IM'].includes(target.role);
    const bloodResult = isInfected ? "INFECTÉ" : "SAIN";

    Logger.add(`ANALYSE : Le Docteur ${requester.name} a scanné ${targetName}.`);

    requester.conn.send({
        type: 'BLOOD_TEST_RESULT',
        target: targetName,
        result: bloodResult
    });
}
