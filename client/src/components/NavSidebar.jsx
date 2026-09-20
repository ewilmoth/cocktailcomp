import AddToHomeScreen from './AddToHomeScreen.jsx';

export default function NavSidebar({ open, onClose, user, page, onNavigate, onLogout, showFinalScoresBadge }) {
  if (!open) return null;

  function go(p) {
    onNavigate(p);
    onClose();
  }

  return (
    <>
      <div className="sidebar-overlay" onClick={onClose} />
      <div className="sidebar">
        <div className="brand" style={{ marginBottom: 12 }}>
          {user.nickname}
          <small>{user.isAdmin ? 'Admin' : 'Contestant'}</small>
        </div>
        <button className={`sidebar-link${page === 'home' ? ' gold' : ''}`} onClick={() => go('home')}>
          Home
        </button>
        <button className={`sidebar-link${page === 'myscores' ? ' gold' : ''}`} onClick={() => go('myscores')}>
          My Scores
        </button>
        <AddToHomeScreen className="sidebar-link">📲 Add to Home Screen</AddToHomeScreen>

        {user.isAdmin && (
          <>
            <hr />
            <button className={`sidebar-link${page === 'admin' ? ' gold' : ''}`} onClick={() => go('admin')}>
              Admin Panel
            </button>
            <button
              className={`sidebar-link${page === 'leaderboard' ? ' gold' : ''}`}
              onClick={() => go('leaderboard')}
            >
              Cumulative Scores{showFinalScoresBadge ? ' •' : ''}
            </button>
          </>
        )}

        <hr />
        <button className="sidebar-link" onClick={onLogout}>
          Log out
        </button>
      </div>
    </>
  );
}
