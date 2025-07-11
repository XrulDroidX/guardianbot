// commands/owner.js
const db = require('../utils/database');

async function handleOwnerCommands(context) {
    const { sock, msg, from, command, isGroup, isOwner } = context;
    if (!isOwner) return sock.sendMessage(from, { text: "Perintah ini khusus untuk Owner Bot." }, { quoted: msg });

    const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    try {
        switch (command) {
            case 'ban':
                if (!mentionedJid) return sock.sendMessage(from, { text: "Tag user yang ingin di-ban." }, { quoted: msg });
                if (await db.isUserBanned(mentionedJid)) return sock.sendMessage(from, { text: "User tersebut sudah di-ban." }, { quoted: msg });
                await db.banUser(mentionedJid);
                await sock.sendMessage(from, { text: `✅ Berhasil ban @${mentionedJid.split('@')[0]}`, mentions: [mentionedJid] }, { quoted: msg });
                break;

            case 'unban':
                if (!mentionedJid) return sock.sendMessage(from, { text: "Tag user yang ingin di-unban." }, { quoted: msg });
                if (!(await db.isUserBanned(mentionedJid))) return sock.sendMessage(from, { text: "User tidak ada dalam daftar ban." }, { quoted: msg });
                await db.unbanUser(mentionedJid);
                await sock.sendMessage(from, { text: `✅ Berhasil unban @${mentionedJid.split('@')[0]}`, mentions: [mentionedJid] }, { quoted: msg });
                break;
            
            case 'kickall':
                if (!isGroup) return sock.sendMessage(from, { text: "Perintah ini hanya untuk grup." }, { quoted: msg });
                const groupMetadata = await sock.groupMetadata(from);
                const botIsAdmin = !!groupMetadata.participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin;
                if (!botIsAdmin) return sock.sendMessage(from, { text: "Jadikan bot admin dulu." }, { quoted: msg });
                await sock.sendMessage(from, { text: "Membersihkan anggota non-admin..." }, { quoted: msg });
                const membersToKick = groupMetadata.participants
                    .filter(p => !p.admin && p.id !== sock.user.id.split(':')[0] + '@s.whatsapp.net')
                    .map(p => p.id);
                if (membersToKick.length > 0) await sock.groupParticipantsUpdate(from, membersToKick, "remove");
                await sock.sendMessage(from, { text: `✅ Selesai! ${membersToKick.length} anggota telah dikeluarkan.` }, { quoted: msg });
                break;
        }
    } catch (e) {
        console.error(`Error di owner command ${command}:`, e);
        await sock.sendMessage(from, { text: "Terjadi kesalahan saat menjalankan perintah owner." }, { quoted: msg });
    }
}

module.exports = { handleOwnerCommands };