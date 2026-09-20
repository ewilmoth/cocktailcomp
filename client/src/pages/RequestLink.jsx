import { useState } from 'react';
import { api } from '../api.js';
import AddToHomeScreen from '../components/AddToHomeScreen.jsx';
import MetGalaFigures from '../components/MetGalaFigures.jsx';

export default function RequestLink({ expiredError }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.requestLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="main">
      <div className="met-gala-figures-frame">
        <MetGalaFigures className="met-gala-figures" />
      </div>

      <div className="center-stage">
        <div className="eyebrow">Woodhamptons Presents</div>
        <h1 className="headline">The Cocktail Competition</h1>
        <div className="subtext">A Met Gala Affair &mdash; enter your email to step onto the carpet.</div>
      </div>

      {expiredError && (
        <div className="error-banner">That login link has expired. Request a fresh one below.</div>
      )}

      {sent ? (
        <div className="card">
          <div className="success-banner">
            Check your inbox! We've sent a login link to <strong>{email}</strong>.
          </div>
          <div className="subtext" style={{ marginBottom: 16 }}>
            Open it on this phone and you'll be logged in from here on out.
          </div>
          <AddToHomeScreen className="btn secondary">Add to Home Screen</AddToHomeScreen>
        </div>
      ) : (
        <form className="card" onSubmit={onSubmit}>
          {error && <div className="error-banner">{error}</div>}
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <button className="btn" type="submit" disabled={busy || !email}>
            {busy ? 'Sending…' : 'Send me a login link'}
          </button>
        </form>
      )}
    </div>
  );
}
