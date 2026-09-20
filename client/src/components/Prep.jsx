import { useState } from 'react';
import { api } from '../api.js';

export default function Prep({ state, onAdvanced }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const name = state.currentContestant?.nickname || 'Someone';

  async function startScoring() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.adminStartScoring();
      onAdvanced(res.competition);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-stage">
      {state.isCurrentContestant ? (
        <>
          <div className="eyebrow">On Deck</div>
          <h1 className="headline">You're up next, darling! 💄</h1>
          <div className="subtext">Get your cocktail, costume and table looking flawless. The judges await.</div>
        </>
      ) : (
        <>
          <div className="eyebrow">On Deck</div>
          <h1 className="headline">{name} is up next</h1>
          <div className="subtext">Sit back and relax &mdash; scoring will open shortly.</div>
        </>
      )}

      {state.isAdmin && (
        <div className="card" style={{ width: '100%', marginTop: 20 }}>
          {error && <div className="error-banner">{error}</div>}
          <button className="btn" onClick={startScoring} disabled={busy}>
            {busy ? 'Opening…' : `Start Scoring for ${name}`}
          </button>
        </div>
      )}
    </div>
  );
}
