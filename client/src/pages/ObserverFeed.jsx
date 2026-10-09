import { useEffect, useState } from 'react';
import { api } from '../api.js';
import LeaderboardTable from '../components/LeaderboardTable.jsx';

const POLL_MS = 3000;

const ROUND_STATUS = {
  prep: 'Up now, preparing',
  scoring: 'Being scored now',
  done: 'Round complete',
};

function RoundCard({ round }) {
  const scored = round.judges.filter((j) => j.submitted).length;
  return (
    <div className="card">
      <div className="judge-checklist-header">
        <span>
          Round {round.number}: {round.contestant?.nickname}
        </span>
        <span>
          {scored} of {round.judges.length}
        </span>
      </div>
      <div className="subtext" style={{ marginBottom: 6 }}>
        {round.contestant?.firstName} {round.contestant?.lastName} &middot; {ROUND_STATUS[round.phase]}
      </div>
      {round.judges.map((j) => (
        <div className="roster-item" key={j.id} style={{ alignItems: 'flex-start' }}>
          <span>
            {j.firstName} {j.lastName} <span className="subtext">&ldquo;{j.nickname}&rdquo;</span>
            {j.submitted ? (
              <>
                <div className="lb-breakdown">
                  <span>Cocktail Flavour {j.cocktail}</span>
                  <span>Costume {j.costume}</span>
                  <span>Presentation {j.tableSetting}</span>
                </div>
                {j.comments && (
                  <div className="lb-breakdown" style={{ fontStyle: 'italic' }}>
                    &ldquo;{j.comments}&rdquo;
                  </div>
                )}
              </>
            ) : (
              <div className="lb-breakdown">Not scored yet</div>
            )}
          </span>
          <strong style={{ color: 'var(--gold)', marginLeft: 12 }}>{j.submitted ? j.total : '–'}</strong>
        </div>
      ))}
    </div>
  );
}

export default function ObserverFeed({ onNotJoined }) {
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api
        .observerFeed()
        .then((d) => {
          if (cancelled) return;
          setFeed(d);
          setError(null);
        })
        .catch((e) => {
          if (cancelled) return;
          if (e.data?.notJoined || e.status === 403) onNotJoined();
          else setError(e.message);
        });
    }
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [onNotJoined]);

  if (!feed) return <div className="subtext">{error || 'Loading…'}</div>;

  return (
    <div>
      <div className="eyebrow">Live Results</div>
      <h1 className="headline" style={{ marginBottom: 8 }}>{feed.competitionName}</h1>
      <div className="subtext" style={{ marginBottom: 20 }}>
        Updates every few seconds. Every vote, by name, as it comes in.
      </div>
      {error && <div className="error-banner">{error}</div>}

      {feed.status === 'setup' && (
        <div className="card">
          <div className="judge-checklist-header">
            <span>Not started yet. On the guest list</span>
            <span>{feed.members.length}</span>
          </div>
          {feed.members.map((m) => (
            <div className="roster-item" key={m.id}>
              <span>
                {m.firstName} {m.lastName} <span className="subtext">&ldquo;{m.nickname}&rdquo;</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {feed.status !== 'setup' && (
        <>
          <div className="card">
            <div className="judge-checklist-header">
              <span>Cumulative scores</span>
              <span>
                {feed.status === 'in_progress'
                  ? `Round ${feed.rounds[0]?.number ?? 0} of ${feed.totalRounds}`
                  : feed.status === 'judging_complete'
                    ? 'Judging complete'
                    : 'Results published'}
              </span>
            </div>
            <LeaderboardTable leaderboard={feed.leaderboard} />
          </div>
          {feed.rounds.map((r) => (
            <RoundCard key={r.number} round={r} />
          ))}
        </>
      )}
    </div>
  );
}
