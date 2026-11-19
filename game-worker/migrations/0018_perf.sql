-- 2026-11-20 부하 줄이기: 레벨 랭킹 · 오래된 기록 지우기용 색인
CREATE INDEX IF NOT EXISTS characters_lv ON characters(lv, exp);
CREATE INDEX IF NOT EXISTS activity_at ON activity(at);
CREATE INDEX IF NOT EXISTS sessions_exp ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS chronicle_at ON chronicle(at);
