import { Router } from 'express';
import { db, getCompetition, updateCompetition } from '../db.js';
import { requireAdmin, isAdminEmail, checkScoresPassword } from '../auth.js';
import { sendResultsEmail } from '../email.js';
import {
  getRunningOrder,
  getCurrentContestantId,
  getUsersByIds,
  advance,
  removeMember,
  computeLeaderboard,
} from '../competitionLogic.js';

const router = Router();
router.use(requireAdmin);

const MAX_COMPETITION_NAME_LENGTH = 80;

function summary(c) {
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    currentPhase: c.current_phase,
    currentIndex: c.current_index,
    runningOrder: getRunningOrder(c),
  };
}

router.get('/competitions', (req, res) => {
  const competitions = db.prepare('SELECT * FROM competitions ORDER BY created_at DESC, id DESC').all();
  res.json({
    competitions: competitions.map((c) => ({ ...summary(c), memberCount: getRunningOrder(c).length })),
  });
});

router.post('/competitions', (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ error: 'Give the competition a name' });
  if (name.length > MAX_COMPETITION_NAME_LENGTH) {
    return res.status(400).json({ error: `Names must be ${MAX_COMPETITION_NAME_LENGTH} characters or fewer` });
  }
  const info = db.prepare('INSERT INTO competitions (name) VALUES (?)').run(name);
  res.status(201).json({ competition: summary(getCompetition(info.lastInsertRowid)) });
});

router.param('id', (req, res, next, id) => {
  const competition = getCompetition(Number(id));
  if (!competition) return res.status(404).json({ error: 'Competition not found' });
  req.competition = competition;
  next();
});

function requireStatus(req, res, status, message) {
  if (req.competition.status !== status) {
    res.status(409).json({ error: message });
    return false;
  }
  return true;
}

router.get('/competitions/:id', (req, res) => {
  const members = getUsersByIds(getRunningOrder(req.competition)).map((u) => ({
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    nickname: u.nickname,
    email: u.email,
    isAdmin: isAdminEmail(u.email),
  }));
  res.json({ competition: summary(req.competition), members });
});

router.put('/competitions/:id/running-order', (req, res) => {
  if (!requireStatus(req, res, 'setup', 'Running order can only be changed before the competition starts')) return;
  const current = getRunningOrder(req.competition);
  const { order } = req.body || {};
  const sameMembers =
    Array.isArray(order) &&
    order.length === current.length &&
    new Set(order).size === order.length &&
    order.every((id) => current.includes(id));
  if (!sameMembers) {
    return res.status(400).json({ error: 'Order must contain every contestant exactly once' });
  }
  res.json({ competition: summary(updateCompetition(req.competition.id, { running_order: JSON.stringify(order) })) });
});

router.post('/competitions/:id/randomize-order', (req, res) => {
  if (!requireStatus(req, res, 'setup', 'Running order can only be changed before the competition starts')) return;
  const ids = getRunningOrder(req.competition);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  res.json({ competition: summary(updateCompetition(req.competition.id, { running_order: JSON.stringify(ids) })) });
});

router.post('/competitions/:id/start', (req, res) => {
  if (!requireStatus(req, res, 'setup', 'Competition already started')) return;
  if (getRunningOrder(req.competition).length < 2) {
    return res.status(400).json({ error: 'At least two people need to join before you can start' });
  }
  const updated = updateCompetition(req.competition.id, {
    status: 'in_progress',
    current_index: 0,
    current_phase: 'prep',
  });
  res.json({ competition: summary(updated) });
});

router.post('/competitions/:id/start-scoring', (req, res) => {
  const c = req.competition;
  if (c.status !== 'in_progress' || c.current_phase !== 'prep') {
    return res.status(409).json({ error: 'Not currently in a prep phase' });
  }
  res.json({ competition: summary(updateCompetition(c.id, { current_phase: 'scoring' })) });
});

router.post('/competitions/:id/force-advance', (req, res) => {
  if (!requireStatus(req, res, 'in_progress', 'Competition is not in progress')) return;
  // Stops two admins tapping at once from skipping two contestants.
  if (Number(req.body?.expectedIndex) !== req.competition.current_index) {
    return res.status(409).json({ error: 'The round has already moved on' });
  }
  res.json({ competition: summary(advance(req.competition)) });
});

router.get('/competitions/:id/leaderboard', (req, res) => {
  // Mid-game totals are locked even from admins; once judging ends they need
  // them to announce the winner.
  if (req.competition.status === 'in_progress') {
    const given = req.get('X-Scores-Password');
    if (!checkScoresPassword(given)) {
      return res.status(403).json({
        needsScoresPassword: true,
        error: given ? 'Wrong password' : 'Scores are locked while the game is on',
      });
    }
  }
  res.json({ leaderboard: computeLeaderboard(req.competition) });
});

router.post('/competitions/:id/publish', async (req, res) => {
  if (!requireStatus(req, res, 'judging_complete', 'Judging is not yet complete')) return;
  const updated = updateCompetition(req.competition.id, { status: 'results_published' });
  const leaderboard = computeLeaderboard(updated);
  const results = await Promise.allSettled(
    getUsersByIds(getRunningOrder(updated)).map((u) => sendResultsEmail(u, leaderboard, updated.name))
  );
  results
    .filter((r) => r.status === 'rejected')
    .forEach((r) => console.error('Results email failed:', r.reason));
  res.json({ competition: summary(updated) });
});

router.post('/competitions/:id/reset', (req, res) => {
  db.prepare('DELETE FROM scores WHERE competition_id = ?').run(req.competition.id);
  const updated = updateCompetition(req.competition.id, {
    status: 'setup',
    current_index: 0,
    current_phase: 'prep',
  });
  res.json({ competition: summary(updated) });
});

// Members fall back to the picker (users.competition_id is ON DELETE SET NULL)
// and the competition's scores go with it (ON DELETE CASCADE).
router.delete('/competitions/:id', (req, res) => {
  db.prepare('DELETE FROM competitions WHERE id = ?').run(req.competition.id);
  res.json({ ok: true });
});

router.delete('/competitions/:id/members/:userId', (req, res) => {
  const c = req.competition;
  const userId = Number(req.params.userId);
  if (!getRunningOrder(c).includes(userId)) {
    return res.status(404).json({ error: "That person isn't in this competition" });
  }
  if (c.status === 'judging_complete' || c.status === 'results_published') {
    return res.status(409).json({ error: 'Judging has finished; reset the competition first' });
  }
  if (c.status === 'in_progress' && getCurrentContestantId(c) === userId) {
    return res.status(409).json({ error: 'Cannot remove the contestant currently up. Advance past them first.' });
  }
  res.json({ competition: summary(removeMember(c.id, userId)) });
});

export default router;
