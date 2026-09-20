import Prep from '../components/Prep.jsx';
import Scoring from '../components/Scoring.jsx';
import WaitingRoom from '../components/WaitingRoom.jsx';
import FinalResults from './FinalResults.jsx';

export default function Home({ state, onNavigate, onRefresh }) {
  if (!state) {
    return <div className="subtext">Loading…</div>;
  }

  if (state.status === 'setup') {
    return (
      <div className="center-stage">
        <div className="eyebrow">Woodhamptons</div>
        <h1 className="headline">Getting Ready</h1>
        <div className="subtext">
          {state.isAdmin
            ? `${state.contestantCount} contestant${state.contestantCount === 1 ? '' : 's'} invited so far. Head to the Admin Panel to add more and set the running order.`
            : "The competition hasn't started yet — sit tight, darling."}
        </div>
        {state.isAdmin && (
          <button className="btn" style={{ width: 'auto' }} onClick={() => onNavigate('admin')}>
            Go to Admin Panel
          </button>
        )}
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
    return <FinalResults />;
  }

  return null;
}
