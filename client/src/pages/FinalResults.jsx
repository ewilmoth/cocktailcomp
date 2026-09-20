import { useEffect, useState } from 'react';
import { api } from '../api.js';
import LeaderboardTable from '../components/LeaderboardTable.jsx';

export default function FinalResults() {
  const [leaderboard, setLeaderboard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.results().then((d) => setLeaderboard(d.leaderboard)).catch((e) => setError(e.message));
  }, []);

  const winner = leaderboard?.[0];

  return (
    <div>
      <div className="center-stage" style={{ minHeight: 'auto', marginBottom: 24 }}>
        <div className="eyebrow">The Results Are In</div>
        <h1 className="headline">
          {winner ? `Congratulations, ${winner.nickname}! \u{1F3C6}` : 'Final Results'}
        </h1>
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
