import { Router } from 'express';
import { db, getCompetition } from '../db.js';
import { requireAuth } from '../auth.js';
import { addMember, getRunningOrder } from '../competitionLogic.js';

const router = Router();
router.use(requireAuth);

const MAX_NAME_LENGTH = 40;

router.get('/open-competitions', (req, res) => {
  const competitions = db
    .prepare("SELECT id, name FROM competitions WHERE status = 'setup' ORDER BY created_at DESC, id DESC")
    .all();
  res.json({ competitions });
});

router.post('/join', (req, res) => {
  const clean = (v) => String(v ?? '').trim();
  const firstName = clean(req.body?.firstName);
  const lastName = clean(req.body?.lastName);
  const nickname = clean(req.body?.nickname);
  if (!firstName || !lastName || !nickname) {
    return res.status(400).json({ error: 'First name, surname and nickname are all required' });
  }
  if ([firstName, lastName, nickname].some((v) => v.length > MAX_NAME_LENGTH)) {
    return res.status(400).json({ error: `Names must be ${MAX_NAME_LENGTH} characters or fewer` });
  }

  const competitionId = Number(req.body?.competitionId);
  const competition = getCompetition(competitionId);
  if (!competition) {
    return res.status(404).json({ error: 'Pick a competition to join' });
  }
  if (competition.status !== 'setup') {
    return res.status(409).json({ error: 'That competition has already started' });
  }

  const previous = req.user.competition_id ? getCompetition(req.user.competition_id) : null;
  if (previous && previous.id !== competitionId) {
    if (previous.status === 'in_progress' || previous.status === 'judging_complete') {
      return res.status(409).json({ error: "You're in a competition that's still under way" });
    }
  }

  db.transaction(() => {
    // Switching before the old one starts takes you off its roster; leaving a
    // finished one keeps you in its results.
    if (previous && previous.id !== competitionId && previous.status === 'setup') {
      const order = getRunningOrder(previous).filter((id) => id !== req.user.id);
      db.prepare('UPDATE competitions SET running_order = ? WHERE id = ?').run(JSON.stringify(order), previous.id);
    }
    db.prepare(
      'UPDATE users SET first_name = ?, last_name = ?, nickname = ?, competition_id = ? WHERE id = ?'
    ).run(firstName, lastName, nickname, competitionId, req.user.id);
    addMember(competitionId, req.user.id);
  })();

  res.json({ ok: true });
});

export default router;
