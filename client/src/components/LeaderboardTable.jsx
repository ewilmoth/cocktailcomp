export default function LeaderboardTable({ leaderboard }) {
  return (
    <table className="lb">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Name</th>
          <th className="num">Total</th>
        </tr>
      </thead>
      <tbody>
        {leaderboard.map((row, i) => (
          <tr key={row.id}>
            <td>{i + 1}</td>
            <td>
              {row.nickname}
              <div className="lb-breakdown">
                <span>Cocktail Flavour {row.cocktail}</span>
                <span>Costume {row.costume}</span>
                <span>Presentation {row.tableSetting}</span>
              </div>
            </td>
            <td className="num">{row.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
