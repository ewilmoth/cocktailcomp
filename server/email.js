import nodemailer from 'nodemailer';

const { GMAIL_USER, GMAIL_APP_PASSWORD, PUBLIC_URL } = process.env;

let transporter = null;
if (GMAIL_USER && GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
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

function button(url, label) {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="background:#caa25d;color:#0d0a08;text-decoration:none;font-weight:bold;padding:14px 32px;border-radius:999px;display:inline-block;font-family:Georgia,serif;">${label}</a>
  </div>`;
}

async function send({ to, subject, html, link }) {
  if (!transporter) {
    console.log(`\n[email:disabled] Would send to ${to}: ${subject}`);
    console.log(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (link) console.log(`[email:disabled] Link: ${link}`);
    return;
  }
  await transporter.sendMail({
    from: `"Woodhamptons Cocktail Competition" <${GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

export async function sendInviteEmail(user, loginToken) {
  const link = `${PUBLIC_URL}/api/auth/verify?token=${loginToken}`;
  const html = wrapEmail({
    preheader: 'You are cordially invited.',
    body: `
      <p style="font-size:18px;">Darling ${user.nickname},</p>
      <p>You have been invited to compete in the <strong>Woodhamptons Cocktail Competition</strong> &mdash; a Met Gala&ndash;themed evening of cocktails, costumes, and table settings.</p>
      <p>You'll be judged (and you'll judge everyone else!) on three categories: <strong>Cocktail</strong>, <strong>Costume</strong>, and <strong>Table Setting</strong>.</p>
      <p>Tap below to step onto the carpet and access your competition dashboard on your phone:</p>
      ${button(link, 'Enter the Competition')}
      <p style="color:#a9987e;font-size:13px;">This link logs you in and keeps you logged in on this phone, so you can close the app any time and pick up right where you left off.</p>
    `,
  });
  await send({ to: user.email, subject: 'You’re invited: Woodhamptons Cocktail Competition', html, link });
}

export async function sendLoginLinkEmail(user, loginToken) {
  const link = `${PUBLIC_URL}/api/auth/verify?token=${loginToken}`;
  const html = wrapEmail({
    body: `
      <p style="font-size:18px;">Hello ${user.nickname},</p>
      <p>Here's your link back onto the carpet:</p>
      ${button(link, 'Log Me Back In')}
    `,
  });
  await send({ to: user.email, subject: 'Your Woodhamptons login link', html, link });
}

export async function sendResultsEmail(user, leaderboard) {
  const rows = leaderboard
    .map(
      (row, i) => `
      <tr>
        <td style="padding:8px 6px;color:${i === 0 ? '#caa25d' : '#f0e6d6'};font-weight:${i === 0 ? 'bold' : 'normal'};">${i + 1}. ${row.nickname}</td>
        <td style="padding:8px 6px;text-align:right;color:${i === 0 ? '#caa25d' : '#f0e6d6'};font-weight:${i === 0 ? 'bold' : 'normal'};">${row.total}</td>
      </tr>`
    )
    .join('');
  const html = wrapEmail({
    preheader: 'The results are in.',
    body: `
      <p style="font-size:18px;">And the votes are in, ${user.nickname}...</p>
      <p>Here are the final standings from the Woodhamptons Cocktail Competition:</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">${rows}</table>
      <p style="margin-top:24px;">Thank you for walking the carpet with us. See you at the next one!</p>
    `,
  });
  await send({ to: user.email, subject: 'Woodhamptons Cocktail Competition — Final Results', html });
}
