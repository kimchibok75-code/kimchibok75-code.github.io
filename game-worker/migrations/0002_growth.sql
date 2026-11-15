-- 치복 타운 2단계: 성장 (사냥 · 상점 · 강화)
ALTER TABLE characters ADD COLUMN ver INTEGER NOT NULL DEFAULT 0;        -- 동시에 두 번 바꾸는 것 막기용 번호
ALTER TABLE characters ADD COLUMN hp_at INTEGER NOT NULL DEFAULT 0;      -- 체력을 마지막으로 정한 시각 (마을에서 차오르는 양 계산)
ALTER TABLE characters ADD COLUMN hunt TEXT NOT NULL DEFAULT '';         -- 사냥 중이면 사냥 상태 (JSON), 마을이면 빈칸
ALTER TABLE characters ADD COLUMN bonus_day TEXT NOT NULL DEFAULT '';    -- 매일 첫 접속 보너스 받은 날 (한국 날짜)
