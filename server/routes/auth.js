import { Router } from 'express';
import { db } from '../db.js';
import {
  createLoginToken,
  consumeLoginToken,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
} from '../auth.js';
import { sendLoginLinkEmail } from '../email.js';

const router = Router();

router.post('/request-link', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (user) {
    const token = createLoginToken(user.id);
    await sendLoginLinkEmail(user, token);
  }
  // Always respond the same way so we don't leak which emails are registered.
  res.json({ ok: true });
});

router.get('/verify', (req, res) => {
  const token = String(req.query.token || '');
  const user = consumeLoginToken(token);
  if (!user) {
    return res.redirect('/login?error=expired');
  }
  const sessionToken = createSession(user.id);
  setSessionCookie(res, sessionToken);
  res.redirect('/');
});

router.get('/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  const { id, first_name, last_name, nickname, email, is_admin } = req.user;
  res.json({
    user: { id, firstName: first_name, lastName: last_name, nickname, email, isAdmin: !!is_admin },
  });
});

router.post('/logout', (req, res) => {
  destroySession(req.sessionToken);
  clearSessionCookie(res);
  res.json({ ok: true });
});

export default router;
