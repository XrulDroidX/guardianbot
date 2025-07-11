// commands/admin.js
const db = require('../utils/database');

async function handleAdminCommands(context) {
    const { sock, msg, from, sender, command, q, args, isOwner } = context;
    const groupMetadata = await sock.groupMetadata(from);
    const senderIsAdmin = !!groupMetadata.participants.find(p => p.id === sender)?.admin;
    const botIsAdmin = !!groupMetadata.participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin;

    if (!senderIsAdmin && !isOwner) return sock.sendMessage(from, { text: "Perintah ini hanya untuk admin grup." }, { quoted: msg });
    if (!botIsAdmin) return sock.sendMessage(from, { text: "Jadikan bot sebagai admin terlebih dahulu." }, { quoted: msg });

    const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    try {
        switch (command) {
            case 'kick':
                if (!mentionedJid) return sock.sendMessage(from, { text: "Tag anggota yang ingin di-kick." }, { quoted: msg });
                if (mentionedJid === sock.user.id.split(':')[0] + '@s.whatsapp.net') return sock.sendMessage(from, { text: "Tidak bisa menendang diri sendiri." }, { quoted: msg });
                const targetIsAdmin = !!groupMetadata.participants.find(p => p.id === mentionedJid)?.admin;
                if (targetIsAdmin) return sock.sendMessage(from, { text: "Tidak bisa kick sesama admin." }, { quoted: msg });
                await sock.groupParticipantsUpdate(from, [mentionedJid], "remove");
                await sock.sendMessage(from, { text: `✅ Berhasil mengeluarkan @${mentionedJid.split('@')[0]}`, mentions: [mentionedJid] }, { quoted: msg });
                break;

            case 'addadmin':
                if (!mentionedJid) return sock.sendMessage(from, { text: "Tag anggota yang ingin dijadikan admin." }, { quoted: msg });
                await sock.groupParticipantsUpdate(from, [mentionedJid], "promote");
                await sock.sendMessage(from, { text: `✅ @${mentionedJid.split('@')[0]} sekarang adalah admin.`, mentions: [mentionedJid] }, { quoted: msg });
                break;

            case 'setname':
                if (!q) return sock.sendMessage(from, { text: "Nama barunya apa?" }, { quoted: msg });
                await sock.groupUpdateSubject(from, q);
                await sock.sendMessage(from, { text: `✅ Nama grup diubah menjadi *${q}*` }, { quoted: msg });
                break;

            case 'tutup': await sock.groupSettingUpdate(from, 'announcement'); break;
            case 'buka': await sock.groupSettingUpdate(from, 'not_announcement'); break;

            case 'linkgrup':
                const code = await sock.groupInviteCode(from);
                await sock.sendMessage(from, { text: `https://chat.whatsapp.com/${code}` }, { quoted: msg });
                break;
            
            case 'tagall':
                const participants = groupMetadata.participants;
                let text = q ? `*Pesan dari Admin:* ${q}\n\n` : '📢 *Perhatian untuk semua anggota:*\n\n';
                let mentions = participants.map(p => p.id);
                participants.forEach(p => { text += `› @${p.id.split('@')[0]}\n`; });
                await sock.sendMessage(from, { text: text.trim(), mentions }, { quoted: msg });
                break;

            case 'setwelcome':
                if (!q) return sock.sendMessage(from, { text: "Teks pesannya apa? Gunakan '@user' untuk mention." }, { quoted: msg });
                await db.updateGroupSetting(from, 'welcome_text', q);
                await sock.sendMessage(from, { text: `✅ Pesan selamat datang diatur.` }, { quoted: msg });
                break;

            case 'welcome':
                if (!q.match(/^(on|off)$/)) return sock.sendMessage(from, { text: "Gunakan 'on' atau 'off'." }, { quoted: msg });
                const isWelcomeEnabled = q === 'on';
                await db.updateGroupSetting(from, 'welcome_enabled', isWelcomeEnabled);
                await sock.sendMessage(from, { text: `✅ Fitur Welcome telah di-${isWelcomeEnabled ? 'AKTIFKAN' : 'NONAKTIFKAN'}.` }, { quoted: msg });
                break;

            case 'setgoodbye':
                if (!q) return sock.sendMessage(from, { text: "Teks pesannya apa? Gunakan '@user' untuk mention." }, { quoted: msg });
                await db.updateGroupSetting(from, 'goodbye_text', q);
                await sock.sendMessage(from, { text: `✅ Pesan perpisahan diatur.` }, { quoted: msg });
                break;

            case 'goodbye':
                if (!q.match(/^(on|off)$/)) return sock.sendMessage(from, { text: "Gunakan 'on' atau 'off'." }, { quoted: msg });
                const isGoodbyeEnabled = q === 'on';
                await db.updateGroupSetting(from, 'goodbye_enabled', isGoodbyeEnabled);
                await sock.sendMessage(from, { text: `✅ Fitur Goodbye telah di-${isGoodbyeEnabled ? 'AKTIFKAN' : 'NONAKTIFKAN'}.` }, { quoted: msg });
                break;
        }
    } catch (e) {
        console.error(`Error di admin command ${command}:`, e);
        await sock.sendMessage(from, { text: "Terjadi kesalahan saat menjalankan perintah." }, { quoted: msg });
    }
}

module.exports = { handleAdminCommands };