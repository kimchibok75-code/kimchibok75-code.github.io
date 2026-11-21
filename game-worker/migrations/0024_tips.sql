-- 2026-11-22 공략 게시판: 직업별(sword 전사 · bow 궁수 · staff 법사) 공략 글. 하루 1건(한국 날짜), 2000자
-- 지운 글도 del = 1로 남겨 둠 (지우고 다시 써서 하루 1건 제한을 피하지 못하게)
CREATE TABLE IF NOT EXISTS tips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  cls TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  at INTEGER NOT NULL,
  edit_at INTEGER NOT NULL DEFAULT 0,
  del INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS tips_cls ON tips (cls, del, at);
CREATE INDEX IF NOT EXISTS tips_user ON tips (user_id, at);
