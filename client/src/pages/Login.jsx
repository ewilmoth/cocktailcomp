import { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(email.trim(), needsPassword ? password : undefined);
      onLoggedIn();
    } catch (err) {
      if (err.data?.needsPassword) {
        // The first prompt for the password isn't an error; a wrong one is.
        if (needsPassword) setError(err.message);
        setNeedsPassword(true);
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="main">
      <div className="center-stage">
        <div className="eyebrow">Woodhamptons Presents</div>
        <h1 className="headline">The Cocktail Competition</h1>
        <div className="subtext">A Met Gala Affair &mdash; enter your email to join or log back in.</div>
      </div>

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
            onChange={(e) => {
              setEmail(e.target.value);
              setNeedsPassword(false);
              setPassword('');
            }}
            placeholder="you@example.com"
          />
        </div>
        {needsPassword && (
          <div className="field">
            <label htmlFor="password">Admin password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        <button className="btn" type="submit" disabled={busy || !email || (needsPassword && !password)}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
