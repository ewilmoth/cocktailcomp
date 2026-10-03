import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Login from './pages/Login.jsx';
import JoinCompetition from './pages/JoinCompetition.jsx';
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
  const [joiningAnother, setJoiningAnother] = useState(false);

  const loadMe = useCallback(() => {
    return api.me().then((d) => setUser(d.user)).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const joined = !!(user?.profileComplete && user?.competitionId);

  const refresh = useCallback(() => {
    if (!joined) return;
    api
      .state()
      .then(setState)
      .catch((err) => {
        // Kicked by an admin: reload the user so they land back on the picker.
        if (err.data?.notJoined) {
          setState(null);
          loadMe();
        }
      });
  }, [joined, loadMe]);

  useEffect(() => {
    if (!joined) return;
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [joined, user?.competitionId, refresh]);

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
    setState(null);
    setPage('home');
    setJoiningAnother(false);
  }

  function onJoined() {
    setState(null);
    setJoiningAnother(false);
    setPage('home');
    loadMe();
  }

  if (user === undefined) {
    return (
      <div className="app-shell">
        <div className="main center-stage">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell">
        <Login onLoggedIn={loadMe} />
      </div>
    );
  }

  const showFinalScoresBadge = user.isAdmin && state?.status === 'judging_complete';

  let content;
  if (page === 'admin' && user.isAdmin) {
    content = (
      <AdminPanel
        user={user}
        onNavigateHome={() => {
          setPage('home');
          refresh();
        }}
      />
    );
  } else if (page === 'leaderboard' && user.isAdmin) {
    content = <Leaderboard user={user} />;
  } else if (!joined || joiningAnother) {
    content = (
      <JoinCompetition
        user={user}
        onJoined={onJoined}
        onNavigate={setPage}
        onCancel={joiningAnother ? () => setJoiningAnother(false) : null}
        leavingUnfinished={
          joined && (state?.status === 'in_progress' || state?.status === 'judging_complete')
        }
      />
    );
  } else if (page === 'myscores') {
    content = <MyScores />;
  } else {
    content = (
      <Home state={state} onNavigate={setPage} onRefresh={refresh} onJoinAnother={() => setJoiningAnother(true)} />
    );
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          Woodhamptons
          <small>{user.competitionName || 'Cocktail Competition'}</small>
        </div>
        <button className="icon-btn" onClick={() => setSidebarOpen(true)} aria-label="Menu">
          ☰
        </button>
      </div>

      <NavSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        joined={joined}
        page={page}
        onNavigate={setPage}
        onLogout={logout}
        onSwitch={() => {
          setJoiningAnother(true);
          setPage('home');
        }}
        showFinalScoresBadge={showFinalScoresBadge}
      />

      <div className="main">{content}</div>
    </div>
  );
}
