const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'promptnano.db');

let db = null;

async function initDb() {
  const SQL = await initSqlJs();
  
  // Load existing database if it exists
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Initialize schema
  db.run(`
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      title TEXT,
      desc TEXT,
      tags TEXT,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      thumbnail TEXT
    )
  `);

  // Migration: Add thumbnail column if it doesn't exist
  try {
    db.run('ALTER TABLE photos ADD COLUMN thumbnail TEXT');
  } catch (e) {
    // Column already exists, ignore
  }

  saveDb();
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function getDb() {
  return db;
}

module.exports = { initDb, getDb, saveDb };
