import { db, getCompetition, updateCompetition } from './db.js';

export function getRunningOrder(competition) {
  return JSON.parse(competition.running_order || '[]');
}

export function getCurrentContestantId(competition) {
  const order = getRunningOrder(competition);
  return order[competition.current_index] ?? null;
}

export function getAllUserIds() {
  return db.prepare('SELECT id FROM users ORDER BY id').all().map((r) => r.id);
}

export function eligibleJudgeIds(contestantId) {
  return getAllUserIds().filter((id) => id !== contestantId);
}

export function submittedJudgeCount(contestantId) {
  const row = db
    .prepare(
      'SELECT COUNT(*) AS n FROM scores WHERE contestant_id = ? AND submitted_at IS NOT NULL'
    )
    .get(contestantId);
  return row.n;
}

// Checks whether every eligible judge has submitted a score for the current
// contestant, and if so, advances the competition to the next contestant
// (or marks judging complete if that was the last one).
export function maybeAdvance() {
  const competition = getCompetition();
  if (competition.status !== 'in_progress' || competition.current_phase !== 'scoring') {
    return competition;
  }
  const contestantId = getCurrentContestantId(competition);
  if (contestantId == null) return competition;

  const judges = eligibleJudgeIds(contestantId);
  const submitted = submittedJudgeCount(contestantId);

  if (submitted < judges.length) return competition;

  const order = getRunningOrder(competition);
  const nextIndex = competition.current_index + 1;

  if (nextIndex >= order.length) {
    return updateCompetition({ status: 'judging_complete', current_phase: 'prep' });
  }
  return updateCompetition({ current_index: nextIndex, current_phase: 'prep' });
}

export function computeLeaderboard() {
  const users = db.prepare('SELECT id, first_name, last_name, nickname FROM users').all();
  const rows = db
    .prepare(
      `SELECT contestant_id,
              SUM(cocktail) AS cocktail_total,
              SUM(costume) AS costume_total,
              SUM(table_setting) AS table_setting_total,
              COUNT(*) AS judge_count
       FROM scores
       WHERE submitted_at IS NOT NULL
       GROUP BY contestant_id`
    )
    .all();
  const byId = new Map(rows.map((r) => [r.contestant_id, r]));

  return users
    .map((u) => {
      const r = byId.get(u.id);
      const cocktail = r?.cocktail_total || 0;
      const costume = r?.costume_total || 0;
      const tableSetting = r?.table_setting_total || 0;
      return {
        id: u.id,
        nickname: u.nickname,
        name: `${u.first_name} ${u.last_name}`,
        cocktail,
        costume,
        tableSetting,
        total: cocktail + costume + tableSetting,
        judgeCount: r?.judge_count || 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}
