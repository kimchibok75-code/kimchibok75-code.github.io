// 공용 유틸: 네트워크, 파일 입출력, 스팀 API, 푸시 알림
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = path.join(ROOT, 'data');
export const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
};

export const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'site.json'), 'utf8'));

export async function get(url, { type = 'text', headers = {}, retries = 2, ...opts } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(20000), ...opts });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return type === 'json' ? await res.json() : await res.text();
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

export function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8')); } catch { return fallback; }
}

/** 내용(갱신 시각 제외)이 바뀌었을 때만 파일을 씁니다. 바뀌었으면 true */
export function writeJson(name, obj) {
  fs.mkdirSync(DATA, { recursive: true });
  const file = path.join(DATA, name);
  const strip = o => JSON.stringify({ ...o, updatedAt: undefined });
  const prev = readJson(name, null);
  if (prev && strip(prev) === strip(obj)) return false;
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
  return true;
}

export const decodeXml = s => (s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));

export const steamIdOf = url => (String(url).match(/[?&]id=(\d+)/) || [])[1] || null;

/** 스팀 창작마당 상세 정보 (API 키 불필요) */
export async function steamDetails(ids) {
  const out = {};
  const uniq = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < uniq.length; i += 100) {
    const chunk = uniq.slice(i, i + 100);
    const body = new URLSearchParams({ itemcount: String(chunk.length) });
    chunk.forEach((id, n) => body.set(`publishedfileids[${n}]`, id));
    const j = await get('https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/', { type: 'json', method: 'POST', body });
    for (const d of j?.response?.publishedfiledetails || []) {
      if (d.result !== 1) continue;
      out[d.publishedfileid] = {
        title: d.title,
        preview: d.preview_url || '',
        subs: d.lifetime_subscriptions ?? d.subscriptions ?? 0,
        current: d.subscriptions ?? 0,
        favorited: d.lifetime_favorited ?? d.favorited ?? 0,
        views: d.views ?? 0,
        tags: (d.tags || []).map(t => t.tag),
        created: d.time_created ? d.time_created * 1000 : null,
        updated: d.time_updated ? d.time_updated * 1000 : null,
        size: Number(d.file_size || 0),
        collection: d.creator_app_id === 766 || d.file_type === 2,
        summary: cleanBBCode(d.description).slice(0, 220),
      };
    }
  }
  return out;
}

export function cleanBBCode(s = '') {
  return s.replace(/\[img\][\s\S]*?\[\/img\]/gi, ' ')
    .replace(/\[url=[^\]]*\]([\s\S]*?)\[\/url\]/gi, '$1')
    .replace(/\[\/?[a-z0-9*]+(=[^\]]*)?\]/gi, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/** OneSignal 웹 푸시 발송. 태그(video/live)로 동의한 사람에게만 보냅니다. */
export async function sendPush({ tag, title, body, url, image }) {
  const appId = process.env.ONESIGNAL_APP_ID || config.onesignal.appId;
  const key = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !key) { console.log(`[push:skip] ${tag} · ${title} — OneSignal 설정 없음`); return; }
  if (process.env.DRY_RUN) { console.log(`[push:dry] ${tag} · ${title} · ${body}`); return; }
  const res = await fetch('https://api.onesignal.com/notifications?c=push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${key}` },
    body: JSON.stringify({
      app_id: appId,
      target_channel: 'push',
      filters: [{ field: 'tag', key: tag, relation: '=', value: '1' }],
      headings: { en: title, ko: title },
      contents: { en: body, ko: body },
      url,
      chrome_web_image: image,
      chrome_web_icon: config.siteUrl ? `${config.siteUrl.replace(/\/$/, '')}/assets/img/icon-192.png` : undefined,
      ttl: tag === 'live' ? 60 * 60 * 3 : 60 * 60 * 24,
    }),
  });
  console.log(`[push] ${tag} · ${title} → ${res.status} ${await res.text()}`);
}
