// handlers/eventHandler.js
const db = require('../utils/database');

async function handleGroupParticipantsUpdate(sock, update) {
    const { id, participants, action } = update;
    try {
        const settings = await db.getGroupSettings(id);
        if (!settings) return;

        let template = '';
        if (action === 'add' && settings.welcome_enabled) {
            template = settings.welcome_text || "👋 Selamat datang @user di grup!";
        } else if (action === 'remove' && settings.goodbye_enabled) {
            template = settings.goodbye_text || "👋 Sampai jumpa @user!";
        }

        if (template) {
            for (const p of participants) {
                const text = template.replace('@user', `@${p.split('@')[0]}`);
                await sock.sendMessage(id, { text, mentions: [p] });
            }
        }
    } catch (e) {
        console.error(`Error handling group participant update for ${id}:`, e);
    }
}

module.exports = { handleGroupParticipantsUpdate };