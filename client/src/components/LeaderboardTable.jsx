export default function LeaderboardTable({ leaderboard }) {
  return (
    <table className="lb">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Name</th>
          <th>Cocktail</th>
          <th>Costume</th>
          <th>Table</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {leaderboard.map((row, i) => (
          <tr key={row.id}>
            <td>{i + 1}</td>
            <td>{row.nickname}</td>
            <td>{row.cocktail}</td>
            <td>{row.costume}</td>
            <td>{row.tableSetting}</td>
            <td>{row.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
