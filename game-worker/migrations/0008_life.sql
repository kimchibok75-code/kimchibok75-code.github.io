-- 4단계: 생활 정보(코인·자원·텃밭·칭호·버프·알바) 한 칸 + 집 위치(모두에게 보임)
ALTER TABLE characters ADD COLUMN life TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS houses (user_id INTEGER PRIMARY KEY, x INTEGER NOT NULL, y INTEGER NOT NULL, roof INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL);
UPDATE characters SET title = 'new';
