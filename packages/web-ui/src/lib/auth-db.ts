import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { randomUUID } from 'crypto';
import { createHash, scryptSync, randomBytes } from 'crypto';

// ─── Types ──────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  image: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  created_at: string;
}

// ─── Database Singleton ─────────────────────────────────────

let _db: Database.Database | null = null;

function getAuthDb(): Database.Database {
  if (_db) return _db;

  const dbPath = process.env.AUTH_DB_PATH || './data/auth.db';
  const dir = dirname(dbPath);
  mkdirSync(dir, { recursive: true });

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  // Create users table if not exists
  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      image TEXT,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')) NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  return _db;
}

// ─── Password Hashing ───────────────────────────────────────

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

/**
 * Hash a password using scrypt (Node.js built-in).
 * Format: "salt:hash" (both hex-encoded).
 */
function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash.
 */
function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const computedHash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  // Constant-time comparison to prevent timing attacks
  return hash.length === computedHash.length &&
    hash.split('').every((char, i) => char === computedHash[i]);
}

// ─── User Operations ────────────────────────────────────────

/**
 * Create a new user. Returns the safe user (no password_hash).
 * Throws if email already exists.
 */
export function createUser(email: string, password: string, name?: string): SafeUser {
  const db = getAuthDb();
  const id = randomUUID();
  const passwordHash = hashPassword(password);

  try {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name)
      VALUES (?, ?, ?, ?)
    `).run(id, email.toLowerCase().trim(), passwordHash, name || null);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed')) {
      throw new Error('Email already registered');
    }
    throw error;
  }

  return {
    id,
    email: email.toLowerCase().trim(),
    name: name || null,
    image: null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Get a user by email and verify password.
 * Returns null if user not found or password incorrect.
 */
export function authenticateUser(email: string, password: string): SafeUser | null {
  const db = getAuthDb();
  const row = db.prepare(`
    SELECT id, email, password_hash, name, image, created_at
    FROM users
    WHERE email = ?
  `).get(email.toLowerCase().trim()) as User | undefined;

  if (!row) return null;

  if (!verifyPassword(password, row.password_hash)) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    image: row.image,
    created_at: row.created_at,
  };
}

/**
 * Get a user by ID.
 */
export function getUserById(id: string): SafeUser | null {
  const db = getAuthDb();
  const row = db.prepare(`
    SELECT id, email, name, image, created_at
    FROM users
    WHERE id = ?
  `).get(id) as SafeUser | undefined;

  return row || null;
}

/**
 * Get a user by email.
 */
export function getUserByEmail(email: string): SafeUser | null {
  const db = getAuthDb();
  const row = db.prepare(`
    SELECT id, email, name, image, created_at
    FROM users
    WHERE email = ?
  `).get(email.toLowerCase().trim()) as SafeUser | undefined;

  return row || null;
}

/**
 * Close the database connection (for testing).
 */
export function closeAuthDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
