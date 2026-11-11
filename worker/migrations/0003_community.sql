-- Parents' corner: members-only discussions
CREATE TABLE IF NOT EXISTS profiles (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  nickname   TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  last_reply_at INTEGER NOT NULL,
  hidden        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS posts_list_idx ON posts(hidden, last_reply_at);
CREATE INDEX IF NOT EXISTS posts_cat_idx ON posts(category, hidden, last_reply_at);
CREATE TABLE IF NOT EXISTS replies (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  hidden     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS replies_post_idx ON replies(post_id, hidden, created_at);
CREATE TABLE IF NOT EXISTS reports (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL CHECK (kind IN ('post','reply')),
  target_id  INTEGER NOT NULL,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  handled    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, kind, target_id)
);
CREATE INDEX IF NOT EXISTS reports_open_idx ON reports(handled, created_at);
