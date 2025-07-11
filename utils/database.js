// utils/database.js - Pengelola database SQLite
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

let db;

async function initDb() {
    db = await open({
        filename: path.join(__dirname, '../guardianbot.db'),
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS banned_users ( jid TEXT PRIMARY KEY );
        CREATE TABLE IF NOT EXISTS warnings ( user_jid TEXT, group_jid TEXT, count INTEGER DEFAULT 0, PRIMARY KEY (user_jid, group_jid) );
        CREATE TABLE IF NOT EXISTS group_settings (
            group_jid TEXT PRIMARY KEY,
            welcome_enabled BOOLEAN DEFAULT 0,
            welcome_text TEXT,
            goodbye_enabled BOOLEAN DEFAULT 0,
            goodbye_text TEXT
        );
    `);
}

// Ban/Unban Functions
const banUser = (jid) => db.run('INSERT OR IGNORE INTO banned_users (jid) VALUES (?)', jid);
const unbanUser = (jid) => db.run('DELETE FROM banned_users WHERE jid = ?', jid);
const isUserBanned = async (jid) => !!(await db.get('SELECT 1 FROM banned_users WHERE jid = ?', jid));

// Warning Functions
const getWarningCount = async (uid, gid) => (await db.get('SELECT count FROM warnings WHERE user_jid = ? AND group_jid = ?', uid, gid))?.count || 0;
const incrementWarning = (uid, gid) => db.run('INSERT INTO warnings (user_jid, group_jid, count) VALUES (?, ?, 1) ON CONFLICT(user_jid, group_jid) DO UPDATE SET count = count + 1', uid, gid);
const resetWarnings = (uid, gid) => db.run('DELETE FROM warnings WHERE user_jid = ? AND group_jid = ?', uid, gid);

// Group Settings Functions
const getGroupSettings = (gid) => db.get('SELECT * FROM group_settings WHERE group_jid = ?', gid);
const updateGroupSetting = async (gid, key, value) => {
    await db.run('INSERT OR IGNORE INTO group_settings (group_jid) VALUES (?)', gid);
    return db.run(`UPDATE group_settings SET ${key} = ? WHERE group_jid = ?`, value, gid);
};

module.exports = { 
    initDb, db,
    banUser, unbanUser, isUserBanned,
    getWarningCount, incrementWarning, resetWarnings,
    getGroupSettings, updateGroupSetting
};