import { useEffect, useState } from 'react';
import { api } from '../api.js';

function emptyForm() {
  return { firstName: '', lastName: '', nickname: '', email: '', isAdmin: false };
}

export default function AdminPanel() {
  const [users, setUsers] = useState(null);
  const [competition, setCompetition] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [u, c] = await Promise.all([api.adminUsers(), api.adminCompetition()]);
    setUsers(u.users);
    setCompetition(c);
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);

  async function createUser(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.adminCreateUser(form);
      setForm(emptyForm());
      setNotice(`Invite sent to ${form.email}.`);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function randomize() {
    setError(null);
    try {
      await api.adminRandomizeOrder();
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function move(idx, dir) {
    const order = [...competition.runningOrder];
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    [order[idx], order[j]] = [order[j], order[idx]];
    setCompetition({ ...competition, runningOrder: order });
    api.adminSetOrder(order).catch((err) => setError(err.message));
  }

  async function start() {
    setError(null);
    try {
      await api.adminStart();
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function forceAdvance() {
    if (!confirm('Force-advance to the next contestant even though not everyone has submitted?')) return;
    setError(null);
    try {
      await api.adminForceAdvance();
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function publish() {
    if (!confirm('Publish final results to everyone now? This sends an email to all contestants.')) return;
    setError(null);
    try {
      await api.adminPublish();
      setNotice('Results published!');
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  const usersById = new Map((users || []).map((u) => [u.id, u]));

  return (
    <div className="main">
      <div className="eyebrow">Admin</div>
      <h1 className="headline" style={{ marginBottom: 16 }}>Admin Panel</h1>

      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="success-banner">{notice}</div>}

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--gold-bright)' }}>Competition Status</div>
        <div className="subtext" style={{ marginBottom: 14 }}>
          Status: <strong>{competition?.status}</strong>
          {competition?.status === 'in_progress' && <> &middot; Phase: <strong>{competition.currentPhase}</strong></>}
        </div>

        {competition?.status === 'setup' && (
          <button className="btn" onClick={start}>Start Competition</button>
        )}
        {competition?.status === 'in_progress' && (
          <button className="btn secondary" onClick={forceAdvance}>Force Advance (skip waiting)</button>
        )}
        {competition?.status === 'judging_complete' && (
          <button className="btn" onClick={publish}>Submit Results to Everyone</button>
        )}
      </div>

      {competition?.status === 'setup' && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--gold-bright)' }}>Running Order</div>
          {competition.runningOrder.length === 0 ? (
            <div className="subtext">No running order yet.</div>
          ) : (
            <ul className="drag-list">
              {competition.runningOrder.map((id, idx) => (
                <li key={id}>
                  <span>{idx + 1}. {usersById.get(id)?.nickname || '…'}</span>
                  <span className="order-controls">
                    <button onClick={() => move(idx, -1)} aria-label="Move up">↑</button>
                    <button onClick={() => move(idx, 1)} aria-label="Move down">↓</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button className="btn secondary" onClick={randomize} style={{ marginTop: 8 }}>
            Randomize Order
          </button>
        </div>
      )}

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--gold-bright)' }}>Add Contestant</div>
        <form onSubmit={createUser}>
          <div className="field">
            <label>First name</label>
            <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div className="field">
            <label>Surname</label>
            <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div className="field">
            <label>Nickname</label>
            <input required value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          </div>
          <div className="field">
            <label>Email</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="isAdmin"
              style={{ width: 'auto' }}
              checked={form.isAdmin}
              onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })}
            />
            <label htmlFor="isAdmin" style={{ margin: 0 }}>Make this person an admin</label>
          </div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Sending invite…' : 'Add & Send Invite'}
          </button>
        </form>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--gold-bright)' }}>Roster ({users?.length ?? 0})</div>
        {users?.map((u) => (
          <div className="roster-item" key={u.id}>
            <span>{u.firstName} "{u.nickname}" {u.lastName}{u.isAdmin && <span className="badge">Admin</span>}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
