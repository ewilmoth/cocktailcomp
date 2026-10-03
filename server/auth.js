import crypto from 'node:crypto';
import { db } from './db.js';

const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 days
const SESSION_COOKIE = 'wc_session';
const ADMIN_FAIL_LIMIT = 10;
const ADMIN_FAIL_WINDOW_MS = 15 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Read on every call so editing .env and restarting is all it takes to change admins.
function adminEmails() {
  return new Set(
    String(process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(normalizeEmail)
      .filter(Boolean)
  );
}

export function isAdminEmail(email) {
  return adminEmails().has(normalizeEmail(email));
}

// Keyed by email rather than IP: through the Cloudflare tunnel every request
// arrives from 127.0.0.1.
const adminFailures = new Map();

export function isAdminLoginLocked(email) {
  const entry = adminFailures.get(email);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > ADMIN_FAIL_WINDOW_MS) {
    adminFailures.delete(email);
    return false;
  }
  return entry.count >= ADMIN_FAIL_LIMIT;
}

export function checkAdminPassword(email, password) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    console.error('Admin login refused: ADMIN_PASSWORD is not set in .env');
    return false;
  }
  const a = crypto.createHash('sha256').update(String(password || '')).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  const ok = crypto.timingSafeEqual(a, b);
  if (ok) {
    adminFailures.delete(email);
  } else {
    const entry = adminFailures.get(email) || { count: 0, firstAt: Date.now() };
    entry.count += 1;
    adminFailures.set(email, entry);
  }
  return ok;
}

export function createSession(userId) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare(
    'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
  ).run(userId, hashToken(token), expiresAt);
  return token;
}

export function getUserFromSessionToken(token) {
  if (!token) return null;
  const row = db
    .prepare('SELECT * FROM sessions WHERE token_hash = ?')
    .get(hashToken(token));
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
}

export function destroySession(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

const isProduction = process.env.NODE_ENV === 'production';

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function attachUser(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  req.user = getUserFromSessionToken(token) || null;
  req.isAdmin = !!req.user && isAdminEmail(req.user.email);
  req.sessionToken = token || null;
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });
  if (!req.isAdmin) return res.status(403).json({ error: 'Admins only' });
  next();
}
