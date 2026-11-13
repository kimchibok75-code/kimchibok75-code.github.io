// 구글 스프레드시트(모드 추천) → data/mods.json
// 시트에서 온 항목(source: "sheet")은 시트와 똑같이 맞추고,
// 직접 추가한 항목(source: "manual", add-mod.mjs)은 그대로 보존합니다.
import { config, get, readJson, writeJson, steamIdOf, steamDetails } from './lib.mjs';

const CATEGORY_INFO = {
  '필수': { icon: '⭐', desc: '모드를 적게 쓰더라도 꼭 넣는 모드' },
  '렉개선': { icon: '⚡', desc: '렉 개선 · 최적화 · 틱 감소' },
  '그래픽': { icon: '🎨', desc: '보기 좋게 바꿔주는 그래픽 모드' },
  '중세': { icon: '🏰', desc: '중세 테마 플레이 모드' },
  '김치복제작': { label: '김치복 제작', icon: '🥬', desc: '김치복이 직접 만든 모드', section: '김치복이 만든 모드' },
  '모음집': { icon: '📦', desc: '시리즈 · 생방송에서 사용한 모드 모음집' },
  '맵파일': { icon: '🗺️', desc: '모드 목록 불러오기용 저장 파일' },
  '추천': { icon: '👍', desc: '김치복 추천 모드' },
};

/** 따옴표/줄바꿈을 지원하는 CSV 파서 */
export function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function sectionFrom(cell, first) {
  let text = cell.trim();
  if (first) { // 첫 머리글 셀에는 시트 소개 + "이미지 <섹션명>" 이 같이 들어 있음
    const i = text.lastIndexOf('이미지 ');
    if (i < 0) return null;
    text = text.slice(i + 4);
  }
  const [title, ...rest] = text.split('\n').map(s => s.trim()).filter(Boolean);
  return { title, desc: rest.join(' ') };
}

function notesFrom(cell) {
  return cell.split('\n').map(s => s.trim()).filter(s => s.startsWith('- '))
    .map(s => s.replace(/\s*이미지 .*$/, '').slice(2).trim()).filter(Boolean);
}

export async function syncSheet() {
  const { id, tabs } = config.modSheet;
  const prev = readJson('mods.json', { items: [] });
  const sheetItems = [];
  const categories = [];
  const guide = { greeting: '', faq: [] };
  for (const tab of tabs) {
    const csv = await get(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`);
    const rows = parseCsv(csv);
    // 인삿말 · 자주 묻는 질문 (김치복 탭)
    rows.forEach((r, n) => {
      const c0 = (r[0] || '').trim();
      if (c0 === '인삿말' && rows[n + 1]) guide.greeting = rows[n + 1][0].trim();
      const qa = c0.match(/^Q\.\s*([\s\S]*?)\nA\.\s*([\s\S]*)$/);
      if (qa) guide.faq.push({ q: qa[1].trim(), a: qa[2].trim() });
    });
    let section = null; let notes = []; let order = 0;
    rows.forEach((r, n) => {
      const [c0 = '', , name = '', , desc = '', , , , version = '', link = ''] = r;
      const url = link.trim();
      if (c0.trim() && !/^https?:/.test(url)) {
        const s = sectionFrom(c0, n === 0);
        if (s?.title) section = s;
        if (n === 0) notes = notesFrom(c0);
        return;
      }
      if (!/^https?:\/\//.test(url) || !name.trim()) return;
      const steamId = steamIdOf(url);
      sheetItems.push({
        id: `${tab}-${steamId || Buffer.from(url).toString('base64url').slice(-12)}`,
        steamId, url,
        name: name.trim().replace(/\s+/g, ' '),
        desc: desc.trim(),
        category: tab,
        section: section?.title || CATEGORY_INFO[tab]?.section || tab,
        version: version.trim(),
        kind: tab === '맵파일' ? 'mapfile' : tab === '모음집' ? 'collection' : 'mod',
        order: order++,
        source: 'sheet',
      });
    });
    if (sheetItems.some(m => m.category === tab)) { const { section: _s, ...info } = CATEGORY_INFO[tab] || {}; categories.push({ key: tab, label: tab, ...info, notes }); }
  }
  if (sheetItems.length < 10) throw new Error(`시트에서 모드를 ${sheetItems.length}개밖에 못 읽음 — 형식이 바뀌었는지 확인 필요`);

  const manual = prev.items.filter(m => m.source === 'manual');
  if (manual.length && !categories.some(c => c.key === '추천')) categories.push({ key: '추천', label: '추천', ...CATEGORY_INFO['추천'], notes: [] });
  const items = [...sheetItems, ...manual];
  const prevById = Object.fromEntries(prev.items.map(m => [m.id, m]));
  for (const m of items) m.addedAt = prevById[m.id]?.addedAt || m.addedAt || Date.now();
  return { categories, items, guide, sheetUrl: config.modSheet.url };
}

/** 스팀 정보(썸네일·구독자·태그)를 붙여서 저장 */
export async function enrichAndSave(db) {
  const details = await steamDetails(db.items.map(m => m.steamId));
  for (const m of db.items) if (m.steamId && details[m.steamId]) m.steam = details[m.steamId];
  const changed = writeJson('mods.json', { updatedAt: Date.now(), ...db });
  console.log(`[mods] ${db.items.length}개 (${changed ? '변경됨' : '변경 없음'})`);
  return changed;
}
