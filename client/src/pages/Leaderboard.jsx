import { useEffect, useState } from 'react';
import { api } from '../api.js';
import LeaderboardTable from '../components/LeaderboardTable.jsx';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    api.adminLeaderboard().then((d) => setLeaderboard(d.leaderboard)).catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="main">
      <div className="eyebrow">Admins Only</div>
      <h1 className="headline" style={{ marginBottom: 16 }}>Cumulative Scores</h1>
      <div className="subtext" style={{ marginBottom: 20 }}>
        Live running totals. Contestants can't see this &mdash; keep it to yourselves!
      </div>
      {error && <div className="error-banner">{error}</div>}
      {leaderboard && (
        <div className="card">
          <LeaderboardTable leaderboard={leaderboard} />
        </div>
      )}
    </div>
  );
}
