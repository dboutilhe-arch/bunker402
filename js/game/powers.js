import { state, players } from '../core/state.js'; 
import { nextTurn, resolveVote } from './engine.js';
import { Logger } from '../ui/logger.js';
import { POWER_MAP } from '../core/constants.js';
import { syncTerminals, triggerWin, updatePlayerStatusUI, clearCouncilVisuals } from '../ui/renderer.js';

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

    // --- Synchronisation immédiate de la liste des vivants ---
    syncTerminals();

    // --- CORRECTION VOTE BLOQUÉ ---
    if (state.currentPhase === "VOTE") {
        const aliveCount = players.filter(p => p.isAlive).length;
        if (state.votes.total >= aliveCount) {
            Logger.add("SYSTÈME : L'exécution a clos le scrutin.");
            resolveVote();
        }
    }

    const isInfected = ['A', 'I', 'IM'].includes(target.role);
    const revealResult = isInfected ? "INFECTÉ" : "SAIN";

    Logger.add(`🚨 EXÉCUTION : ${requester.name} a éliminé ${targetName}.`);
    Logger.add(`SYSTÈME : Le sujet ${targetName} était ${revealResult}.`);

    // On envoie le signal de mort
    target.conn.send({ type: 'YOU_ARE_DEAD', reveal: revealResult });

    // --- LISTES DE CIBLES & INTERFACES ---
    // On prévient tout le monde de rafraîchir ses listes
    players.forEach(p => {
        if (p.conn && p.conn.open) {
            p.conn.send({ type: 'REFRESH_INTERFACE' }); 
        }
    });

    updatePlayerStatusUI(target, revealResult);

    // --- Nettoyage des visuels si le mort était au conseil ---
    const targetIdx = players.findIndex(p => p.name === targetName);
    if (targetIdx === state.curG || targetIdx === state.curSIdx) {
        clearCouncilVisuals(); // Enlève l'étoile et la bordure jaune/bleue
    }

    if (target.role === 'A') {
        return triggerWin("SURVIVANTS", "L'Alpha a été éliminé.");
    }

    // Gestion du tour suivant si membre du conseil tué
    if (targetIdx === state.curG || targetIdx === state.curSIdx) {
        Logger.add("SYSTÈME : Membre du conseil éliminé. Passage au tour suivant.");
        state.currentPowerActive = false;
        setTimeout(() => {
            state.curG = (state.curG + 1) % players.length;
            nextTurn();
        }, 2000);
        return;
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
 * Censure (Pouvoir du Décret Censure ou Case de Crise)
 */
export function applyCensure(requester, targetName) {
    const target = players.find(p => p.name === targetName);
    if (!target || !target.isAlive || target.isCensored) return;

    target.isCensored = true;
    target.censoredBy = requester.name;

    Logger.add(`🚫 CENSURE : ${requester.name} a réduit ${targetName} au silence.`);

    // Si un vote est en cours, on agit immédiatement sur le scrutin
    if (state.currentPhase === "VOTE") {
        const voteIdx = state.votes.list.findIndex(v => v.name.toLowerCase() === targetName.toLowerCase());
        if (voteIdx !== -1) {
            const oldVote = state.votes.list[voteIdx];
            state.votes[oldVote.choice.toLowerCase()]--;
            state.votes.total--;
            state.votes.list.splice(voteIdx, 1);
        }
        // On lui envoie l'écran de censure tout de suite
        target.conn.send({ type: 'CENSORED_ALERT', by: requester.name });
        
        // On vérifie si cela termine le vote
        const eligibleCount = players.filter(p => p.isAlive && !p.isCensored).length;
        if (state.votes.total >= eligibleCount) {
            resolveVote();
        }
    }

    updateCensureUI(target);
    syncTerminals();

    if (state.currentPowerActive) {
        state.currentPowerActive = false;
        setTimeout(() => {
            state.curG = (state.curG + 1) % players.length;
            state.isProcessingAction = false;
            nextTurn();
        }, 2000);
    }
}

/**
 * Vérification des pouvoirs lors de l'atteinte d'une case de crise
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
