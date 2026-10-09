import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import {
  requireJoinedCompetition,
  getRunningOrder,
  getCurrentContestantId,
  eligibleJudgeIds,
  submittedJudgeIds,
  getUsersByIds,
  computeLeaderboard,
} from '../competitionLogic.js';

const router = Router();
router.use(requireAuth, requireJoinedCompetition);

function brief(u) {
  return u ? { id: u.id, firstName: u.first_name, lastName: u.last_name, nickname: u.nickname } : null;
}

router.get('/state', (req, res) => {
  const competition = req.competition;
  const order = getRunningOrder(competition);

  const base = {
    competitionId: competition.id,
    competitionName: competition.name,
    status: competition.status,
    isAdmin: req.isAdmin,
    totalContestants: order.length,
  };

  if (competition.status === 'setup') {
    return res.json({ ...base, members: getUsersByIds(order).map(brief) });
  }

  if (competition.status !== 'in_progress') {
    return res.json(base);
  }

  const currentContestantId = getCurrentContestantId(competition);
  const isCurrentContestant = req.user.id === currentContestantId;
  const judgeIds = eligibleJudgeIds(competition);
  const submitted = submittedJudgeIds(competition.id, currentContestantId);

  const myScore = isCurrentContestant
    ? null
    : db
        .prepare('SELECT * FROM scores WHERE competition_id = ? AND judge_id = ? AND contestant_id = ?')
        .get(competition.id, req.user.id, currentContestantId);

  res.json({
    ...base,
    phase: competition.current_phase,
    contestantIndex: competition.current_index,
    currentContestant: brief(getUsersByIds([currentContestantId])[0]),
    isCurrentContestant,
    submittedCount: judgeIds.filter((id) => submitted.has(id)).length,
    totalJudges: judgeIds.length,
    judges:
      competition.current_phase === 'scoring'
        ? getUsersByIds(judgeIds).map((u) => ({ ...brief(u), submitted: submitted.has(u.id) }))
        : [],
    myScore: myScore
      ? {
          cocktail: myScore.cocktail,
          costume: myScore.costume,
          tableSetting: myScore.table_setting,
          comments: myScore.comments,
          submitted: !!myScore.submitted_at,
        }
      : null,
  });
});

// Everything, for secret observers only: every vote by name, round by round,
// plus the running totals.
router.get('/feed', (req, res) => {
  if (!req.user.observer) return res.status(403).json({ error: 'Not allowed' });
  const c = req.competition;
  const order = getRunningOrder(c);
  const usersById = new Map(getUsersByIds(order).map((u) => [u.id, u]));
  const scores = db
    .prepare('SELECT * FROM scores WHERE competition_id = ? AND submitted_at IS NOT NULL')
    .all(c.id);
  const byPair = new Map(scores.map((s) => [`${s.judge_id}:${s.contestant_id}`, s]));

  const lastRound = c.status === 'setup' ? -1 : c.status === 'in_progress' ? c.current_index : order.length - 1;
  const rounds = [];
  for (let i = 0; i <= lastRound && i < order.length; i++) {
    const contestantId = order[i];
    const live = c.status === 'in_progress' && i === c.current_index;
    rounds.push({
      number: i + 1,
      contestant: brief(usersById.get(contestantId)),
      phase: live ? c.current_phase : 'done',
      judges: order
        .filter((id) => id !== contestantId)
        .map((id) => {
          const s = byPair.get(`${id}:${contestantId}`);
          return {
            ...brief(usersById.get(id)),
            submitted: !!s,
            cocktail: s?.cocktail ?? null,
            costume: s?.costume ?? null,
            tableSetting: s?.table_setting ?? null,
            total: s ? s.cocktail + s.costume + s.table_setting : null,
            comments: s?.comments ?? '',
          };
        }),
    });
  }

  res.json({
    competitionName: c.name,
    status: c.status,
    totalRounds: order.length,
    members: order.map((id) => brief(usersById.get(id))),
    rounds: rounds.reverse(),
    leaderboard: computeLeaderboard(c),
  });
});

router.get('/results', (req, res) => {
  if (req.competition.status !== 'results_published') {
    return res.status(409).json({ error: 'Results have not been published yet' });
  }
  res.json({ leaderboard: computeLeaderboard(req.competition) });
});

export default router;
