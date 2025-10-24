import Database from 'better-sqlite3';
import { config } from '../config/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure data directory exists
const dataDir = join(__dirname, '../../data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new Database(config.database.path);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  // Investors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS investors (
      id TEXT PRIMARY KEY,
      nostr_pubkey TEXT UNIQUE,
      stellar_public_key TEXT UNIQUE,
      name TEXT,
      email TEXT,
      investment_amount REAL NOT NULL,
      investment_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Monthly revenues table
  db.exec(`
    CREATE TABLE IF NOT EXISTS monthly_revenues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      total_revenue REAL NOT NULL,
      investor_share_percentage REAL NOT NULL,
      total_investor_payout REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(month, year)
    )
  `);

  // Payout history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payout_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      investor_id TEXT NOT NULL,
      revenue_period_id INTEGER NOT NULL,
      payout_amount REAL NOT NULL,
      payout_percentage REAL NOT NULL,
      payout_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      transaction_hash TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (investor_id) REFERENCES investors(id),
      FOREIGN KEY (revenue_period_id) REFERENCES monthly_revenues(id)
    )
  `);

  // Authentication sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      investor_id TEXT NOT NULL,
      auth_method TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (investor_id) REFERENCES investors(id)
    )
  `);

  console.log('Database initialized successfully');
}

export default db;
