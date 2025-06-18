const database = require('better-sqlite3');
const db = new database('./data.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS items (
        uid TEXT PRIMARY KEY,
        name TEXT,
        formatted_address TEXT,
        user_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users(email)
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        uid INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        name TEXT,
        picture TEXT,
        hashed_pass TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `)

module.exports = db;