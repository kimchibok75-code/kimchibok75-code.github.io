-- 2026-11-21 1000골드 소원이 생겨서 '몇 번째 소원'을 모인 돈 ÷ 100으로 셀 수 없음 → 소원 수를 따로 셈 (잭팟 때 0부터)
ALTER TABLE fountain ADD COLUMN cnt INTEGER NOT NULL DEFAULT 0;
UPDATE fountain SET cnt = pool / 100 WHERE id = 1;
