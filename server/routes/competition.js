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

router.get('/results', (req, res) => {
  if (req.competition.status !== 'results_published') {
    return res.status(409).json({ error: 'Results have not been published yet' });
  }
  res.json({ leaderboard: computeLeaderboard(req.competition) });
});

export default router;
