import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function MyScores() {
  const [scores, setScores] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.myScores().then((d) => setScores(d.scores)).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="main">
      <div className="eyebrow">Your Ballot</div>
      <h1 className="headline" style={{ marginBottom: 16 }}>My Scores</h1>
      <div className="subtext" style={{ marginBottom: 20 }}>
        A record of the scores you've submitted so far. Only you can see this.
      </div>

      {error && <div className="error-banner">{error}</div>}

      {scores && scores.length === 0 && <div className="card subtext">You haven't submitted any scores yet.</div>}

      {scores?.map((s) => (
        <div className="card" key={s.contestantId}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--gold-bright)' }}>
              {s.nickname}
            </strong>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{s.total} / 30</span>
          </div>
          <div className="subtext" style={{ margin: '8px 0' }}>
            Cocktail {s.cocktail} &middot; Costume {s.costume} &middot; Table Setting {s.tableSetting}
          </div>
          {s.comments && <div style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>&ldquo;{s.comments}&rdquo;</div>}
        </div>
      ))}
    </div>
  );
}
