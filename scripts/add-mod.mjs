// 모드 직접 추가 — 링크만 줘도 알아서 정리합니다.
//   node scripts/add-mod.mjs "<스팀 링크>"                         → 설명·대분류·소분류 자동
//   node scripts/add-mod.mjs "<스팀 링크>" "<한 줄 설명>" [대분류] [소분류]
//   예) node scripts/add-mod.mjs "https://steamcommunity.com/sharedfiles/filedetails/?id=1279012058"
//       node scripts/add-mod.mjs "<링크>" "운반 효율 대폭 증가" 필수 "중요 모드"
// 설명을 비우면 스팀 설명을 한국어 한 줄로 요약해 넣고, 대분류·소분류도 제목·태그·설명을 보고 골라 줍니다.
// 이름·썸네일·구독자·지원 버전은 스팀에서 자동으로 가져옵니다.
// 삭제: node scripts/add-mod.mjs --remove "<스팀 링크 또는 id>"
import { readJson, writeJson, steamIdOf, steamDetails } from './lib.mjs';
import { koreanSummaries } from './translate.mjs';

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

const [url, descArg = '', catArg, secArg] = args;
if (!url) { console.log('사용법: node scripts/add-mod.mjs "<링크>" ["<설명>"] [대분류] [소분류]'); process.exit(1); }

const steamId = url === '--info' ? null : steamIdOf(url);
const steam = steamId ? (await steamDetails([steamId]))[steamId] : null;
if (steamId && !steam) { console.error('스팀에서 모드를 찾지 못했습니다:', url); process.exit(1); }
const raw = steam?.raw || '';
const head = `${steam?.title || ''} ${(steam?.tags || []).join(' ')}`; // 대분류는 제목·태그로만 판단 (설명은 잡음이 많음)
const text = `${head} ${raw.slice(0, 600)}`;
const has = re => re.test(head);

// 정보만 보기: node scripts/add-mod.mjs --info "<링크>"
if (url === '--info') {
  const sid = steamIdOf(descArg); const s = (await steamDetails([sid]))[sid];
  console.log(JSON.stringify({ title: s?.title, tags: s?.tags, subs: s?.subs, collection: !!s?.collection, description: (s?.raw || '').slice(0, 1200) }, null, 2));
  process.exit(0);
}

// ── 대분류 자동 선택 ──
function guessCategory() {
  if (steam?.collection) return '모음집';
  if (has(/medieval|castle|knight|feudal|kingdom|중세/i)) return '중세';
  if (has(/performance|optimi[sz]|\btps\b|\bfps\b|\blag\b|tick(s)? per|faster load|렉/i)) return '렉개선';
  if (has(/retexture|texture|graphic|shader|visual|upscal|\bHD\b|hair|face|portrait|그래픽/i)) return '그래픽';
  return '추천';
}
// ── 소분류 자동 선택 (기존 소분류 중에서) ──
const SECTION_RULES = {
  '중세': [
    [/vehicle|horse|cart|carriage|ride|mount|탈것/i, '탈 것 모드'],
    [/trader|merchant|caravan|상인/i, '상인 모드'],
    [/apparel|armou?r|cloth|helmet|outfit|의상/i, '의상 모드'],
    [/faction|race|xeno|tribe|kingdom|세력|종족/i, '세력 & 종족 추가 모드'],
    [/furniture|wall|door|floor|build|structure|architect|건축/i, '건축 모드'],
    [/sound|music|texture|graphic|visual/i, '그래픽 & 사운드 개선 모드'],
    [/royalty|ideology|biotech|anomaly|odyssey|\bDLC\b/i, '림월드 DLC 연계 모드'],
  ],
  '그래픽': [
    [/hair|헤어/i, '김치복이 자주 쓰는 헤어 모드'],
    [/face|얼굴/i, '김치복이 자주 쓰는 얼굴 모드'],
    [/retexture|texture|upscal|\bHD\b/i, '리텍스쳐, 업스케일 모드'],
  ],
};
function guessSection(cat) {
  const existing = [...new Set(db.items.filter(m => m.category === cat).map(m => m.section))];
  for (const [re, sec] of SECTION_RULES[cat] || []) if (re.test(text) && existing.includes(sec)) return sec;
  const fallback = { '중세': '컨텐츠 확장 & 보강 모드', '그래픽': '그래픽 개선 모드', '렉개선': '최적화 모드', '모음집': '시리즈 모드 모음집', '필수': '중요 모드', '추천': '김치복 추천' }[cat];
  return existing.includes(fallback) || cat === '추천' ? fallback : (existing[0] || cat);
}

const category = catArg || guessCategory();
const section = secArg || guessSection(category);
let desc = descArg;
if (!desc && raw) {
  try { desc = (await koreanSummaries([{ id: steamId, rawDescription: raw }]))[steamId] || ''; } catch (e) { console.warn('자동 요약 실패:', e.message); }
}

// 같은 스팀 모드가 이미 있으면 그 항목을 수정
const existing = db.items.find(m => steamId && m.steamId === steamId && (m.source === 'manual' || !catArg)) || db.items.find(m => m.id === `${category}-${steamId}`);
const id = existing?.id || `${category}-${steamId || Buffer.from(url).toString('base64url').slice(-12)}`;
const versions = (steam?.tags || []).filter(t => /^\d+\.\d+$/.test(t)).sort();
const item = {
  id, steamId, url: steamId ? `https://steamcommunity.com/sharedfiles/filedetails/?id=${steamId}` : url,
  name: steam?.title || url,
  desc: desc || existing?.desc || '',
  category: existing?.source === 'sheet' ? existing.category : category,
  section: existing?.source === 'sheet' ? existing.section : section,
  version: versions.at(-1) || '',
  kind: steam?.collection ? 'collection' : 'mod',
  order: existing?.order ?? db.items.filter(m => m.category === category).length,
  source: existing?.source || 'manual',
  addedAt: existing?.addedAt || Date.now(),
  steam: steam || undefined,
};
if (existing) Object.assign(existing, item); else db.items.push(item);

if (!db.categories.some(c => c.key === item.category)) {
  db.categories.push({ key: item.category, label: item.category, icon: item.category === '추천' ? '👍' : '🧩', desc: item.category === '추천' ? '김치복 추천 모드' : '', notes: [] });
}
writeJson('mods.json', { ...db, updatedAt: Date.now() });
console.log(`${existing ? (existing.source === 'sheet' ? '이미 시트에 있음 (정보만 갱신)' : '수정') : '추가'}: [${item.category} > ${item.section}] ${item.name}`);
console.log(`  설명: ${item.desc || '(없음)'}`);
console.log(`  버전: ${versions.filter(v => ['1.6', '1.7'].includes(v)).join(', ') || '1.6/1.7 표시 없음'} · 구독 ${steam?.subs ?? '-'}`);
