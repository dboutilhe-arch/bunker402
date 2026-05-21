 
// js/network/peer-manager.js
import { handlePlayerData, handlePlayerDisconnect } from './handlers.js';
import { generateLobbyQR } from '../main.js';

let peer = null;

export function startServer() {
    const customId = document.getElementById('custom-id').value.trim();
    if (!customId) return alert("Veuillez saisir un code !");
    
    peer = new Peer(customId, { config: {'iceServers': [{ url: 'stun:stun.l.google.com:19302' }]} });
    
    peer.on('open', id => {
        document.getElementById('server-creation').style.display = 'none';
        document.getElementById('lobby-active').style.display = 'block';
        document.getElementById('display-id').innerText = id;
        generateLobbyQR(id);
    });

    document.getElementById('admin-reset').style.display = 'block';
    
    peer.on('error', err => {
        if (err.type === 'unavailable-id') alert("Ce code est déjà utilisé.");
        else location.reload();
    });
    
    peer.on('connection', (conn) => {
        conn.on('open', () => {
            // On redirige vers les handlers pour le traitement des données
            conn.on('data', data => handlePlayerData(conn, data));
            // On redirige vers les handlers pour la déconnexion
            conn.on('close', () => handlePlayerDisconnect(conn));
        });
    });
}
