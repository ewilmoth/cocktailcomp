import { useState } from 'react';
import { api } from '../api.js';

export default function EditProfile({ user, onSaved, onCancel }) {
  const [form, setForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    nickname: user.nickname || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.updateProfile(form);
      onSaved();
    } catch (err) {
      setError(err.message);
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
        <div className="eyebrow">Your Name</div>
        <h1 className="headline">Edit your name</h1>
        <div className="subtext">Changes show up on everyone's phone straight away.</div>
      </div>

      <form className="card" onSubmit={onSubmit}>
        {error && <div className="error-banner">{error}</div>}
        {field('firstName', 'First name', 'given-name')}
        {field('lastName', 'Surname', 'family-name')}
        {field('nickname', 'Nickname', 'nickname')}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn secondary" style={{ marginTop: 10 }} onClick={onCancel}>
          Cancel
        </button>
      </form>
    </div>
  );
}
