import { Router } from 'express';
import { db, getCompetition, updateCompetition } from '../db.js';
import { requireAdmin } from '../auth.js';
import { createLoginToken } from '../auth.js';
import { sendInviteEmail, sendResultsEmail } from '../email.js';
import { getAllUserIds, computeLeaderboard, getRunningOrder } from '../competitionLogic.js';

const router = Router();
router.use(requireAdmin);

function publicUser(u) {
  return {
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    nickname: u.nickname,
    email: u.email,
    isAdmin: !!u.is_admin,
  };
}

router.get('/competition', (req, res) => {
  const competition = getCompetition();
  res.json({
    status: competition.status,
    currentPhase: competition.current_phase,
    currentIndex: competition.current_index,
    runningOrder: getRunningOrder(competition),
  });
});

router.get('/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY id').all();
  res.json({ users: users.map(publicUser) });
});

router.post('/users', async (req, res) => {
  const { firstName, lastName, nickname, email, isAdmin } = req.body || {};
  if (!firstName || !lastName || !nickname || !email) {
    return res.status(400).json({ error: 'firstName, lastName, nickname and email are required' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();

  let user;
  try {
    const info = db
      .prepare(
        'INSERT INTO users (first_name, last_name, nickname, email, is_admin) VALUES (?, ?, ?, ?, ?)'
      )
      .run(firstName.trim(), lastName.trim(), nickname.trim(), normalizedEmail, isAdmin ? 1 : 0);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }
    throw err;
  }

  const token = createLoginToken(user.id);
  await sendInviteEmail(user, token);

  res.status(201).json({ user: publicUser(user) });
});

router.delete('/users/:id', (req, res) => {
  const userId = Number(req.params.id);
  if (userId === req.user.id) {
    return res.status(400).json({ error: "You can't remove yourself" });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const competition = getCompetition();
  const order = getRunningOrder(competition);
  const removedIndex = order.indexOf(userId);

  if (competition.status === 'in_progress' && removedIndex === competition.current_index) {
    return res.status(409).json({
      error: 'Cannot remove the contestant currently up. Advance past them first.',
    });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  const newOrder = order.filter((id) => id !== userId);
  let currentIndex = competition.current_index;
  if (removedIndex !== -1 && removedIndex < currentIndex) {
    currentIndex -= 1;
  }
  updateCompetition({ running_order: JSON.stringify(newOrder), current_index: currentIndex });

  res.json({ ok: true });
});

router.post('/reset', (req, res) => {
  db.prepare('DELETE FROM scores').run();
  const updated = updateCompetition({
    status: 'setup',
    running_order: '[]',
    current_index: 0,
    current_phase: 'prep',
  });
  res.json({ competition: updated });
});

router.put('/running-order', (req, res) => {
  const competition = getCompetition();
  if (competition.status !== 'setup') {
    return res.status(409).json({ error: 'Running order can only be changed before the competition starts' });
  }
  const { order } = req.body || {};
  const allIds = new Set(getAllUserIds());
  if (!Array.isArray(order) || order.length !== allIds.size || !order.every((id) => allIds.has(id))) {
    return res.status(400).json({ error: 'Order must contain every contestant exactly once' });
  }
  const updated = updateCompetition({ running_order: JSON.stringify(order) });
  res.json({ competition: updated });
});

router.post('/randomize-order', (req, res) => {
  const competition = getCompetition();
  if (competition.status !== 'setup') {
    return res.status(409).json({ error: 'Running order can only be changed before the competition starts' });
  }
  const ids = getAllUserIds();
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const updated = updateCompetition({ running_order: JSON.stringify(ids) });
  res.json({ competition: updated });
});

router.post('/start', (req, res) => {
  const competition = getCompetition();
  if (competition.status !== 'setup') {
    return res.status(409).json({ error: 'Competition already started' });
  }
  const order = getRunningOrder(competition);
  if (order.length < 2) {
    return res.status(400).json({ error: 'Add at least two contestants and set a running order first' });
  }
  const updated = updateCompetition({
    status: 'in_progress',
    current_index: 0,
    current_phase: 'prep',
  });
  res.json({ competition: updated });
});

router.post('/start-scoring', (req, res) => {
  const competition = getCompetition();
  if (competition.status !== 'in_progress' || competition.current_phase !== 'prep') {
    return res.status(409).json({ error: 'Not currently in a prep phase' });
  }
  const updated = updateCompetition({ current_phase: 'scoring' });
  res.json({ competition: updated });
});

router.post('/force-advance', (req, res) => {
  const competition = getCompetition();
  if (competition.status !== 'in_progress') {
    return res.status(409).json({ error: 'Competition is not in progress' });
  }
  const order = getRunningOrder(competition);
  const nextIndex = competition.current_index + 1;
  if (nextIndex >= order.length) {
    return res.json({ competition: updateCompetition({ status: 'judging_complete', current_phase: 'prep' }) });
  }
  res.json({ competition: updateCompetition({ current_index: nextIndex, current_phase: 'prep' }) });
});

router.get('/leaderboard', (req, res) => {
  res.json({ leaderboard: computeLeaderboard() });
});

router.post('/publish', async (req, res) => {
  const competition = getCompetition();
  if (competition.status !== 'judging_complete') {
    return res.status(409).json({ error: 'Judging is not yet complete' });
  }
  const updated = updateCompetition({ status: 'results_published' });
  const leaderboard = computeLeaderboard();
  const users = db.prepare('SELECT * FROM users').all();
  await Promise.all(users.map((u) => sendResultsEmail(u, leaderboard)));
  res.json({ competition: updated });
});

export default router;
