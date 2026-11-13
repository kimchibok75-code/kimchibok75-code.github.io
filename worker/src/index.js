// 김치복 생방송 감지 서버 (Cloudflare Workers, 무료 플랜)
//  - 1분마다 치지직 방송 상태 확인 → 방송이 켜지면 OneSignal 푸시 발송
//  - GET /live → 홈페이지가 실시간으로 방송 상태를 읽어 감 (CORS 허용)
// 비밀값: ONESIGNAL_REST_API_KEY (wrangler secret put 으로 등록)

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const kst = s => (s ? new Date(s.replace(' ', 'T') + '+09:00').getTime() : null);

async function fetchLive(env) {
  const id = env.CHZZK_CHANNEL_ID;
  const r = await fetch(`https://api.chzzk.naver.com/service/v3/channels/${id}/live-detail`, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`chzzk ${r.status}`);
  const d = (await r.json()).content || {};
  const open = d.status === 'OPEN';
  return {
    checkedAt: Date.now(),
    open,
    liveId: d.liveId ?? null,
    title: d.liveTitle || null,
    viewers: open ? d.concurrentUserCount ?? null : null,
    category: d.liveCategoryValue || null,
    tags: d.tags || [],
    openDate: kst(d.openDate),
    closeDate: kst(d.closeDate),
    thumb: open && d.liveImageUrl ? d.liveImageUrl.replace('{type}', '720') : null,
    url: `https://chzzk.naver.com/live/${id}`,
  };
}

async function sendPush(env, live) {
  if (!env.ONESIGNAL_REST_API_KEY) return 'no-key';
  const site = env.SITE_URL.replace(/\/$/, '');
  const r = await fetch('https://api.onesignal.com/notifications?c=push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${env.ONESIGNAL_REST_API_KEY}` },
    body: JSON.stringify({
      app_id: env.ONESIGNAL_APP_ID,
      target_channel: 'push',
      filters: [{ field: 'tag', key: 'live', relation: '=', value: '1' }],
      headings: { en: '🔴 김치복 생방송 시작!', ko: '🔴 김치복 생방송 시작!' },
      contents: { en: live.title || '지금 치지직에서 방송 중', ko: live.title || '지금 치지직에서 방송 중' },
      url: live.url,
      chrome_web_image: live.thumb || undefined,
      chrome_web_icon: `${site}/assets/img/icon-256.png`,
      ttl: 60 * 60 * 3,
    }),
  });
  return `${r.status} ${await r.text()}`;
}

async function check(env) {
  const live = await fetchLive(env);
  const prev = (await env.STATE.get('live', 'json')) || { open: false, liveId: null };
  // 상태가 바뀔 때만 저장 (무료 쓰기 한도 아끼기)
  if (prev.open !== live.open || prev.liveId !== live.liveId) {
    let push = null;
    if (live.open && (!prev.open || prev.liveId !== live.liveId)) push = await sendPush(env, live);
    await env.STATE.put('live', JSON.stringify({ open: live.open, liveId: live.liveId, at: Date.now(), push }));
    console.log('state change', live.open, live.liveId, push);
  }
  return live;
}

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(check(env));
  },
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (url.pathname !== '/live') return new Response('kimchibok live', { headers: cors });
    // 30초 캐시: 방문자가 많아도 치지직에 요청이 몰리지 않게
    const cache = caches.default;
    const key = new Request(`${url.origin}/live`);
    let res = await cache.match(key);
    if (!res) {
      let body;
      try { body = await fetchLive(env); } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }); }
      res = new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=30' } });
      ctx.waitUntil(cache.put(key, res.clone()));
    }
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
};
