import { Router } from 'express';
import { db, getCompetition } from '../db.js';
import { requireAuth } from '../auth.js';
import { addMember, getRunningOrder, removeMember } from '../competitionLogic.js';

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
  const leaving = previous && previous.id !== competitionId ? previous : null;
  const leavingUnfinished = leaving && (leaving.status === 'in_progress' || leaving.status === 'judging_complete');
  // Players can't walk out of a live round; admins can, as if removed from it.
  if (leavingUnfinished && !req.isAdmin) {
    return res.status(409).json({ error: "You're in a competition that's still under way" });
  }

  db.transaction(() => {
    // Leaving one that hasn't started, or one still running, takes you off its
    // roster; leaving a finished one keeps you in its results.
    if (leavingUnfinished) {
      removeMember(leaving.id, req.user.id);
    } else if (leaving?.status === 'setup') {
      const order = getRunningOrder(leaving).filter((id) => id !== req.user.id);
      db.prepare('UPDATE competitions SET running_order = ? WHERE id = ?').run(JSON.stringify(order), leaving.id);
    }
    db.prepare(
      'UPDATE users SET first_name = ?, last_name = ?, nickname = ?, competition_id = ? WHERE id = ?'
    ).run(firstName, lastName, nickname, competitionId, req.user.id);
    addMember(competitionId, req.user.id);
  })();

  res.json({ ok: true });
});

export default router;
