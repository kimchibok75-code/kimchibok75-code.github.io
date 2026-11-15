-- 보안: 로그인 잠금은 틀린 곳(IP)마다 따로 (남이 일부러 틀려서 내 계정을 잠그지 못하게)
CREATE TABLE IF NOT EXISTS login_fails (user_id INTEGER NOT NULL, ip_hash TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, until INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL, PRIMARY KEY (user_id, ip_hash));
-- 낚시: 하루에 낚은 수 (너무 많으면 값 절반)
ALTER TABLE fishing ADD COLUMN day TEXT NOT NULL DEFAULT '';
ALTER TABLE fishing ADD COLUMN day_n INTEGER NOT NULL DEFAULT 0;
