import { Router } from 'express';
import { db } from '../db.js';
import {
  normalizeEmail,
  isAdminEmail,
  isAdminLoginLocked,
  checkAdminPassword,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
} from '../auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  if (isAdminEmail(email)) {
    if (isAdminLoginLocked(email)) {
      return res.status(429).json({ error: 'Too many wrong passwords. Try again in 15 minutes.' });
    }
    const password = req.body?.password;
    if (!password) {
      return res.status(401).json({ needsPassword: true, error: 'This is an admin account. Enter the admin password.' });
    }
    if (!checkAdminPassword(email, password)) {
      return res.status(401).json({ needsPassword: true, error: 'Wrong password' });
    }
  }

  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const info = db.prepare('INSERT INTO users (email) VALUES (?)').run(email);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  }

  destroySession(req.sessionToken);
  setSessionCookie(res, createSession(user.id));
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  const u = req.user;
  const competition = u.competition_id
    ? db.prepare('SELECT name FROM competitions WHERE id = ?').get(u.competition_id)
    : null;
  res.json({
    user: {
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      nickname: u.nickname,
      isAdmin: req.isAdmin,
      profileComplete: !!(u.first_name && u.last_name && u.nickname),
      competitionId: u.competition_id,
      competitionName: competition?.name ?? null,
    },
  });
});

router.post('/logout', (req, res) => {
  destroySession(req.sessionToken);
  clearSessionCookie(res);
  res.json({ ok: true });
});

export default router;
