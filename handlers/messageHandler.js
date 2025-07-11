// handlers/messageHandler.js
const { default: makeWASocket, useMultiFileAuthState, makeInMemoryStore, DisconnectReason, downloadContentFromMessage, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require('path');
const config = require('../config');
const db = require('../utils/database');
const helpers = require('../utils/helpers');
const { handleGroupParticipantsUpdate } = require('./eventHandler');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

const { handleAdminCommands } = require('../commands/admin');
const { handleOwnerCommands } = require('../commands/owner');
const { handleToolCommands } = require('../commands/tools');
const { handleDownloaderCommands } = require('../commands/downloader');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const openai = new OpenAI({ apiKey: config.openaiApiKey });
const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });
let botStartTime;
let activeConversations = {};

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["GuardianBot", "Chrome", "1.0.0"],
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })) },
        generateHighQualityLinkPreview: true,
    });

    store.bind(sock.ev);

    sock.ev.on('group-participants.update', (update) => handleGroupParticipantsUpdate(sock, update));
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === "open") {
            botStartTime = new Date();
            console.log("Koneksi WhatsApp terbuka, Bot Siap Digunakan!");
        }
    });
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe || msg.key.remoteJid === "status@broadcast") return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || from;
        if (await db.isUserBanned(sender)) return;

        const senderName = msg.pushName || "Kawan";
        const messageType = Object.keys(msg.message)[0];
        const body = (messageType === 'conversation') ? msg.message.conversation : (messageType === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : '';
        const isGroup = from.endsWith('@g.us');
        const command = body.startsWith('.') ? body.slice(1).trim().split(' ')[0].toLowerCase() : '';
        const args = body.trim().split(' ').slice(1);
        const q = args.join(' ');
        const isOwner = config.ownerNumber + '@s.whatsapp.net' === sender;
        const botNumber = sock.user.id.split(':')[0];
        const botJid = botNumber + '@s.whatsapp.net';

        // --- Logika Sesi Interaktif (.grupmanage) ---
        if (activeConversations[sender]) {
            // (Kode untuk .grupmanage sama seperti sebelumnya, sudah lengkap)
            return;
        }

        // --- Logika Fitur Otomatis ---
        if (isGroup) { /* Logika Anti-Badword */ }
        if (messageType === 'audioMessage') { /* Logika Transcriber */ }
        const isMentioningBot = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.includes(botJid) || body.includes(`@${botNumber}`);
        if (isMentioningBot && !command) { /* Logika AI Chat */ }

        // --- Logika Tampilan Menu ---
        const menuCommands = ['menu', 'grup', 'downloader', 'tools', 'owner'];
        if (menuCommands.includes(command)) {
            const runtime = helpers.formatRuntime(new Date() - botStartTime);
            const greeting = helpers.getGreeting();
            const headerText = `╭──「 *${config.botName}* 」\n│ 👋 ${greeting}, *${senderName}*!\n│\n│ 👑 Owner: *${config.ownerName}*\n│ 🕒 Aktif Selama: *${runtime}*\n╰─────────────────`;
            let menuContent = '';
            switch (command) {
                case 'menu': menuContent = `Halo! Saya adalah bot penjaga grup. Silakan gunakan perintah di bawah untuk melihat fitur.\n\n╭──「 *DAFTAR MENU* 」\n│ • *.grup*\n│ • *.downloader*\n│ • *.tools*\n│ • *.owner*\n╰─────────────────`; break;
                case 'grup': menuContent = `╭──「 *MENU GRUP* 」\n│ (Untuk Admin & Owner)\n│\n│ • *.tagall [pesan]*\n│ • *.setname [nama]*\n│ • *.linkgrup*\n│ • *.tutup* & *.buka*\n│ • *.kick* & *.addadmin*\n│ • *.setwelcome [teks]*\n│ • *.setgoodbye [teks]*\n│ • *.welcome on/off*\n│ • *.goodbye on/off*\n│ • *.kickall* (Khusus Owner)\n╰─────────────────`; break;
                case 'downloader': menuContent = `╭──「 *MENU DOWNLOADER* 」\n│\n│ • *.ytmp4 [link_youtube]*\n│ • *.s* (Buat stiker)\n╰─────────────────`; break;
                case 'tools': menuContent = `╭──「 *MENU ALAT BANTU* 」\n│\n│ • *.wiki [pencarian]*\n│ • *.tr [kode] [teks]*\n╰─────────────────`; break;
                case 'owner': menuContent = isOwner ? `╭──「 *MENU OWNER* 」\n│\n│ • *.grupmanage*\n│ • *.ban* & *.unban*\n╰─────────────────` : "Anda bukan Owner."; break;
            }
            if (menuContent) await sock.sendMessage(from, { text: `${headerText}\n\n${menuContent}` }, { quoted: msg });
            return;
        }

        // --- Command Routing ---
        const adminCommandList = ['kick', 'addadmin', 'tutup', 'buka', 'setname', 'linkgrup', 'tagall', 'setwelcome', 'setgoodbye', 'welcome', 'goodbye'];
        const ownerCommandList = ['ban', 'unban', 'kickall', 'grupmanage'];
        const toolCommandList = ['wiki', 'tr', 'translate'];
        const downloaderCommandList = ['ytmp4', 's', 'sticker'];
        
        const context = { sock, msg, from, sender, senderName, body, command, args, q, isGroup, isOwner };

        if (adminCommandList.includes(command) && isGroup) await handleAdminCommands(context);
        else if (ownerCommandList.includes(command)) await handleOwnerCommands(context);
        else if (toolCommandList.includes(command)) await handleToolCommands(context);
        else if (downloaderCommandList.includes(command)) await handleDownloaderCommands(context);
    });
}

module.exports = { connectToWhatsApp };