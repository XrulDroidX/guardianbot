// commands/tools.js
const wiki = require('wikijs').default;
const { translate } = require('@vitalets/google-translate-api');

async function handleToolCommands(context) {
    const { sock, msg, from, command, q, args } = context;

    try {
        switch (command) {
            case 'wiki':
                if (!q) return sock.sendMessage(from, { text: "Mau cari apa di Wikipedia?" }, { quoted: msg });
                await sock.sendMessage(from, { text: `🔍 Mencari "${q}"...` }, { quoted: msg });
                const page = await wiki({ apiUrl: 'https://id.wikipedia.org/w/api.php' }).page(q);
                const summary = await page.summary();
                await sock.sendMessage(from, { text: `*Hasil: ${page.raw.title}*\n\n${summary.slice(0, 300)}...` }, { quoted: msg });
                break;

            case 'tr':
            case 'translate':
                if (args.length < 2) return sock.sendMessage(from, { text: "Format: .tr [kode_bahasa] [teks]" }, { quoted: msg });
                const lang = args[0];
                const textToTranslate = args.slice(1).join(' ');
                const { text } = await translate(textToTranslate, { to: lang });
                await sock.sendMessage(from, { text }, { quoted: msg });
                break;
        }
    } catch (e) {
        console.error(`Error di tool command ${command}:`, e);
        await sock.sendMessage(from, { text: `Gagal menjalankan perintah. Pastikan input benar.` }, { quoted: msg });
    }
}

module.exports = { handleToolCommands };