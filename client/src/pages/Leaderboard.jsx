import { useEffect, useState } from 'react';
import { api } from '../api.js';
import LeaderboardTable from '../components/LeaderboardTable.jsx';
import { STATUS_LABELS } from './AdminPanel.jsx';

export default function Leaderboard({ user }) {
  const [competitions, setCompetitions] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .adminCompetitions()
      .then(({ competitions: list }) => {
        setCompetitions(list);
        const own = list.find((c) => c.id === user.competitionId);
        setSelectedId((own || list[0])?.id ?? null);
      })
      .catch((e) => setError(e.message));
  }, [user.competitionId]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    function load() {
      api
        .adminLeaderboard(selectedId)
        .then((d) => !cancelled && setLeaderboard(d.leaderboard))
        .catch((e) => !cancelled && setError(e.message));
    }
    setLeaderboard(null);
    load();
    const t = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [selectedId]);

  return (
    <div>
      <div className="eyebrow">Admins Only</div>
      <h1 className="headline" style={{ marginBottom: 16 }}>Cumulative Scores</h1>
      <div className="subtext" style={{ marginBottom: 20 }}>
        Live running totals. Contestants can't see this &mdash; keep it to yourselves!
      </div>
      {error && <div className="error-banner">{error}</div>}
      {competitions?.length === 0 && <div className="card subtext">No competitions yet.</div>}
      {competitions?.length > 1 && (
        <div className="field">
          <label htmlFor="leaderboardCompetition">Competition</label>
          <select
            id="leaderboardCompetition"
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {STATUS_LABELS[c.status]}
              </option>
            ))}
          </select>
        </div>
      )}
      {leaderboard && (
        <div className="card">
          <LeaderboardTable leaderboard={leaderboard} />
        </div>
      )}
    </div>
  );
}
