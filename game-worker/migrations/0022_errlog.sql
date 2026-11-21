-- 2026-11-21 화면·서버 오류 모으기 (관리자 화면 → 🐞 오류). 같은 오류(sig)는 한 줄에 횟수만 늘림, 14일 지나면 지움
CREATE TABLE IF NOT EXISTS errlog (
  sig TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'client',
  msg TEXT NOT NULL,
  src TEXT,
  stack TEXT,
  n INTEGER NOT NULL DEFAULT 1,
  nicks TEXT NOT NULL DEFAULT '|',
  first_at INTEGER NOT NULL,
  last_at INTEGER NOT NULL,
  last_nick TEXT,
  ua TEXT,
  ver TEXT,
  place TEXT
);
CREATE INDEX IF NOT EXISTS errlog_last ON errlog (last_at);
