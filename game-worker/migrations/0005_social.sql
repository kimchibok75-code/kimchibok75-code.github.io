-- 치복 타운 3단계: 같이 놀기 (채팅 기록 · 경고 · 차단 · 신고)
ALTER TABLE users ADD COLUMN mute_until INTEGER NOT NULL DEFAULT 0;   -- 이 시각(ms)까지 채팅 금지

-- 채팅 기록 (30일 보관, 처리 안 된 신고 대상은 남겨 둠)
CREATE TABLE chat_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  nick TEXT NOT NULL,
  ch TEXT NOT NULL,              -- near(근처) / all(마을 전체)
  text TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX chat_log_user ON chat_log(user_id, at);
CREATE INDEX chat_log_at ON chat_log(at);

-- 경고 (7일 지나면 하나씩 사라짐 = 7일 안의 것만 셈)
CREATE TABLE warnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX warnings_user ON warnings(user_id, at);

-- 개인 차단 (차단한 사람의 말과 캐릭터가 안 보임)
CREATE TABLE blocks (
  user_id INTEGER NOT NULL,
  target_id INTEGER NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, target_id)
);

-- 신고 (김치복님이 관리자 화면에서 처리)
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL,
  target_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  lines TEXT NOT NULL DEFAULT '[]',   -- 신고할 때 그 사람의 최근 채팅 20줄 (JSON)
  at INTEGER NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX reports_target ON reports(target_id, done);
CREATE INDEX reports_done ON reports(done, at);
