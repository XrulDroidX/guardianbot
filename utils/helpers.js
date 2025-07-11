// utils/helpers.js
const moment = require('moment-timezone');

const getWibTime = () => moment().tz('Asia/Jakarta').format('HH:mm:ss');

const getGreeting = () => {
    const hour = moment().tz('Asia/Jakarta').hour();
    if (hour >= 4 && hour < 11) return "Selamat Pagi";
    if (hour >= 11 && hour < 15) return "Selamat Siang";
    if (hour >= 15 && hour < 18) return "Selamat Sore";
    return "Selamat Malam";
};

const formatRuntime = (milliseconds) => {
    if (!milliseconds) return 'Menghitung...';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let parts = [];
    if (days > 0) parts.push(`${days} Hari`);
    if (hours > 0) parts.push(`${hours} Jam`);
    if (minutes > 0) parts.push(`${minutes} Menit`);
    if (seconds > 0) parts.push(`${seconds} Detik`);
    
    return parts.join(', ') || 'Baru saja dimulai';
};

module.exports = { getWibTime, getGreeting, formatRuntime };