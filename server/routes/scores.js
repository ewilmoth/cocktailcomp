import { Router } from 'express';
import { db, getCompetition } from '../db.js';
import { requireAuth } from '../auth.js';
import { getCurrentContestantId, maybeAdvance } from '../competitionLogic.js';

const router = Router();
router.use(requireAuth);

function isValidScoreValue(v) {
  return Number.isInteger(v) && v >= 0 && v <= 10;
}

function assertCanScoreCurrentContestant(req, res) {
  const competition = getCompetition();
  if (competition.status !== 'in_progress' || competition.current_phase !== 'scoring') {
    res.status(409).json({ error: 'Scoring is not currently open' });
    return null;
  }
  const contestantId = getCurrentContestantId(competition);
  if (contestantId == null || contestantId === req.user.id) {
    res.status(403).json({ error: 'You cannot score yourself' });
    return null;
  }
  return contestantId;
}

router.patch('/draft', (req, res) => {
  const contestantId = assertCanScoreCurrentContestant(req, res);
  if (contestantId == null) return;

  const existing = db
    .prepare('SELECT * FROM scores WHERE judge_id = ? AND contestant_id = ?')
    .get(req.user.id, contestantId);
  if (existing?.submitted_at) {
    return res.status(409).json({ error: 'You already submitted a score for this contestant' });
  }

  const { cocktail, costume, tableSetting, comments } = req.body || {};
  const clean = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

  db.prepare(
    `INSERT INTO scores (judge_id, contestant_id, cocktail, costume, table_setting, comments, updated_at)
     VALUES (@judge_id, @contestant_id, @cocktail, @costume, @table_setting, @comments, datetime('now'))
     ON CONFLICT(judge_id, contestant_id) DO UPDATE SET
       cocktail = excluded.cocktail,
       costume = excluded.costume,
       table_setting = excluded.table_setting,
       comments = excluded.comments,
       updated_at = datetime('now')`
  ).run({
    judge_id: req.user.id,
    contestant_id: contestantId,
    cocktail: clean(cocktail),
    costume: clean(costume),
    table_setting: clean(tableSetting),
    comments: comments ?? '',
  });

  res.json({ ok: true });
});

router.post('/submit', (req, res) => {
  const contestantId = assertCanScoreCurrentContestant(req, res);
  if (contestantId == null) return;

  const existing = db
    .prepare('SELECT * FROM scores WHERE judge_id = ? AND contestant_id = ?')
    .get(req.user.id, contestantId);
  if (existing?.submitted_at) {
    return res.status(409).json({ error: 'You already submitted a score for this contestant' });
  }

  const { cocktail, costume, tableSetting, comments } = req.body || {};
  if (![cocktail, costume, tableSetting].every(isValidScoreValue)) {
    return res.status(400).json({ error: 'Cocktail, costume and table setting scores must be whole numbers 0-10' });
  }

  db.prepare(
    `INSERT INTO scores (judge_id, contestant_id, cocktail, costume, table_setting, comments, submitted_at, updated_at)
     VALUES (@judge_id, @contestant_id, @cocktail, @costume, @table_setting, @comments, datetime('now'), datetime('now'))
     ON CONFLICT(judge_id, contestant_id) DO UPDATE SET
       cocktail = excluded.cocktail,
       costume = excluded.costume,
       table_setting = excluded.table_setting,
       comments = excluded.comments,
       submitted_at = datetime('now'),
       updated_at = datetime('now')`
  ).run({
    judge_id: req.user.id,
    contestant_id: contestantId,
    cocktail,
    costume,
    table_setting: tableSetting,
    comments: comments ?? '',
  });

  const competition = maybeAdvance();
  res.json({ ok: true, competition });
});

router.get('/mine', (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.cocktail, s.costume, s.table_setting, s.comments, s.submitted_at,
              u.id AS contestant_id, u.nickname, u.first_name, u.last_name
       FROM scores s
       JOIN users u ON u.id = s.contestant_id
       WHERE s.judge_id = ? AND s.submitted_at IS NOT NULL
       ORDER BY s.submitted_at ASC`
    )
    .all(req.user.id);

  res.json({
    scores: rows.map((r) => ({
      contestantId: r.contestant_id,
      nickname: r.nickname,
      name: `${r.first_name} ${r.last_name}`,
      cocktail: r.cocktail,
      costume: r.costume,
      tableSetting: r.table_setting,
      total: r.cocktail + r.costume + r.table_setting,
      comments: r.comments,
    })),
  });
});

export default router;
