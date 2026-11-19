-- 2026-11-20 텃밭 개편: 농사 랭킹판 (제일 비싼 · 제일 무거운 · 제일 많이 수확)
CREATE TABLE farming (
  user_id INTEGER PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  best_price INTEGER NOT NULL DEFAULT 0,
  best_price_crop TEXT NOT NULL DEFAULT '',
  best_w INTEGER NOT NULL DEFAULT 0,
  best_w_crop TEXT NOT NULL DEFAULT ''
);
CREATE INDEX farming_count ON farming(count);
CREATE INDEX farming_price ON farming(best_price);
CREATE INDEX farming_w ON farming(best_w);
