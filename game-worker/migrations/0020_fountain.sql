-- 2026-11-21 소원 분수 잭팟: 던진 골드가 모이고(pool), 잭팟이 나오면 모인 돈의 1.5배를 받고 0부터 다시
CREATE TABLE IF NOT EXISTS fountain (id INTEGER PRIMARY KEY, pool INTEGER NOT NULL DEFAULT 0, last INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO fountain (id, pool, last) VALUES (1, 0, 0);
-- 역대 당첨자 (최근 10명만 남김)
CREATE TABLE IF NOT EXISTS fountain_win (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, nick TEXT NOT NULL, gold INTEGER NOT NULL, at INTEGER NOT NULL);
