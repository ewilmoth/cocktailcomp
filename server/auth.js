import crypto from 'node:crypto';
import { db } from './db.js';

const LOGIN_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 days
const SESSION_COOKIE = 'wc_session';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function createLoginToken(userId) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_MS).toISOString();
  db.prepare(
    'INSERT INTO login_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
  ).run(userId, hashToken(token), expiresAt);
  return token;
}

export function consumeLoginToken(token) {
  const row = db
    .prepare('SELECT * FROM login_tokens WHERE token_hash = ?')
    .get(hashToken(token));
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  db.prepare('UPDATE login_tokens SET used_at = datetime(\'now\') WHERE id = ?').run(row.id);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
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
  req.sessionToken = token || null;
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admins only' });
  next();
}

export { SESSION_COOKIE };
