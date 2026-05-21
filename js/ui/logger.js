// js/ui/logger.js

export const Logger = { 
    add: (message) => {
        const log = document.getElementById('log');
        if (!log) return;
        
        const time = new Date().toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        // --- LOGIQUE DE COLORATION CLINIQUE ---
        let color = "#00e5ff"; // Cyan médical par défaut
        
        switch (true) {
            // Rouge Sang pour les urgences, alertes, purges, morts
            case /SIGNAL PERDU|RECONNEXION|SORTIE LOBBY|PANNE DE SIGNAL|MORT|ÉLIMINÉ|PURGE|SABOTAGE/.test(message):
                color = "#ff1744";
                break;
                
            // Jaune/Or Warning pour les changements de conseils, scrutins, coup d'état
            case /CONSEIL|SCRUTIN|VOTE|COUP D'ÉTAT|RÉÉLECTION/.test(message):
                color = "#ffea00";
                break;
                
            // Violet Toxique/Mystique pour l'Alpha, le Mycologue, le Prophète ou les pouvoirs
            case /POUVOIR|EXÉCUTION|CENSURE|PROPHÉTIE|PROPHÈTE/.test(message):
                color = "#d500f9";
                break;
                
            // Vert d'eau apaisant pour les réussites et la législation bleue
            case /LÉGISLATION|URGENCE|RÉORGANISATION/.test(message):
                color = "#1de9b6";
                break;
                
            // Blanc éclatant pour le système et la fin de partie
            case /FIN DE PARTIE|SYSTÈME/.test(message):
                color = "#ffffff";
                break;
                
            default:
                color = "#00e5ff"; // Cyan
        }
        
        const entry = document.createElement('div');
        entry.innerHTML = `<span style="opacity: 0.5; color: #5c8a99;">[${time}]</span> <span style="color: ${color};">> ${message}</span>`;
        
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight; // Scroll automatique
    },
    
    clear: () => {
        const log = document.getElementById('log');
        if (log) log.innerHTML = "<div style='color:#00e5ff;'>[SYSTÈME] : Moniteur réinitialisé. En attente de données patient.</div>";
    }
};
