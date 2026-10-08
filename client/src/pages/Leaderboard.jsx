import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import LeaderboardTable from '../components/LeaderboardTable.jsx';
import YouTubeGate from '../components/YouTubeGate.jsx';
import { STATUS_LABELS } from './AdminPanel.jsx';

const GATE_VIDEO_ID = 'RfiQYRn7fBg';
const POLL_MS = 5000;

export default function Leaderboard({ user }) {
  const [competitions, setCompetitions] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [error, setError] = useState(null);
  // null = unlocked or not needed, 'video' = playing the video, 'password' = asking.
  const [gate, setGate] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const passwordRef = useRef('');
  const videoShownRef = useRef(false);

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

  const load = useCallback(() => {
    if (!selectedId) return Promise.resolve();
    return api
      .adminLeaderboard(selectedId, passwordRef.current)
      .then((d) => {
        setLeaderboard(d.leaderboard);
        setGate(null);
        setError(null);
      })
      .catch((e) => {
        if (!e.data?.needsScoresPassword) return setError(e.message);
        setLeaderboard(null);
        if (!videoShownRef.current) {
          videoShownRef.current = true;
          setGate('video');
        } else {
          setGate((g) => (g === 'video' ? g : 'password'));
          if (passwordRef.current) setPasswordError(e.message);
        }
      });
  }, [selectedId]);

  useEffect(() => {
    passwordRef.current = '';
    videoShownRef.current = false;
    setGate(null);
    setPasswordInput('');
    setPasswordError(null);
    setLeaderboard(null);
    load();
    const t = setInterval(() => {
      // Don't keep re-asking while the gate is up; the form drives retries.
      if (!passwordRef.current && videoShownRef.current) return;
      load();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  async function submitPassword(e) {
    e.preventDefault();
    setPasswordError(null);
    passwordRef.current = passwordInput;
    await load();
  }

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

      {gate === 'video' && (
        <div className="card">
          <YouTubeGate videoId={GATE_VIDEO_ID} onDone={() => setGate('password')} />
        </div>
      )}

      {gate === 'password' && (
        <form className="card" onSubmit={submitPassword}>
          <div className="subtext" style={{ marginBottom: 14 }}>
            Scores are locked while the game is on. Enter the scores password to peek.
          </div>
          {passwordError && <div className="error-banner">{passwordError}</div>}
          <div className="field">
            <label htmlFor="scoresPassword">Scores password</label>
            <input
              id="scoresPassword"
              type="password"
              autoComplete="off"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={!passwordInput}>
            Unlock Scores
          </button>
        </form>
      )}

      {leaderboard && (
        <div className="card">
          <LeaderboardTable leaderboard={leaderboard} />
        </div>
      )}
    </div>
  );
}
