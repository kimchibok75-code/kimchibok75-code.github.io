-- 2026-11-20 어뷰징 대비: 가입 제한(기기) · 접속 기록 · 거절 횟수 · 의심 목록 · 성장 기록 · 매일 사본 · 점검 모드
ALTER TABLE signups ADD COLUMN dev_hash TEXT NOT NULL DEFAULT '';
CREATE INDEX signups_dev ON signups(dev_hash, at);

-- 계정이 어떤 IP·기기에서 들어왔는지 (해시만, 원래 IP는 저장 안 함). kind = 'ip' | 'dev'
CREATE TABLE access (
  user_id INTEGER NOT NULL, kind TEXT NOT NULL, h TEXT NOT NULL,
  first_at INTEGER NOT NULL, last_at INTEGER NOT NULL, n INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, kind, h)
);
CREATE INDEX access_h ON access(kind, h);

-- 서버가 거절한 요청 수 (한 시간 단위)
CREATE TABLE rejects (user_id INTEGER NOT NULL, hr INTEGER NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, hr));

-- 이상 징후 (한 시간마다 다시 계산). ok_until = 관리자가 '문제 없음'으로 넘긴 시각까지 숨김
CREATE TABLE flags (
  user_id INTEGER NOT NULL, k TEXT NOT NULL, why TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 1,
  at INTEGER NOT NULL, ok_until INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, k)
);

-- 한 시간 전 성장 기록 (너무 빠른 성장 찾기)
CREATE TABLE growth (user_id INTEGER PRIMARY KEY, at INTEGER NOT NULL, xp REAL NOT NULL, earn REAL NOT NULL);

-- 매일 캐릭터 사본 (7일 보관, 관리자 '계정 되돌리기')
CREATE TABLE char_snap (user_id INTEGER NOT NULL, day TEXT NOT NULL, lv INTEGER NOT NULL DEFAULT 0, gold INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (user_id, day));

-- 설정 (점검 모드 등)
CREATE TABLE settings (k TEXT PRIMARY KEY, v TEXT NOT NULL);
