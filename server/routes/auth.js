import { Router } from 'express';
import { db } from '../db.js';
import {
  createLoginToken,
  peekLoginToken,
  consumeLoginToken,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
} from '../auth.js';
import { sendLoginLinkEmail } from '../email.js';
import { renderPage } from '../pageTemplate.js';

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

// Deliberately does NOT log the user in on a plain GET. Email security
// scanners (Outlook Safe Links, antivirus tools, corporate mail filters)
// automatically visit links inside incoming email to check they're safe —
// if that GET consumed the token, the real recipient's click would find it
// already "used." Instead this shows a confirm page; only the POST below
// (triggered by an actual tap) consumes the token and logs in.
router.get('/verify', (req, res) => {
  const token = String(req.query.token || '');
  if (!peekLoginToken(token)) {
    return res.redirect('/?error=expired');
  }
  res.send(
    renderPage({
      title: 'Confirm Login',
      body: `
        <div class="eyebrow">Woodhamptons Presents</div>
        <h1>Welcome back</h1>
        <p>Tap below to finish logging in to the Cocktail Competition.</p>
        <form method="POST" action="/api/auth/verify">
          <input type="hidden" name="token" value="${token}" />
          <button class="btn" type="submit">Log Me In</button>
        </form>
      `,
    })
  );
});

router.post('/verify', (req, res) => {
  const token = String(req.body?.token || '');
  const user = consumeLoginToken(token);
  if (!user) {
    return res.redirect('/?error=expired');
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
