import Prep from '../components/Prep.jsx';
import Scoring from '../components/Scoring.jsx';
import WaitingRoom from '../components/WaitingRoom.jsx';
import FinalResults from './FinalResults.jsx';

export default function Home({ state, onNavigate, onRefresh, onJoinAnother }) {
  if (!state) {
    return <div className="subtext">Loading…</div>;
  }

  if (state.status === 'setup') {
    return (
      <div>
        <div className="center-stage" style={{ minHeight: '36vh' }}>
          <div className="eyebrow">{state.competitionName}</div>
          <h1 className="headline">Getting Ready</h1>
          <div className="subtext">
            {state.isAdmin
              ? 'Start the competition from the Admin Panel once everyone has joined.'
              : "The competition hasn't started yet — sit tight, darling."}
          </div>
          {state.isAdmin && (
            <button className="btn" style={{ width: 'auto' }} onClick={() => onNavigate('admin')}>
              Go to Admin Panel
            </button>
          )}
        </div>
        <div className="card">
          <div className="judge-checklist-header">
            <span>On the guest list</span>
            <span>{state.members.length}</span>
          </div>
          {state.members.map((m) => (
            <div className="roster-item" key={m.id}>
              <span>
                {m.firstName} {m.lastName} <span className="subtext">&ldquo;{m.nickname}&rdquo;</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (state.status === 'in_progress') {
    if (state.phase === 'prep') {
      return <Prep state={state} onAdvanced={onRefresh} />;
    }
    // scoring phase
    if (state.isCurrentContestant || state.myScore?.submitted) {
      return <WaitingRoom state={state} />;
    }
    return <Scoring state={state} onSubmitted={onRefresh} />;
  }

  if (state.status === 'judging_complete') {
    return (
      <div className="center-stage">
        <div className="eyebrow">All Scores Are In</div>
        <h1 className="headline">{state.isAdmin ? 'See Final Scores' : "Judging's Done!"}</h1>
        <div className="subtext">
          {state.isAdmin
            ? 'Review the leaderboard, then submit results to everyone when ready.'
            : 'Sit tight while the judges tally everything up.'}
        </div>
        {state.isAdmin && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn secondary" style={{ width: 'auto' }} onClick={() => onNavigate('leaderboard')}>
              View Leaderboard
            </button>
            <button className="btn" style={{ width: 'auto' }} onClick={() => onNavigate('admin')}>
              Go to Admin Panel
            </button>
          </div>
        )}
      </div>
    );
  }

  if (state.status === 'results_published') {
    return (
      <div>
        <FinalResults />
        <button className="btn secondary" onClick={onJoinAnother}>
          Join another competition
        </button>
      </div>
    );
  }

  return null;
}
