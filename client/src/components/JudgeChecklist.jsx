export default function JudgeChecklist({ judges }) {
  if (!judges?.length) return null;
  const done = judges.filter((j) => j.submitted).length;

  return (
    <div className="card judge-checklist">
      <div className="judge-checklist-header">
        <span>Scores in</span>
        <span>
          {done} of {judges.length}
        </span>
      </div>
      <ul>
        {judges.map((j) => (
          <li key={j.id} className={j.submitted ? 'done' : ''}>
            <span className="judge-mark" aria-label={j.submitted ? 'Submitted' : 'Waiting'}>
              {j.submitted ? '✓' : '•'}
            </span>
            <span className="judge-name">
              {j.firstName} {j.lastName}
              <small>{j.nickname}</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
