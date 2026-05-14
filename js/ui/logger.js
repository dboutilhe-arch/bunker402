export const Logger = {
    add: (message) => {
        const log = document.getElementById('log');
        if (!log) return;
        
        const time = new Date().toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        const entry = document.createElement('div');
        entry.innerHTML = `<span style="opacity: 0.5;">[${time}]</span> > ${message}`;
        
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight; // Scroll automatique
    },
    
    clear: () => {
        const log = document.getElementById('log');
        if (log) log.innerHTML = "<div>[SYSTÈME] : Redémarrage d'urgence effectué.</div>";
    }
};
