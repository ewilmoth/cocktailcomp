import { Router } from 'express';
import { db, getCompetition } from '../db.js';
import { requireAuth } from '../auth.js';
import {
  getRunningOrder,
  getCurrentContestantId,
  eligibleJudgeIds,
  submittedJudgeCount,
  computeLeaderboard,
} from '../competitionLogic.js';

const router = Router();
router.use(requireAuth);

function getUserBrief(id) {
  if (id == null) return null;
  const u = db.prepare('SELECT id, first_name, last_name, nickname FROM users WHERE id = ?').get(id);
  if (!u) return null;
  return { id: u.id, firstName: u.first_name, lastName: u.last_name, nickname: u.nickname };
}

router.get('/state', (req, res) => {
  const competition = getCompetition();
  const isAdmin = !!req.user.is_admin;

  const base = {
    status: competition.status,
    isAdmin,
  };

  if (competition.status === 'setup') {
    return res.json({
      ...base,
      contestantCount: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
    });
  }

  const order = getRunningOrder(competition);
  const currentContestantId = getCurrentContestantId(competition);
  const currentContestant = getUserBrief(currentContestantId);

  if (competition.status === 'judging_complete' || competition.status === 'results_published') {
    return res.json({
      ...base,
      totalContestants: order.length,
    });
  }

  // in_progress
  const isCurrentContestant = req.user.id === currentContestantId;
  const judges = eligibleJudgeIds(currentContestantId);
  const submittedCount = submittedJudgeCount(currentContestantId);

  let myScore = null;
  if (!isCurrentContestant) {
    myScore = db
      .prepare('SELECT * FROM scores WHERE judge_id = ? AND contestant_id = ?')
      .get(req.user.id, currentContestantId) || null;
  }

  res.json({
    ...base,
    phase: competition.current_phase,
    contestantIndex: competition.current_index,
    totalContestants: order.length,
    currentContestant,
    isCurrentContestant,
    submittedCount,
    totalJudges: judges.length,
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
  const competition = getCompetition();
  if (competition.status !== 'results_published') {
    return res.status(409).json({ error: 'Results have not been published yet' });
  }
  res.json({ leaderboard: computeLeaderboard() });
});

export default router;
