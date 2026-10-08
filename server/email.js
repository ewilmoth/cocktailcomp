import nodemailer from 'nodemailer';

const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;

let transporter = null;
if (GMAIL_USER && GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
}

// Names are typed in by whoever registers, so never trust them in HTML.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapEmail({ preheader, body }) {
  return `
  <div style="background:#0d0a08;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:480px;margin:0 auto;background:#171310;border:1px solid #caa25d;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#3a1f1f,#0d0a08);padding:28px 24px;text-align:center;border-bottom:1px solid #caa25d;">
        <div style="color:#caa25d;letter-spacing:3px;font-size:12px;text-transform:uppercase;margin-bottom:6px;">Woodhamptons Presents</div>
        <div style="color:#f5ead7;font-size:24px;font-weight:bold;">The Cocktail Competition</div>
        <div style="color:#e0c58f;font-size:13px;margin-top:4px;font-style:italic;">A Met Gala Affair</div>
      </div>
      <div style="padding:28px 24px;color:#f0e6d6;font-size:15px;line-height:1.6;">
        ${body}
      </div>
      <div style="padding:16px 24px;color:#7a6b55;font-size:11px;text-align:center;border-top:1px solid #2a231c;">
        ${preheader || ''}
      </div>
    </div>
  </div>`;
}

async function send({ to, subject, html }) {
  if (!transporter) {
    console.log(`\n[email:disabled] Would send to ${to}: ${subject}`);
    console.log(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    return;
  }
  await transporter.sendMail({
    from: `"Woodhamptons Cocktail Competition" <${GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

function backupTable(headers, rows) {
  const cell = 'padding:6px 10px;border:1px solid #ccc;text-align:left;vertical-align:top;';
  const head = headers.map((h) => `<th style="${cell}background:#f2ece2;">${h}</th>`).join('');
  const body = rows.map((r) => `<tr>${r.map((v) => `<td style="${cell}">${v}</td>`).join('')}</tr>`).join('');
  return `<table style="border-collapse:collapse;font-size:14px;margin:8px 0 20px;">${head ? `<tr>${head}</tr>` : ''}${body}</table>`;
}

export async function sendRoundBackupEmail({
  to,
  competitionName,
  roundNumber,
  totalRounds,
  contestant,
  round,
  leaderboard,
}) {
  const who = escapeHtml(contestant?.nickname ?? 'Unknown');
  const roundRows = round.map(({ nickname, name, score }) => [
    `${escapeHtml(nickname)} <span style="color:#777;">(${escapeHtml(name)})</span>`,
    ...(score
      ? [
          score.cocktail,
          score.costume,
          score.table_setting,
          `<strong>${score.cocktail + score.costume + score.table_setting}</strong>`,
          escapeHtml(score.comments || ''),
        ]
      : ['<em>no score</em>', '', '', '', '']),
  ]);
  const totalRows = leaderboard.map((r, i) => [
    i + 1,
    escapeHtml(r.nickname),
    r.cocktail,
    r.costume,
    r.tableSetting,
    `<strong>${r.total}</strong>`,
  ]);

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#222;">
    <h2 style="margin:0 0 4px;">${escapeHtml(competitionName)}: round ${roundNumber} of ${totalRounds}</h2>
    <p style="margin:0 0 16px;color:#555;">Backup copy, sent ${new Date().toLocaleString('en-GB')}.</p>
    <h3 style="margin:0;">Scores for ${who}</h3>
    ${backupTable(['Judge', 'Cocktail Flavour', 'Costume', 'Presentation', 'Total', 'Comments'], roundRows)}
    <h3 style="margin:0;">Cumulative scores so far</h3>
    ${backupTable(['Rank', 'Contestant', 'Cocktail Flavour', 'Costume', 'Presentation', 'Total'], totalRows)}
  </div>`;

  await send({
    to,
    subject: `[Backup] ${competitionName} — round ${roundNumber}/${totalRounds}: ${contestant?.nickname ?? 'Unknown'}`,
    html,
  });
}

export async function sendResultsEmail(user, leaderboard, competitionName) {
  const rows = leaderboard
    .map((row, i) => {
      const style = `color:${i === 0 ? '#caa25d' : '#f0e6d6'};font-weight:${i === 0 ? 'bold' : 'normal'};`;
      return `
      <tr>
        <td style="padding:8px 6px;${style}">${i + 1}. ${escapeHtml(row.nickname)}</td>
        <td style="padding:8px 6px;text-align:right;${style}">${row.total}</td>
      </tr>`;
    })
    .join('');
  const html = wrapEmail({
    preheader: 'The results are in.',
    body: `
      <p style="font-size:18px;">And the votes are in, ${escapeHtml(user.nickname)}...</p>
      <p>Here are the final standings from <strong>${escapeHtml(competitionName)}</strong>:</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">${rows}</table>
      <p style="margin-top:24px;">Thank you for walking the carpet with us. See you at the next one!</p>
    `,
  });
  // Email subjects are plain text, so the name needs no escaping there.
  await send({ to: user.email, subject: `${competitionName} — Final Results`, html });
}
