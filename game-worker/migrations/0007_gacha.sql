-- 치복 타운: 뽑기(가챠) 장비 체계
-- 상점 대신 가챠센터. 무기 3개(검·활·지팡이)를 모두 끼고, 클래스(지금 쓰는 무기)는 언제든 바꿈
-- 강화는 장비가 아니라 장비 칸(슬롯)에. 능력치 프리셋 5개
-- bag 칸은 이제 "바꿀지 고르는 중인 새 장비" 목록으로 씀
ALTER TABLE characters ADD COLUMN cls TEXT NOT NULL DEFAULT 'sword';   -- sword 검사 / bow 궁수 / staff 마법사
ALTER TABLE characters ADD COLUMN enh TEXT NOT NULL DEFAULT '{}';      -- 칸별 강화 단계 {"sword":3,"hat":1,…}
ALTER TABLE characters ADD COLUMN presets TEXT NOT NULL DEFAULT '';    -- [{n:이름, s:[힘,민첩,지력,운]} × 5]
ALTER TABLE characters ADD COLUMN preset INTEGER NOT NULL DEFAULT 0;   -- 지금 쓰는 프리셋 번호
ALTER TABLE characters ADD COLUMN gacha TEXT NOT NULL DEFAULT '{}';    -- 상자별 뽑은 횟수 {"w":12,"a":30}
