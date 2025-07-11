// index.js - Titik masuk aplikasi
const { initDb } = require('./utils/database');
const { connectToWhatsApp } = require('./handlers/messageHandler');

async function main() {
    try {
        await initDb();
        console.log("Database SQLite berhasil diinisialisasi.");

        await connectToWhatsApp();
    } catch (error) {
        console.error("Gagal total saat memulai bot:", error);
        process.exit(1);
    }
}

main();