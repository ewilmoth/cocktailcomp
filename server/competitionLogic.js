import { db, getCompetition, updateCompetition } from './db.js';
import { sendRoundBackupEmail } from './email.js';

// The running order is the competition's roster: joining appends to it,
// kicking removes from it. users.competition_id only says where a user's
// Home screen points, so leaving a finished competition keeps its results.
export function getRunningOrder(competition) {
  return JSON.parse(competition.running_order || '[]');
}

export function requireJoinedCompetition(req, res, next) {
  const competition = req.user.competition_id ? getCompetition(req.user.competition_id) : null;
  if (!competition) {
    return res.status(409).json({ error: "You haven't joined a competition yet", notJoined: true });
  }
  req.competition = competition;
  next();
}

export function getCurrentContestantId(competition) {
  const order = getRunningOrder(competition);
  return order[competition.current_index] ?? null;
}

export function eligibleJudgeIds(competition) {
  const contestantId = getCurrentContestantId(competition);
  return getRunningOrder(competition).filter((id) => id !== contestantId);
}

export function submittedJudgeIds(competitionId, contestantId) {
  return new Set(
    db
      .prepare(
        'SELECT judge_id FROM scores WHERE competition_id = ? AND contestant_id = ? AND submitted_at IS NOT NULL'
      )
      .all(competitionId, contestantId)
      .map((r) => r.judge_id)
  );
}

export function getUsersByIds(ids) {
  if (!ids.length) return [];
  const rows = db
    .prepare(`SELECT * FROM users WHERE id IN (${ids.map(() => '?').join(',')})`)
    .all(...ids);
  const byId = new Map(rows.map((u) => [u.id, u]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

// Once every eligible judge has submitted for the current contestant, move to
// the next contestant's prep phase, or finish judging after the last one.
export function maybeAdvance(competitionId) {
  const competition = getCompetition(competitionId);
  if (competition.status !== 'in_progress' || competition.current_phase !== 'scoring') {
    return competition;
  }
  const contestantId = getCurrentContestantId(competition);
  if (contestantId == null) return competition;

  const submitted = submittedJudgeIds(competitionId, contestantId);
  if (!eligibleJudgeIds(competition).every((id) => submitted.has(id))) return competition;

  return advance(competition);
}

export function advance(competition) {
  if (competition.current_phase === 'scoring') emailRoundBackup(competition);
  const nextIndex = competition.current_index + 1;
  if (nextIndex >= getRunningOrder(competition).length) {
    return updateCompetition(competition.id, { status: 'judging_complete', current_phase: 'prep' });
  }
  return updateCompetition(competition.id, { current_index: nextIndex, current_phase: 'prep' });
}

// A safety copy of each finished round, in case the server dies mid-game.
// Fire-and-forget: a slow or failing mail server must never hold up play.
function emailRoundBackup(competition) {
  const to = process.env.BACKUP_EMAIL;
  if (!to) return;
  const contestantId = getCurrentContestantId(competition);
  const [contestant] = getUsersByIds([contestantId]);
  const scores = db
    .prepare('SELECT * FROM scores WHERE competition_id = ? AND contestant_id = ? AND submitted_at IS NOT NULL')
    .all(competition.id, contestantId);
  const byJudge = new Map(scores.map((s) => [s.judge_id, s]));
  const round = getUsersByIds(eligibleJudgeIds(competition)).map((j) => ({
    nickname: j.nickname,
    name: `${j.first_name} ${j.last_name}`,
    score: byJudge.get(j.id) || null,
  }));

  sendRoundBackupEmail({
    to,
    competitionName: competition.name,
    roundNumber: competition.current_index + 1,
    totalRounds: getRunningOrder(competition).length,
    contestant,
    round,
    leaderboard: computeLeaderboard(competition),
  }).catch((err) => console.error('Backup email failed:', err.message));
}

export function addMember(competitionId, userId) {
  const competition = getCompetition(competitionId);
  const order = getRunningOrder(competition);
  if (!order.includes(userId)) {
    updateCompetition(competitionId, { running_order: JSON.stringify([...order, userId]) });
  }
}

export function removeMember(competitionId, userId) {
  const competition = getCompetition(competitionId);
  const order = getRunningOrder(competition);
  const removedIndex = order.indexOf(userId);

  db.prepare('UPDATE users SET competition_id = NULL WHERE id = ? AND competition_id = ?').run(
    userId,
    competitionId
  );
  db.prepare('DELETE FROM scores WHERE competition_id = ? AND (judge_id = ? OR contestant_id = ?)').run(
    competitionId,
    userId,
    userId
  );

  const newOrder = order.filter((id) => id !== userId);
  let currentIndex = competition.current_index;
  if (removedIndex !== -1 && removedIndex < currentIndex) currentIndex -= 1;
  const fields = { running_order: JSON.stringify(newOrder), current_index: currentIndex };

  // Removing whoever is up hands the turn to the next person, starting from prep.
  if (competition.status === 'in_progress' && removedIndex === competition.current_index) {
    fields.current_phase = 'prep';
    if (currentIndex >= newOrder.length) fields.status = 'judging_complete';
  }
  updateCompetition(competitionId, fields);

  // The departing judge may have been the last one this round was waiting on.
  return maybeAdvance(competitionId);
}

export function computeLeaderboard(competition) {
  const users = getUsersByIds(getRunningOrder(competition));
  const rows = db
    .prepare(
      `SELECT contestant_id,
              SUM(cocktail) AS cocktail_total,
              SUM(costume) AS costume_total,
              SUM(table_setting) AS table_setting_total,
              COUNT(*) AS judge_count
       FROM scores
       WHERE competition_id = ? AND submitted_at IS NOT NULL
       GROUP BY contestant_id`
    )
    .all(competition.id);
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
