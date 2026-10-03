import { useEffect, useState } from 'react';
import { api } from '../api.js';
import AddToHomeScreen from '../components/AddToHomeScreen.jsx';

const POLL_MS = 5000;

export default function JoinCompetition({ user, onJoined, onNavigate, onCancel }) {
  const [form, setForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    nickname: user.nickname || '',
  });
  const [competitions, setCompetitions] = useState(null);
  const [competitionId, setCompetitionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api
        .openCompetitions()
        .then((d) => {
          if (cancelled) return;
          setCompetitions(d.competitions);
          setCompetitionId((current) => {
            if (d.competitions.some((c) => String(c.id) === current)) return current;
            return d.competitions.length === 1 ? String(d.competitions[0].id) : '';
          });
        })
        .catch((e) => !cancelled && setError(e.message));
    }
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.join({ ...form, competitionId: Number(competitionId) });
      onJoined();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const field = (key, label, autoComplete) => (
    <div className="field">
      <label htmlFor={key}>{label}</label>
      <input
        id={key}
        required
        maxLength={40}
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div>
      <div className="center-stage" style={{ minHeight: 'auto', marginBottom: 24 }}>
        <div className="eyebrow">{user.competitionId ? 'Next Competition' : 'Welcome, Darling'}</div>
        <h1 className="headline">{user.competitionId ? 'Join another competition' : 'Step onto the carpet'}</h1>
        <div className="subtext">Tell us who you are and pick your competition.</div>
      </div>

      <form className="card" onSubmit={onSubmit}>
        {error && <div className="error-banner">{error}</div>}
        {field('firstName', 'First name', 'given-name')}
        {field('lastName', 'Surname', 'family-name')}
        {field('nickname', 'Nickname', 'nickname')}

        <div className="field">
          <label htmlFor="competition">Competition</label>
          {competitions && competitions.length === 0 ? (
            <div className="subtext">
              No competitions are open to join yet. This page will update as soon as one is.
            </div>
          ) : (
            <select
              id="competition"
              required
              value={competitionId}
              onChange={(e) => setCompetitionId(e.target.value)}
            >
              <option value="" disabled>
                {competitions ? 'Choose a competition…' : 'Loading…'}
              </option>
              {competitions?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <button className="btn" type="submit" disabled={busy || !competitionId}>
          {busy ? 'Joining…' : 'Join Competition'}
        </button>
        {onCancel && (
          <button type="button" className="btn secondary" style={{ marginTop: 10 }} onClick={onCancel}>
            Back to results
          </button>
        )}
      </form>

      {user.isAdmin && (
        <div className="card">
          <div className="subtext" style={{ marginBottom: 12 }}>
            Admin: create a competition in the Admin Panel, then join it here.
          </div>
          <button className="btn secondary" onClick={() => onNavigate('admin')}>
            Go to Admin Panel
          </button>
        </div>
      )}

      <AddToHomeScreen className="btn secondary">Add to Home Screen</AddToHomeScreen>
    </div>
  );
}
