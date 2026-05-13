// logger.js
// Gestion du log console

export const Logger = {
    el: document.getElementById('log'),

    add(message, type = "SYSTEM") {
        const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const color = type === "ALERTE" ? "#e74c3c" : "#2ecc71";
        
        this.el.innerHTML += `<div>[${time}] <span style="color:${color}">> ${message}</span></div>`;
        this.el.scrollTop = this.el.scrollHeight;
    },

    clear() {
        this.el.innerHTML = "<div>[SYSTÈME] : Redémarrage effectué.</div>";
    }
};
