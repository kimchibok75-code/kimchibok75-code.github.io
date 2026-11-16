-- 홈페이지 모드 추천: 사이트에서 김치복이 드래그로 바꾼 순서 (대분류마다 모드 id 목록)
CREATE TABLE IF NOT EXISTS mod_order (
  cat TEXT PRIMARY KEY,
  ids TEXT NOT NULL,        -- JSON 배열 ["그래픽-123", ...]
  at INTEGER NOT NULL
);
