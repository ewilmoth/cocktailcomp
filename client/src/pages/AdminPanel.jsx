import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const POLL_MS = 5000;

export const STATUS_LABELS = {
  setup: 'Open for joining',
  in_progress: 'In progress',
  judging_complete: 'Judging complete',
  results_published: 'Results published',
};

const sectionTitle = (text, color = 'var(--gold-bright)') => (
  <div style={{ fontWeight: 700, marginBottom: 10, color }}>{text}</div>
);

export default function AdminPanel({ user, onNavigateHome }) {
  const [competitions, setCompetitions] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadCompetitions = useCallback(async () => {
    const { competitions: list } = await api.adminCompetitions();
    setCompetitions(list);
    setSelectedId((current) => {
      if (current && list.some((c) => c.id === current)) return current;
      if (list.some((c) => c.id === user.competitionId)) return user.competitionId;
      return list[0]?.id ?? null;
    });
  }, [user.competitionId]);

  const loadDetail = useCallback(async () => {
    if (!selectedId) return setDetail(null);
    setDetail(await api.adminCompetition(selectedId));
  }, [selectedId]);

  useEffect(() => {
    loadCompetitions().catch((e) => setError(e.message));
  }, [loadCompetitions]);

  useEffect(() => {
    loadDetail().catch((e) => setError(e.message));
    const t = setInterval(() => loadDetail().catch(() => {}), POLL_MS);
    return () => clearInterval(t);
  }, [loadDetail]);

  async function run(action, { confirmText, successNotice, goHome } = {}) {
    if (confirmText && !confirm(confirmText)) return;
    setError(null);
    setNotice(null);
    try {
      await action();
      await Promise.all([loadCompetitions(), loadDetail()]);
      if (successNotice) setNotice(successNotice);
      if (goHome) onNavigateHome?.();
    } catch (err) {
      setError(err.message);
      loadDetail().catch(() => {});
    }
  }

  async function createCompetition(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { competition } = await api.adminCreateCompetition(newName.trim());
      setNewName('');
      setSelectedId(competition.id);
      await loadCompetitions();
      setNotice(`Created "${competition.name}". Share the link so people can join it.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function move(idx, dir) {
    const order = [...detail.competition.runningOrder];
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    [order[idx], order[j]] = [order[j], order[idx]];
    setDetail({ ...detail, competition: { ...detail.competition, runningOrder: order } });
    api.adminSetOrder(selectedId, order).catch((err) => setError(err.message));
  }

  const c = detail?.competition;
  const membersById = new Map((detail?.members || []).map((m) => [m.id, m]));
  const judgingOver = c?.status === 'judging_complete' || c?.status === 'results_published';

  return (
    <div>
      <div className="eyebrow">Admin</div>
      <h1 className="headline" style={{ marginBottom: 16 }}>Admin Panel</h1>

      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="success-banner">{notice}</div>}

      <div className="card">
        {sectionTitle('Competitions')}
        {competitions?.length > 0 && (
          <div className="field">
            <label htmlFor="selectedCompetition">Managing</label>
            <select
              id="selectedCompetition"
              value={selectedId ?? ''}
              onChange={(e) => {
                setNotice(null);
                setSelectedId(Number(e.target.value));
              }}
            >
              {competitions.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} — {STATUS_LABELS[comp.status]} ({comp.memberCount})
                </option>
              ))}
            </select>
          </div>
        )}
        <form onSubmit={createCompetition}>
          <div className="field">
            <label htmlFor="newCompetition">New competition name</label>
            <input
              id="newCompetition"
              maxLength={80}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Woodhamptons Cocktail Competition"
            />
          </div>
          <button className="btn secondary" type="submit" disabled={busy || !newName.trim()}>
            Create Competition
          </button>
        </form>
      </div>

      {c && (
        <>
          <div className="card">
            {sectionTitle(c.name)}
            <div className="subtext" style={{ marginBottom: 14 }}>
              Status: <strong>{STATUS_LABELS[c.status]}</strong>
              {c.status === 'in_progress' && (
                <>
                  {' '}
                  &middot; Contestant {c.currentIndex + 1} of {c.runningOrder.length}, {c.currentPhase}
                </>
              )}
            </div>

            {c.status === 'setup' && (
              <button
                className="btn"
                onClick={() => run(() => api.adminStart(c.id), { goHome: user.competitionId === c.id })}
              >
                Start Competition
              </button>
            )}
            {c.status === 'in_progress' && (
              <button
                className="btn secondary"
                onClick={() =>
                  run(() => api.adminForceAdvance(c.id, c.currentIndex), {
                    confirmText: 'Force-advance to the next contestant even though not everyone has submitted?',
                    goHome: user.competitionId === c.id,
                  })
                }
              >
                Force Advance (skip waiting)
              </button>
            )}
            {c.status === 'judging_complete' && (
              <button
                className="btn"
                onClick={() =>
                  run(() => api.adminPublish(c.id), {
                    confirmText: 'Publish final results to everyone now? This also emails everyone the results.',
                    successNotice: 'Results published!',
                    goHome: user.competitionId === c.id,
                  })
                }
              >
                Submit Results to Everyone
              </button>
            )}
          </div>

          {c.status === 'setup' && (
            <div className="card">
              {sectionTitle('Running Order')}
              {c.runningOrder.length === 0 ? (
                <div className="subtext">Nobody has joined yet.</div>
              ) : (
                <ul className="drag-list">
                  {c.runningOrder.map((id, idx) => (
                    <li key={id}>
                      <span>
                        {idx + 1}. {membersById.get(id)?.nickname || '…'}
                      </span>
                      <span className="order-controls">
                        <button onClick={() => move(idx, -1)} aria-label="Move up">↑</button>
                        <button onClick={() => move(idx, 1)} aria-label="Move down">↓</button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                className="btn secondary"
                style={{ marginTop: 8 }}
                disabled={c.runningOrder.length < 2}
                onClick={() => run(() => api.adminRandomizeOrder(c.id))}
              >
                Randomize Order
              </button>
            </div>
          )}

          <div className="card">
            {sectionTitle(`Members (${detail.members.length})`)}
            {detail.members.length === 0 && <div className="subtext">Nobody has joined yet.</div>}
            {detail.members.map((m) => (
              <div className="roster-item" key={m.id}>
                <span>
                  {m.firstName} &ldquo;{m.nickname}&rdquo; {m.lastName}
                  {m.isAdmin && <span className="badge">Admin</span>}
                  <br />
                  <span className="subtext" style={{ fontSize: 12 }}>{m.email}</span>
                </span>
                {!judgingOver && (
                  <button
                    className="btn danger"
                    style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }}
                    onClick={() =>
                      run(() => api.adminRemoveMember(c.id, m.id), {
                        confirmText:
                          `Remove ${m.nickname} from ${c.name}?\n\n` +
                          'Any scores they gave or received in this competition are deleted. ' +
                          'Their account stays, so they can join another competition.',
                      })
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="card">
            {sectionTitle('Danger Zone', 'var(--danger)')}
            <div className="subtext" style={{ marginBottom: 14 }}>
              Resetting wipes every score submitted in {c.name} and puts it back to Setup. Members and the
              running order stay. This cannot be undone.
            </div>
            <button
              className="btn danger"
              onClick={() =>
                run(() => api.adminReset(c.id), {
                  confirmText:
                    `This will permanently delete every score anyone has submitted in ${c.name} ` +
                    'and put it back to Setup.\n\nMembers stay, and everyone starts fresh.\n\n' +
                    'This cannot be undone. Are you absolutely sure?',
                  successNotice: 'Competition has been reset.',
                })
              }
            >
              Reset Competition
            </button>
          </div>
        </>
      )}
    </div>
  );
}
