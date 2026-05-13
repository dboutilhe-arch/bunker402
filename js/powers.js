// Test Sanguin
function testPlayerBlood(requester, targetName) {
    const target = players.find(p => p.name === targetName);
    if (!target) return;

    let bloodResult = "";
    
    // Règles de Sang :
    // INFECTÉ : Alpha (A), Infecté (I), Immunisé (IM)
    // SAIN : Survivant (S), Mycologue (M)
    const isInfected = ['A', 'I', 'IM'].includes(target.role);
    bloodResult = isInfected ? "INFECTÉ" : "SAIN";

    // On logue l'action sur le PC (nourrit la paranoïa)
    addLog(`POUVOIR : Le Docteur ${requester.name} a prélevé un échantillon de ${targetName}.`);

    // On renvoie le résultat UNIQUEMENT au Docteur
    requester.conn.send({
        type: 'BLOOD_TEST_RESULT',
        target: targetName,
        result: bloodResult
    });

    if (currentPowerActive) {
        currentPowerActive = false;
        // On attend que le joueur ait cliqué sur OK pour passer au tour suivant
        // Ou on le fait automatiquement ici après un délai :
        setTimeout(() => {
            curG = (curG + 1) % players.length;
            isProcessingAction = false;
            nextTurn();
        }, 2000); 
    }
}

// Censure
function applyCensure(requester, targetName) {
    state.censoredPlayer = targetName;
    
    addLog(`POLITIQUE : Le Gardien ${requester.name} a censuré ${targetName}.`);
    
    // On prévient la cible (Optionnel mais fun pour l'ambiance)
    const target = players.find(p => p.name === targetName);
    if (target) {
        target.conn.send({ 
            type: 'NOTIFY_CENSURE', 
            message: "Le système vous a blacklisté pour le prochain conseil." 
        });
    }

    // On libère le tour
    if (currentPowerActive) {
        currentPowerActive = false;
        setTimeout(() => {
            curG = (curG + 1) % players.length;
            isProcessingAction = false;
            nextTurn();
        }, 1500);
    }
}
