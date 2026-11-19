-- 2026-11-20 건의 게시판: 유저가 건의 글을 씀. priv = 1 이면 쓴 사람과 김치복(관리자)만 봄
CREATE TABLE IF NOT EXISTS suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  priv INTEGER NOT NULL DEFAULT 0,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS suggestions_at ON suggestions (at);
CREATE INDEX IF NOT EXISTS suggestions_user ON suggestions (user_id, at);
