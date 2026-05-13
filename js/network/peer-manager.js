// peer-manager.js
// Communication

import { players, gameState } from '../core/state.js';
import { Logger } from '../ui/logger.js';
import { handlePlayerData } from './handlers.js';

let peer = null;

export function startServer() {
    const customId = document.getElementById('custom-id').value.trim();
    if (!customId) return alert("Veuillez saisir un code !");
    
    peer = new Peer(customId, { 
        config: {'iceServers': [{ url: 'stun:stun.l.google.com:19302' }]} 
    });
    
    peer.on('open', id => {
        document.getElementById('server-creation').style.display = 'none';
        document.getElementById('lobby-active').style.display = 'block';
        document.getElementById('display-id').innerText = id;
        document.getElementById('admin-reset').style.display = 'block';
        Logger.add("Console initialisée. En attente de connexions...");
    });

    peer.on('connection', setupConnection);
    
    peer.on('error', err => {
        Logger.add("Erreur PeerJS : " + err.type, "ALERTE");
    });
}

function setupConnection(conn) {
    conn.on('open', () => {
        conn.on('data', data => handlePlayerData(conn, data));
        
        conn.on('close', () => {
            const p = players.find(pl => pl.conn === conn);
            if (p) Logger.add(`Signal perdu avec ${p.name}`, "ALERTE");
        });
    });
}
