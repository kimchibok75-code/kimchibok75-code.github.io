-- 2026-11-21 잭팟이 얼마 만에 나왔는지: since = 지금 잭팟 돈이 모이기 시작한 때(지난 잭팟 시각), prev = 잭팟 때 바꾸기 전 since
ALTER TABLE fountain ADD COLUMN since INTEGER NOT NULL DEFAULT 0;
ALTER TABLE fountain ADD COLUMN prev INTEGER NOT NULL DEFAULT 0;
UPDATE fountain SET since = 1795197155000 WHERE id = 1;   -- 분수 잭팟을 처음 연 때 (업데이트 #7)
-- 당첨자마다 기다린 시간(ms)과 몇 번째 소원에서 나왔는지
ALTER TABLE fountain_win ADD COLUMN wait INTEGER NOT NULL DEFAULT 0;
ALTER TABLE fountain_win ADD COLUMN n INTEGER NOT NULL DEFAULT 0;
