-- 치복 타운 1단계: 계정 · 로그인 · 캐릭터 저장

-- 계정
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nick TEXT NOT NULL,                       -- 화면에 보이는 닉네임
  nick_key TEXT NOT NULL UNIQUE,            -- 소문자로 바꾼 닉네임 (중복 검사용)
  pw_hash TEXT NOT NULL,                    -- 비밀번호는 원문 저장 안 함 (PBKDF2 해시)
  pw_salt TEXT NOT NULL,
  pw_iter INTEGER NOT NULL,
  rec_hash TEXT NOT NULL,                   -- 복구 코드 해시
  fail_count INTEGER NOT NULL DEFAULT 0,    -- 연속으로 틀린 횟수
  lock_until INTEGER NOT NULL DEFAULT 0,    -- 이 시각(ms)까지 로그인 잠금
  is_admin INTEGER NOT NULL DEFAULT 0,
  banned INTEGER NOT NULL DEFAULT 0,
  nick_changed_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_login INTEGER NOT NULL DEFAULT 0
);

-- 로그인 상태 (토큰도 해시로만 저장)
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

-- 캐릭터 (계정당 하나)
CREATE TABLE characters (
  user_id INTEGER PRIMARY KEY,
  face TEXT NOT NULL,
  body TEXT NOT NULL,
  eyes TEXT NOT NULL DEFAULT 'dot',
  hat TEXT NOT NULL DEFAULT 'none',
  intro TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '🏷️ 새내기 주민',
  x REAL NOT NULL,
  y REAL NOT NULL,
  lv INTEGER NOT NULL DEFAULT 1,
  exp INTEGER NOT NULL DEFAULT 0,
  gold INTEGER NOT NULL DEFAULT 500,
  s_str INTEGER NOT NULL DEFAULT 5,
  s_dex INTEGER NOT NULL DEFAULT 5,
  s_int INTEGER NOT NULL DEFAULT 5,
  s_luk INTEGER NOT NULL DEFAULT 5,
  points INTEGER NOT NULL DEFAULT 0,
  hp INTEGER NOT NULL DEFAULT 0,
  equip TEXT NOT NULL DEFAULT '{}',         -- 장착 장비 (JSON)
  bag TEXT NOT NULL DEFAULT '[]',           -- 가방 속 장비 (JSON)
  hats TEXT NOT NULL DEFAULT '["none"]',    -- 가진 머리 장식 스킨
  pots TEXT NOT NULL DEFAULT '{"s":5,"l":0,"xl":0}',
  pot_at INTEGER NOT NULL DEFAULT 40,
  updated_at INTEGER NOT NULL
);

-- 가입 횟수 제한 (같은 곳에서 1시간에 3개까지)
CREATE TABLE signups (ip_hash TEXT NOT NULL, at INTEGER NOT NULL);
CREATE INDEX signups_ip ON signups(ip_hash, at);

-- 활동 기록 (문제 생겼을 때 되돌리기·확인용)
CREATE TABLE activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  at INTEGER NOT NULL
);
CREATE INDEX activity_user ON activity(user_id, at);
