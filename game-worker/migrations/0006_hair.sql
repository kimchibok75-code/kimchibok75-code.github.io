-- 치복 타운: 헤어스타일 · 헤어 색 (겉모습만, 무료로 바꿀 수 있음)
ALTER TABLE characters ADD COLUMN hair TEXT NOT NULL DEFAULT 'none';      -- HAIRS의 id (none = 민머리)
ALTER TABLE characters ADD COLUMN hair_c TEXT NOT NULL DEFAULT '#3a2a20'; -- HAIR_COLORS 중 하나
