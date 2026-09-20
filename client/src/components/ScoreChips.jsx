const VALUES = Array.from({ length: 11 }, (_, i) => i);

export default function ScoreChips({ label, value, onChange, disabled }) {
  return (
    <div className="score-row">
      <div className="score-label">
        <span>{label}</span>
        <span>{value === null || value === undefined ? '–' : value}</span>
      </div>
      <div className="chip-row">
        {VALUES.map((v) => (
          <button
            key={v}
            type="button"
            className={`chip${value === v ? ' selected' : ''}`}
            onClick={() => !disabled && onChange(v)}
            disabled={disabled}
            aria-label={`${label} ${v}`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
