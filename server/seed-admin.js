import 'dotenv/config';
import { db } from './db.js';

const firstName = process.env.ADMIN_FIRST_NAME;
const lastName = process.env.ADMIN_LAST_NAME;
const nickname = process.env.ADMIN_NICKNAME;
const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();

if (!firstName || !lastName || !nickname || !email) {
  console.error('Set ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_NICKNAME and ADMIN_EMAIL in .env before seeding.');
  process.exit(1);
}

const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
if (existing) {
  db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(existing.id);
  console.log(`${email} already existed — promoted to admin.`);
} else {
  db.prepare(
    'INSERT INTO users (first_name, last_name, nickname, email, is_admin) VALUES (?, ?, ?, ?, 1)'
  ).run(firstName, lastName, nickname, email);
  console.log(`Created admin user ${nickname} <${email}>.`);
}

console.log('Log in by requesting a login link from the app’s login page with this email address.');
