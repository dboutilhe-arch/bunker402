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
}
