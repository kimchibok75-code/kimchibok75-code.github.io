-- 치복 타운: 낚시 기록 · 카페 알바
ALTER TABLE characters ADD COLUMN job_at INTEGER NOT NULL DEFAULT 0;     -- 카페 알바 시작 시각 (0이면 안 하는 중)

CREATE TABLE fishing (
  user_id INTEGER PRIMARY KEY,
  cast TEXT NOT NULL DEFAULT '',            -- 던진 낚싯대 (어떤 물고기가 물지 서버가 미리 정함, JSON)
  last_cast INTEGER NOT NULL DEFAULT 0,     -- 마지막으로 던진 시각 (너무 빨리 반복 못 하게)
  count INTEGER NOT NULL DEFAULT 0,         -- 낚은 마리 수
  gold INTEGER NOT NULL DEFAULT 0,          -- 낚시로 번 골드
  best_price INTEGER NOT NULL DEFAULT 0,    -- 제일 비싼 물고기 값
  best_price_fish TEXT NOT NULL DEFAULT '',
  best_len REAL NOT NULL DEFAULT 0,         -- 제일 큰 물고기 길이 (cm)
  best_len_fish TEXT NOT NULL DEFAULT ''
);
CREATE INDEX fishing_count ON fishing(count);
CREATE INDEX fishing_price ON fishing(best_price);
CREATE INDEX fishing_len ON fishing(best_len);
