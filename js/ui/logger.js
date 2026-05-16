// logger.js

export const Logger = { 
    add: (message) => {
        const log = document.getElementById('log');
        if (!log) return;
        
        const time = new Date().toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        // --- LOGIQUE DE COLORATION ---
        let color = "#2ecc71"; // Vert terminal par défaut (neutre)
        
        switch (true) {
            // Rouge pour le réseau et les pannes de signal
            case /SIGNAL PERDU|RECONNEXION|SORTIE LOBBY|PANNE DE SIGNAL/.test(message):
                color = "#ff5555";
                break;
                
            // Jaune pour le Conseil, les scrutins et les votes
            case /CONSEIL|SCRUTIN|VOTE/.test(message):
                color = "#f1c40f";
                break;
                
            // Violet Magenta pour les capacités spéciales de métiers ou événements de cases
            case /POUVOIR|EXÉCUTION|CENSURE/.test(message):
                color = "#ff00ff";
                break;
                
            // Bleu pour la législation et les décrets du système
            case /LÉGISLATION|URGENCE/.test(message):
                color = "#3498db";
                break;
                
            // Blanc brillant pour la clôture de la partie
            case /FIN DE PARTIE/.test(message):
                color = "#ffffff";
                break;
                
            default:
                color = "#2ecc71"; // Sécurité : retour au vert par défaut
        }
        
        const entry = document.createElement('div');
        // L'heure reste discrète en gris opaque, le message prend la couleur du filtre
        entry.innerHTML = `<span style="opacity: 0.4; color: #e0e0e0;">[${time}]</span> <span style="color: ${color};">> ${message}</span>`;
        
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight; // Scroll automatique
    },
    
    clear: () => {
        const log = document.getElementById('log');
        if (log) log.innerHTML = "<div>[SYSTÈME] : Redémarrage d'urgence effectué.</div>";
    }
};
