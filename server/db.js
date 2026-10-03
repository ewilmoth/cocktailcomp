import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DB_PATH || './data/woodhamptons.db';
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function runMigrations() {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))"
  );
  const applied = new Set(db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name));
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    // Table rebuilds need FK enforcement off; the pragma is a no-op inside a transaction.
    db.pragma('foreign_keys = OFF');
    try {
      db.transaction(() => {
        db.exec(sql);
        const problems = db.pragma('foreign_key_check');
        if (problems.length) {
          throw new Error(`Migration ${file} left broken foreign keys: ${JSON.stringify(problems)}`);
        }
        db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);
      })();
      console.log(`Applied migration ${file}`);
    } finally {
      db.pragma('foreign_keys = ON');
    }
  }
}

runMigrations();

export function getCompetition(id) {
  return db.prepare('SELECT * FROM competitions WHERE id = ?').get(id);
}

export function updateCompetition(id, fields) {
  const keys = Object.keys(fields);
  const setClause = keys.map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE competitions SET ${setClause} WHERE id = @id`).run({ ...fields, id });
  return getCompetition(id);
}
