-- Moves from a single hardcoded competition with admin-invited users to named
-- competitions that people join themselves. Only admin accounts are carried
-- over; everything else is wiped. Admin status now comes from ADMIN_EMAILS.

CREATE TABLE competitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'setup',
  running_order TEXT NOT NULL DEFAULT '[]',
  current_index INTEGER NOT NULL DEFAULT 0,
  current_phase TEXT NOT NULL DEFAULT 'prep',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE is_admin = 0);
DROP TABLE scores;
DROP TABLE login_tokens;
DROP TABLE competition;

CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  first_name TEXT,
  last_name TEXT,
  nickname TEXT,
  competition_id INTEGER REFERENCES competitions(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO users_new (id, email, first_name, last_name, nickname, created_at)
SELECT id, email, first_name, last_name, nickname, created_at FROM users WHERE is_admin = 1;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX idx_users_competition ON users(competition_id);

CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  judge_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contestant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cocktail INTEGER,
  costume INTEGER,
  table_setting INTEGER,
  comments TEXT NOT NULL DEFAULT '',
  submitted_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (competition_id, judge_id, contestant_id)
);

CREATE INDEX idx_scores_competition_contestant ON scores(competition_id, contestant_id);
