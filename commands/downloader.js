// commands/downloader.js
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require('fs');
const path = require('path');

async function handleDownloaderCommands(context) {
    const { sock, msg, from, command, q } = context;

    try {
        switch (command) {
            case 'ytmp4':
                if (!q || !ytdl.validateURL(q)) return sock.sendMessage(from, { text: "URL YouTube tidak valid." }, { quoted: msg });
                await sock.sendMessage(from, { text: "⏳ Mengunduh..." }, { quoted: msg });
                const info = await ytdl.getInfo(q);
                const format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'videoandaudio' });
                await sock.sendMessage(from, { video: { url: format.url }, caption: info.videoDetails.title }, { quoted: msg });
                break;

            case 's':
            case 'sticker':
                const messageType = Object.keys(msg.message)[0];
                let media;
                if (messageType === 'imageMessage' || messageType === 'videoMessage') {
                    media = await downloadContentFromMessage(msg.message[messageType], messageType.replace('Message', ''));
                } else if (msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
                    const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                    const quotedMsgType = Object.keys(quotedMsg)[0];
                    if (quotedMsgType === 'imageMessage' || quotedMsgType === 'videoMessage') {
                        media = await downloadContentFromMessage(quotedMsg[quotedMsgType], quotedMsgType.replace('Message', ''));
                    }
                }
                
                if (!media) return sock.sendMessage(from, { text: "Reply gambar/video atau kirim dengan caption .s" }, { quoted: msg });
                
                let buffer = Buffer.from([]);
                for await (const chunk of media) buffer = Buffer.concat([buffer, chunk]);
                
                const tempFilePath = path.join(__dirname, `../temp_sticker_${Date.now()}.webp`);
                await new Promise((resolve, reject) => {
                    ffmpeg(buffer)
                        .outputOptions(["-vcodec", "libwebp", "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0", "-loop", "0", "-ss", "00:00:00.0", "-t", "00:00:05.0", "-preset", "default", "-an", "-vsync", "0", "-s", "512:512"])
                        .toFormat('webp')
                        .save(tempFilePath)
                        .on('end', () => resolve(true))
                        .on('error', (err) => reject(err));
                });

                await sock.sendMessage(from, { sticker: { url: tempFilePath } });
                fs.unlinkSync(tempFilePath);
                break;
        }
    } catch (e) {
        console.error(`Error di downloader command ${command}:`, e);
        await sock.sendMessage(from, { text: `Gagal memproses permintaan.` }, { quoted: msg });
    }
}

module.exports = { handleDownloaderCommands };