// 자동 데이터 갱신 — GitHub Actions가 주기적으로 실행합니다.
//   node scripts/update.mjs              → 전부
//   node scripts/update.mjs live youtube → 일부만
// 새 영상 / 방송 시작을 감지하면 OneSignal 푸시를 보냅니다.
import { config, get, readJson, writeJson, decodeXml, steamDetails, sendPush } from './lib.mjs';
import { syncSheet, enrichAndSave } from './sheet.mjs';

const tasks = process.argv.slice(2);
const want = t => !tasks.length || tasks.includes(t);
const state = readJson('state.json', { seenVideos: [], live: { open: false, liveId: null } });
const firstRun = !state.seenVideos.length;
const NEW_VIDEO_WINDOW = 1000 * 60 * 60 * 48; // 48시간 이내 업로드만 알림

// ───────────────────────────── 유튜브 ─────────────────────────────
async function feed(playlistId) {
  const xml = await get(`https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`);
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
    const pick = re => decodeXml((e.match(re) || [])[1]);
    const id = pick(/<yt:videoId>([^<]+)/);
    return {
      id,
      title: pick(/<media:title>([\s\S]*?)<\/media:title>/),
      published: pick(/<published>([^<]+)/),
      views: Number(pick(/views="(\d+)"/) || 0),
      likes: Number(pick(/starRating count="(\d+)"/) || 0),
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      url: pick(/<link rel="alternate" href="([^"]+)"/) || `https://www.youtube.com/watch?v=${id}`,
      short: /\/shorts\//.test(e),
    };
  });
}

async function channelMeta(ch) {
  try {
    const html = await get(`https://www.youtube.com/channel/${ch.channelId}`);
    const subs = (html.match(/"metadataParts":\[\{"text":\{"content":"(구독자 [^"]+)"/) || html.match(/"(구독자 [0-9.,]+[만천]?명)"/) || [])[1] || null;
    const avatar = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1] || null;
    const title = decodeXml((html.match(/<meta property="og:title" content="([^"]+)"/) || [])[1] || ch.name);
    return { subs, avatar, title };
  } catch { return {}; }
}

async function updateYoutube() {
  const prev = readJson('youtube.json', { channels: [] });
  const channels = [];
  const fresh = [];
  for (const ch of config.youtube) {
    const suffix = ch.channelId.slice(2);
    const safe = p => feed(p + suffix).catch(e => { if (/HTTP 404/.test(e.message)) return []; console.warn(`[youtube] ${ch.name} ${p} 실패: ${e.message}`); return null; });
    const [videos, shorts, popular, lives] = await Promise.all([safe('UULF'), safe('UUSH'), safe('UULP'), safe('UULV')]);
    const old = prev.channels.find(c => c.key === ch.key) || {};
    const meta = await channelMeta(ch);
    const c = {
      key: ch.key, name: ch.name, url: ch.url, title: meta.title || old.title || ch.name,
      subs: meta.subs || old.subs || null, avatar: meta.avatar || old.avatar || null,
      videos: videos ?? old.videos ?? [], shorts: shorts ?? old.shorts ?? [],
      popular: (popular ?? old.popular ?? []).sort((a, b) => b.views - a.views),
      lives: lives ?? old.lives ?? [],
    };
    channels.push(c);
    for (const v of [...c.videos, ...c.shorts]) {
      if (!state.seenVideos.includes(v.id)) {
        state.seenVideos.push(v.id);
        if (!firstRun && Date.now() - new Date(v.published) < NEW_VIDEO_WINDOW) fresh.push({ ...v, channel: c.name });
      }
    }
    console.log(`[youtube] ${c.name}: 영상 ${c.videos.length} / 쇼츠 ${c.shorts.length} / 인기 ${c.popular.length} / 라이브 ${c.lives.length} / ${c.subs || '-'}`);
  }
  state.seenVideos = state.seenVideos.slice(-600);
  writeJson('youtube.json', { updatedAt: Date.now(), channels });
  for (const v of fresh.slice(0, 3)) {
    await sendPush({ tag: 'video', title: `🎬 ${v.channel} 새 ${v.short ? '쇼츠' : '영상'}`, body: v.title, url: v.url, image: `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg` });
  }
}

// ───────────────────────────── 치지직 생방송 ─────────────────────────────
async function updateLive() {
  const id = config.chzzk.channelId;
  const base = 'https://api.chzzk.naver.com/service';
  const [ch, detail, replays] = await Promise.all([
    get(`${base}/v1/channels/${id}`, { type: 'json' }),
    get(`${base}/v3/channels/${id}/live-detail`, { type: 'json' }).catch(() => null),
    get(`${base}/v1/channels/${id}/videos?sortType=LATEST&pagingType=PAGE&page=0&size=50&videoType=REPLAY`, { type: 'json' }).catch(() => null),
  ]);
  const c = ch.content || {};
  const d = detail?.content || {};
  const open = !!c.openLive || d.status === 'OPEN';
  const prev = readJson('live.json', { history: [] });
  // 다시보기 목록 → 실제 방송 기록 (캘린더용)
  const kst = s => new Date(s.replace(' ', 'T') + '+09:00').getTime();
  const fromReplays = (replays?.content?.data || []).map(v => {
    const end = kst(v.publishDate);
    return { id: v.videoNo, title: v.videoTitle, start: end - v.duration * 1000, end, category: v.videoCategoryValue, thumb: v.thumbnailImageUrl, url: `https://chzzk.naver.com/video/${v.videoNo}` };
  });
  const history = [...fromReplays, ...(prev.history || [])]
    .filter((v, i, a) => a.findIndex(x => Math.abs(x.start - v.start) < 30 * 60 * 1000) === i)
    .sort((a, b) => b.start - a.start).slice(0, 200);

  const live = {
    updatedAt: Date.now(),
    open,
    channelName: c.channelName,
    channelImage: c.channelImageUrl,
    description: c.channelDescription,
    followers: c.followerCount,
    url: config.chzzk.url,
    title: d.liveTitle || null,
    viewers: open ? d.concurrentUserCount ?? null : null,
    category: d.liveCategoryValue || null,
    tags: d.tags || [],
    openDate: d.openDate ? kst(d.openDate) : null,
    closeDate: d.closeDate ? kst(d.closeDate) : null,
    thumb: d.liveImageUrl ? d.liveImageUrl.replace('{type}', '720') : null,
    history,
  };
  // 시청자 수는 매번 바뀌므로, 방송 중이 아닐 땐 값이 고정되도록 위에서 null 처리
  writeJson('live.json', live);
  console.log(`[live] ${open ? '🔴 방송 중' : '오프라인'} · ${live.title || ''} · 기록 ${history.length}개`);

  if (open && (!state.live.open || state.live.liveId !== d.liveId)) {
    await sendPush({ tag: 'live', title: `🔴 ${c.channelName || '김치복'} 생방송 시작!`, body: d.liveTitle || '지금 치지직에서 방송 중', url: config.chzzk.url, image: live.thumb || undefined });
  }
  state.live = { open, liveId: d.liveId ?? state.live.liveId };
}

// ───────────────────────────── 스팀 창작마당 주간 TOP ─────────────────────────────
async function weeklyIds() {
  const { appId, count } = config.workshop;
  if (process.env.STEAM_API_KEY) { // 키가 있으면 공식 API 사용
    const q = new URLSearchParams({ key: process.env.STEAM_API_KEY, query_type: '3', days: '7', appid: String(appId), numperpage: String(count), include_recent_votes_only: 'false', 'requiredtags[0]': 'Mod', return_short_description: 'true' });
    const j = await get(`https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/?${q}`, { type: 'json' });
    const ids = (j.response?.publishedfiledetails || []).map(d => d.publishedfileid);
    if (ids.length) return ids;
  }
  const html = await get(`https://steamcommunity.com/workshop/browse/?appid=${appId}&browsesort=trend&section=readytouseitems&actualsort=trend&days=7&p=1`);
  const at = html.indexOf('\\"results\\":[');
  if (at < 0) throw new Error('창작마당 페이지 구조가 바뀜');
  const ids = [...html.slice(at).matchAll(/\\"publishedfileid\\":\\"(\d+)\\"/g)].map(m => m[1]);
  // 결과 객체 안의 children 등에도 publishedfileid가 있을 수 있어, 상위 결과만 쓰도록 중복 제거
  return [...new Set(ids)].slice(0, count);
}

async function updateWorkshop() {
  const ids = await weeklyIds();
  const det = await steamDetails(ids);
  const items = ids.filter(id => det[id]).map((id, i) => ({ rank: i + 1, id, url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`, ...det[id] }));
  if (items.length < 5) throw new Error(`창작마당 항목이 ${items.length}개뿐`);
  const prev = readJson('workshop.json', { items: [] });
  const prevRank = Object.fromEntries((prev.items || []).map(m => [m.id, m.rank]));
  for (const m of items) m.prevRank = prevRank[m.id] ?? m.prevRank ?? null;
  writeJson('workshop.json', { updatedAt: Date.now(), source: config.workshop.url, items });
  console.log(`[workshop] TOP ${items.length}: ${items.slice(0, 3).map(m => m.title).join(' / ')}`);
}

// ───────────────────────────── 모드 저장소 ─────────────────────────────
async function updateMods() {
  const db = await syncSheet();
  await enrichAndSave(db);
}

// ───────────────────────────── 실행 ─────────────────────────────
const jobs = { youtube: updateYoutube, live: updateLive, workshop: updateWorkshop, mods: updateMods };
let failed = 0;
for (const [name, fn] of Object.entries(jobs)) {
  if (!want(name)) continue;
  try { await fn(); } catch (e) { failed++; console.error(`[${name}] 실패:`, e.message); }
}
writeJson('state.json', state);
if (failed) process.exitCode = 1;
