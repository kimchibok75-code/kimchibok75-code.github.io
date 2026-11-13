// 모드 직접 추가
//   node scripts/add-mod.mjs "<스팀 링크>" "<한 줄 설명>" [카테고리] [섹션]
//   예) node scripts/add-mod.mjs "https://steamcommunity.com/sharedfiles/filedetails/?id=1279012058" "운반 효율 대폭 증가" 필수
// 카테고리를 생략하면 "추천"에 들어갑니다. 이름·썸네일·태그는 스팀에서 자동으로 가져옵니다.
// 삭제: node scripts/add-mod.mjs --remove "<스팀 링크 또는 id>"
import { readJson, writeJson, steamIdOf, steamDetails } from './lib.mjs';

const args = process.argv.slice(2);
const db = readJson('mods.json', { categories: [], items: [] });

if (args[0] === '--remove') {
  const key = args[1];
  const id = steamIdOf(key) || key;
  const before = db.items.length;
  db.items = db.items.filter(m => !(m.source === 'manual' && (m.steamId === id || m.url === key)));
  writeJson('mods.json', { ...db, updatedAt: Date.now() });
  console.log(`삭제 ${before - db.items.length}개 (시트에서 온 모드는 시트에서 지워 주세요)`);
  process.exit(0);
}

const [url, desc = '', category = '추천', section] = args;
if (!url) { console.log('사용법: node scripts/add-mod.mjs "<링크>" "<설명>" [카테고리] [섹션]'); process.exit(1); }

const steamId = steamIdOf(url);
const steam = steamId ? (await steamDetails([steamId]))[steamId] : null;
if (steamId && !steam) { console.error('스팀에서 모드를 찾지 못했습니다:', url); process.exit(1); }

const id = `${category}-${steamId || Buffer.from(url).toString('base64url').slice(-12)}`;
const existing = db.items.find(m => m.id === id);
const versions = (steam?.tags || []).filter(t => /^\d+\.\d+$/.test(t)).sort();
const item = {
  id, steamId, url: steamId ? `https://steamcommunity.com/sharedfiles/filedetails/?id=${steamId}` : url,
  name: steam?.title || url,
  desc,
  category,
  section: section || (category === '추천' ? '김치복 추천' : category),
  version: versions.at(-1) || '',
  kind: steam?.collection ? 'collection' : 'mod',
  order: existing?.order ?? db.items.filter(m => m.category === category).length,
  source: existing?.source || 'manual',
  addedAt: existing?.addedAt || Date.now(),
  steam: steam || undefined,
};
if (existing) Object.assign(existing, item); else db.items.push(item);

if (!db.categories.some(c => c.key === category)) {
  db.categories.push({ key: category, label: category, icon: category === '추천' ? '👍' : '🧩', desc: category === '추천' ? '김치복 추천 모드' : '', notes: [] });
}
writeJson('mods.json', { ...db, updatedAt: Date.now() });
console.log(`${existing ? '수정' : '추가'}: [${category}] ${item.name} — ${desc}`);
