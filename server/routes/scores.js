import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import {
  requireJoinedCompetition,
  getCurrentContestantId,
  eligibleJudgeIds,
  maybeAdvance,
} from '../competitionLogic.js';

const router = Router();
router.use(requireAuth, requireJoinedCompetition);

function isValidScoreValue(v) {
  return Number.isInteger(v) && v >= 0 && v <= 10;
}

function assertCanScoreCurrentContestant(req, res) {
  const competition = req.competition;
  if (competition.status !== 'in_progress' || competition.current_phase !== 'scoring') {
    res.status(409).json({ error: 'Scoring is not currently open' });
    return null;
  }
  const contestantId = getCurrentContestantId(competition);
  if (contestantId == null || contestantId === req.user.id) {
    res.status(403).json({ error: 'You cannot score yourself' });
    return null;
  }
  if (!eligibleJudgeIds(competition).includes(req.user.id)) {
    res.status(403).json({ error: "You're not judging in this competition" });
    return null;
  }
  const existing = db
    .prepare('SELECT submitted_at FROM scores WHERE competition_id = ? AND judge_id = ? AND contestant_id = ?')
    .get(competition.id, req.user.id, contestantId);
  if (existing?.submitted_at) {
    res.status(409).json({ error: 'You already submitted a score for this contestant' });
    return null;
  }
  return contestantId;
}

const UPSERT = `
  INSERT INTO scores (competition_id, judge_id, contestant_id, cocktail, costume, table_setting, comments, submitted_at, updated_at)
  VALUES (@competition_id, @judge_id, @contestant_id, @cocktail, @costume, @table_setting, @comments, @submitted_at, datetime('now'))
  ON CONFLICT(competition_id, judge_id, contestant_id) DO UPDATE SET
    cocktail = excluded.cocktail,
    costume = excluded.costume,
    table_setting = excluded.table_setting,
    comments = excluded.comments,
    submitted_at = excluded.submitted_at,
    updated_at = datetime('now')`;

router.patch('/draft', (req, res) => {
  const contestantId = assertCanScoreCurrentContestant(req, res);
  if (contestantId == null) return;

  const { cocktail, costume, tableSetting, comments } = req.body || {};
  const clean = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

  db.prepare(UPSERT).run({
    competition_id: req.competition.id,
    judge_id: req.user.id,
    contestant_id: contestantId,
    cocktail: clean(cocktail),
    costume: clean(costume),
    table_setting: clean(tableSetting),
    comments: comments ?? '',
    submitted_at: null,
  });

  res.json({ ok: true });
});

router.post('/submit', (req, res) => {
  const contestantId = assertCanScoreCurrentContestant(req, res);
  if (contestantId == null) return;

  const { cocktail, costume, tableSetting, comments } = req.body || {};
  if (![cocktail, costume, tableSetting].every(isValidScoreValue)) {
    return res.status(400).json({ error: 'Cocktail flavour, costume and presentation scores must be whole numbers 0-10' });
  }

  db.prepare(UPSERT).run({
    competition_id: req.competition.id,
    judge_id: req.user.id,
    contestant_id: contestantId,
    cocktail,
    costume,
    table_setting: tableSetting,
    comments: comments ?? '',
    submitted_at: new Date().toISOString(),
  });

  res.json({ ok: true, competition: maybeAdvance(req.competition.id) });
});

router.get('/mine', (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.cocktail, s.costume, s.table_setting, s.comments,
              u.id AS contestant_id, u.nickname, u.first_name, u.last_name
       FROM scores s
       JOIN users u ON u.id = s.contestant_id
       WHERE s.competition_id = ? AND s.judge_id = ? AND s.submitted_at IS NOT NULL
       ORDER BY s.submitted_at ASC`
    )
    .all(req.competition.id, req.user.id);

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
