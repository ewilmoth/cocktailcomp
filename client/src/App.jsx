import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import RequestLink from './pages/RequestLink.jsx';
import Home from './pages/Home.jsx';
import MyScores from './pages/MyScores.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import NavSidebar from './components/NavSidebar.jsx';

const POLL_MS = 3500;

export default function App() {
  const [user, setUser] = useState(undefined);
  const [state, setState] = useState(null);
  const [page, setPage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api.me().then((d) => setUser(d.user)).catch(() => setUser(null));
  }, []);

  const refresh = useCallback(() => {
    if (!user) return;
    api.state().then(setState).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [user, refresh]);

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
    setState(null);
    setPage('home');
  }

  if (user === undefined) {
    return (
      <div className="app-shell">
        <div className="main center-stage">Loading…</div>
      </div>
    );
  }

  if (!user) {
    const params = new URLSearchParams(window.location.search);
    return (
      <div className="app-shell">
        <RequestLink expiredError={params.get('error') === 'expired'} />
      </div>
    );
  }

  const showFinalScoresBadge = user.isAdmin && state?.status === 'judging_complete';

  let content;
  if (page === 'myscores') content = <MyScores />;
  else if (page === 'admin' && user.isAdmin) content = <AdminPanel />;
  else if (page === 'leaderboard' && user.isAdmin) content = <Leaderboard />;
  else content = <Home state={state} onNavigate={setPage} onRefresh={refresh} />;

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          Woodhamptons
          <small>Cocktail Competition</small>
        </div>
        <button className="icon-btn" onClick={() => setSidebarOpen(true)} aria-label="Menu">
          ☰
        </button>
      </div>

      <NavSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        page={page}
        onNavigate={setPage}
        onLogout={logout}
        showFinalScoresBadge={showFinalScoresBadge}
      />

      <div className="main">{content}</div>
    </div>
  );
}
