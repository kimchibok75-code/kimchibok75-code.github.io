-- 2026-11-18: 모자를 써도 헤어를 보일지 (1 = 보임, 기본)
ALTER TABLE characters ADD COLUMN hat_hair INTEGER NOT NULL DEFAULT 1;
