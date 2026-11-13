// 창작마당 설명 → 한국어 한 줄 요약 (무료, API 키 불필요)
// 1) 설명에서 "모드가 뭘 하는지" 말하는 문단을 고르고 (면책·크레딧·업데이트 안내 등은 건너뜀)
// 2) 한국어 문단이 이미 있으면 그대로 쓰고, 없으면 구글 번역(무료 엔드포인트)으로 번역
// 3) 결과는 data/translations.json 에 저장해 두고, 같은 문장은 다시 번역하지 않음
import { get, readJson, writeJson } from './lib.mjs';

const SKIP_SECTION = /disclaimer|credit|thank|changelog|change ?log|permission|license|support|patreon|ko-?fi|donat|compat|install|requirement|known issue|faq|translation|special note|鸣谢|特别注意|注意/i;
const BOILERPLATE = /^(update of|temporary|original mod|requires?\b|full credit|this is my first|please note|mod:|note:|credits?|thanks|special thanks|load (after|before)|save[- ]?(safe|compatible)|should not be added|【.*】$)/i;
const RELEASE_NOTE = /re-?released|previous version|the release of rimworld|continuation of|fork of|was updated to|updated for (rimworld )?1\.\d/i;
const DESCRIBES = /\b(adds?|allows?|lets|makes|teaches|replaces?|changes?|reworks?|introduces?|overhaul|expands?|retexture|this mod|lift off|turns?|gives?)\b|模组|增加|添加/i;
const HANGUL = /[가-힣]/g;
const CJK = /[぀-ヿ㐀-鿿가-힣]/;

/** BBCode 설명에서 대표 문단 하나를 뽑음 */
export function extractLead(raw = '') {
  // 줄 단위로 정리: 이미지 제거, 링크는 글자만, 헤딩은 표시 남김
  const text = raw
    .replace(/\[img\][\s\S]*?\[\/img\]/gi, '\n')
    .replace(/\[url=[^\]]*\]([\s\S]*?)\[\/url\]/gi, '$1')
    .replace(/\[h[1-6]\]([\s\S]*?)\[\/h[1-6]\]/gi, '\n#H $1\n')
    .replace(/\[\*\]/g, '\n')
    .replace(/\[\/?[a-z0-9*]+(=[^\]]*)?\]/gi, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\r/g, '');
  const paras = [];
  let skipping = false;
  for (let line of text.split('\n')) {
    line = line.replace(/\s+/g, ' ').trim().replace(/^[-–•·*>]+\s*/, '');
    if (!line || /^[-=_*~]{3,}$/.test(line)) continue;
    if (line.startsWith('#H ')) { skipping = SKIP_SECTION.test(line); continue; }
    if (skipping) continue;
    if (BOILERPLATE.test(line) || RELEASE_NOTE.test(line)) continue;
    const long = CJK.test(line) ? line.length >= 15 : line.length >= 40;
    if (long) paras.push(line);
  }
  // 작성자가 써 둔 한국어 문단이 있으면 그걸 우선
  const korean = paras.find(p => (p.match(HANGUL) || []).length >= 10);
  if (korean) return { text: firstSentences(korean), korean: true };
  const notQuestion = paras.filter(p => !/[?？]["')\]]*$/.test(p));
  const pool = notQuestion.length ? notQuestion : paras;
  const pick = pool.slice(0, 3).find(p => DESCRIBES.test(p)) || pool[0];
  return pick ? { text: firstSentences(pick), korean: false } : null;
}

/** 앞 1~2문장, 최대 약 200자 */
function firstSentences(p, max = 200) {
  const parts = p.match(/[^.!?。！？]+[.!?。！？]+["')\]]*|[^.!?。！？]+$/g) || [p];
  let out = '';
  for (const s of parts) {
    if (out && (out + s).length > max) break;
    out += s;
    if (out.length >= 80) break;
  }
  return (out || p).trim().slice(0, max);
}

async function googleTranslate(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
  const j = await get(url, { type: 'json', retries: 1 });
  return (j?.[0] || []).map(s => s?.[0] || '').join('').trim();
}

/** 한국어 결과를 한 줄로 다듬기 */
function oneLine(ko, max = 95) {
  ko = ko.replace(/\s+/g, ' ').trim();
  if (ko.length <= max) return ko;
  const cut = ko.slice(0, max);
  const end = Math.max(cut.lastIndexOf('다.'), cut.lastIndexOf('요.'));
  return end > 30 ? cut.slice(0, end + 2) : `${cut.replace(/[\s,.·]+\S*$/, '')}…`;
}

/** items: [{ id, rawDescription }] → { id: '한국어 한 줄' } */
export async function koreanSummaries(items) {
  const cache = readJson('translations.json', { items: {} });
  const out = {};
  let fresh = 0, failed = 0;
  for (const { id, rawDescription } of items) {
    const lead = extractLead(rawDescription);
    if (!lead) continue;
    const hit = cache.items[id];
    if (hit && hit.src === lead.text) { out[id] = hit.ko; continue; }
    try {
      const ko = lead.korean ? lead.text : await googleTranslate(lead.text);
      if (!ko) throw new Error('빈 번역');
      cache.items[id] = { src: lead.text, ko: oneLine(ko), at: Date.now() };
      out[id] = cache.items[id].ko;
      fresh++;
      await new Promise(r => setTimeout(r, 400)); // 너무 빠르게 연달아 요청하지 않기
    } catch (e) {
      failed++;
      if (hit) out[id] = hit.ko; // 실패하면 예전 번역이라도 사용
      console.warn(`[translate] ${id} 실패: ${e.message}`);
    }
  }
  // 오래된 항목 정리 (최근 400개만 유지)
  const keep = Object.entries(cache.items).sort((a, b) => b[1].at - a[1].at).slice(0, 400);
  writeJson('translations.json', { items: Object.fromEntries(keep) });
  console.log(`[translate] 새 번역 ${fresh}개 · 캐시 ${Object.keys(out).length - fresh}개 · 실패 ${failed}개`);
  return out;
}
