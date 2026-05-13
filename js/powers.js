function testPlayerBlood(requester, targetName) {
    const target = players.find(p => p.name === targetName);
    if (!target) return;

    let bloodResult = "";
    
    // Logique basée sur tes règles :
    // Infecté : Alpha, Infectés, Immunisé
    // Sain : Survivants, Mycologue
    if (['A', 'I', 'IM'].includes(target.role)) {
        bloodResult = "INFECTÉ";
    } else {
        bloodResult = "SAIN";
    }

    addLog(`POUVOIR : ${requester.name} a analysé le sang de ${targetName}.`);

    // Envoi du résultat UNIQUEMENT au demandeur
    requester.conn.send({
        type: 'BLOOD_TEST_RESULT',
        target: targetName,
        result: bloodResult
    });
}
