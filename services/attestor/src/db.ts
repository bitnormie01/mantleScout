import Database from 'better-sqlite3';

export const db = new Database('wallet_trades.db', { verbose: process.env.DEBUG ? console.log : undefined });

db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet TEXT NOT NULL,
        tx_hash TEXT NOT NULL UNIQUE,
        block_number INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        dex TEXT NOT NULL,
        token_in TEXT NOT NULL,
        token_out TEXT NOT NULL,
        amount_in TEXT NOT NULL,
        amount_out TEXT NOT NULL,
        direction TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallet_state (
        wallet TEXT PRIMARY KEY,
        trade_count INTEGER DEFAULT 0,
        last_classified_at INTEGER,
        last_trade_at INTEGER,
        current_label TEXT DEFAULT 'UNKNOWN',
        current_score INTEGER DEFAULT 0,
        rationale TEXT DEFAULT '',
        evidence_json TEXT DEFAULT '{}',
        pending_submission INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_state (
        dex TEXT PRIMARY KEY,
        last_block INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet TEXT NOT NULL,
        label TEXT NOT NULL,
        score INTEGER NOT NULL,
        tx_hash TEXT,
        submitted_at INTEGER NOT NULL,
        status TEXT DEFAULT 'pending'
    );
`);

export const insertTrade = db.prepare(`
    INSERT OR IGNORE INTO trades (wallet, tx_hash, block_number, timestamp, dex, token_in, token_out, amount_in, amount_out, direction)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

export const getWalletState = db.prepare(`
    SELECT * FROM wallet_state WHERE wallet = ?
`);

export const updateWalletStateTradeCount = db.prepare(`
    INSERT INTO wallet_state (wallet, trade_count, last_trade_at)
    VALUES (?, 1, ?)
    ON CONFLICT(wallet) DO UPDATE SET
        trade_count = trade_count + 1,
        last_trade_at = excluded.last_trade_at
`);

export const updateWalletClassification = db.prepare(`
    UPDATE wallet_state
    SET current_label = ?, current_score = ?, evidence_json = ?, pending_submission = ?, last_classified_at = ?
    WHERE wallet = ?
`);

export const getSyncState = db.prepare(`
    SELECT last_block FROM sync_state WHERE dex = ?
`);

export const updateSyncState = db.prepare(`
    INSERT INTO sync_state (dex, last_block)
    VALUES (?, ?)
    ON CONFLICT(dex) DO UPDATE SET last_block = excluded.last_block
`);

export const getWalletTrades = db.prepare(`
    SELECT * FROM trades WHERE wallet = ? ORDER BY timestamp ASC
`);

export const getWalletsPendingSubmission = db.prepare(`
    SELECT * FROM wallet_state WHERE pending_submission = 1
`);

export const insertSubmission = db.prepare(`
    INSERT INTO submissions (wallet, label, score, tx_hash, submitted_at, status)
    VALUES (?, ?, ?, ?, ?, ?)
`);

export const updateSubmissionStatus = db.prepare(`
    UPDATE submissions SET status = ?, tx_hash = ? WHERE id = ?
`);

export const getRecentSubmission = db.prepare(`
    SELECT * FROM submissions 
    WHERE wallet = ? AND label = ? AND score = ? AND submitted_at > ?
    ORDER BY submitted_at DESC LIMIT 1
`);

export const clearPendingSubmission = db.prepare(`
    UPDATE wallet_state SET pending_submission = 0 WHERE wallet = ?
`);
