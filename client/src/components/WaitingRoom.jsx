export default function WaitingRoom({ state }) {
  const name = state.currentContestant?.nickname || 'they';
  const remaining = Math.max(0, (state.totalJudges || 0) - (state.submittedCount || 0));

  return (
    <div className="center-stage">
      {state.isCurrentContestant ? (
        <>
          <div className="eyebrow">Being Judged</div>
          <h1 className="headline">Relax, you're being judged ✨</h1>
          <div className="subtext">The judges are scoring your cocktail, costume and table setting right now.</div>
        </>
      ) : (
        <>
          <div className="eyebrow">Scores In</div>
          <h1 className="headline">Thanks for scoring {name}!</h1>
          <div className="subtext">
            Waiting on {remaining} more {remaining === 1 ? 'judge' : 'judges'} before we move on.
          </div>
        </>
      )}
    </div>
  );
}
