-- 의상 스킨 · 무기 스킨
ALTER TABLE characters ADD COLUMN suit TEXT NOT NULL DEFAULT '';
ALTER TABLE characters ADD COLUMN wsk TEXT NOT NULL DEFAULT '{}';
