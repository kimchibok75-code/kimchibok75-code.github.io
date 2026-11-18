-- 닉네임 바꾼 시각 (일주일에 한 번만, 2026-11-18)
ALTER TABLE users ADD COLUMN nick_at INTEGER NOT NULL DEFAULT 0;
