import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import ScoreChips from './ScoreChips.jsx';

export default function Scoring({ state, onSubmitted }) {
  const name = state.currentContestant?.nickname || 'this contestant';
  const initial = state.myScore || {};
  const [cocktail, setCocktail] = useState(initial.cocktail ?? null);
  const [costume, setCostume] = useState(initial.costume ?? null);
  const [tableSetting, setTableSetting] = useState(initial.tableSetting ?? null);
  const [comments, setComments] = useState(initial.comments ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const draftTimer = useRef(null);

  useEffect(() => {
    return () => clearTimeout(draftTimer.current);
  }, []);

  function scheduleDraftSave(next) {
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      api.scoreDraft(next).catch(() => {});
    }, 500);
  }

  function updateAndSaveDraft(patch) {
    const next = {
      cocktail,
      costume,
      tableSetting,
      comments,
      ...patch,
    };
    if ('cocktail' in patch) setCocktail(patch.cocktail);
    if ('costume' in patch) setCostume(patch.costume);
    if ('tableSetting' in patch) setTableSetting(patch.tableSetting);
    if ('comments' in patch) setComments(patch.comments);
    scheduleDraftSave(next);
  }

  const complete = cocktail !== null && costume !== null && tableSetting !== null;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.scoreSubmit({ cocktail, costume, tableSetting, comments });
      onSubmitted(res.competition);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="eyebrow">Now Judging</div>
      <h1 className="headline" style={{ marginBottom: 20 }}>{name}</h1>

      <div className="card">
        {error && <div className="error-banner">{error}</div>}
        <ScoreChips label="Cocktail" value={cocktail} onChange={(v) => updateAndSaveDraft({ cocktail: v })} />
        <ScoreChips label="Costume" value={costume} onChange={(v) => updateAndSaveDraft({ costume: v })} />
        <ScoreChips
          label="Table Setting"
          value={tableSetting}
          onChange={(v) => updateAndSaveDraft({ tableSetting: v })}
        />

        <div className="field">
          <label htmlFor="comments">Comments</label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => updateAndSaveDraft({ comments: e.target.value })}
            placeholder="Notes for yourself — tasting notes, thoughts on the look, anything you'll want later."
          />
        </div>

        <button className="btn" onClick={submit} disabled={busy || !complete}>
          {busy ? 'Submitting…' : 'Submit Score'}
        </button>
        {!complete && (
          <div className="subtext" style={{ marginTop: 10 }}>
            Score all three categories to submit. Your answers are saved automatically as you go.
          </div>
        )}
      </div>
    </div>
  );
}
