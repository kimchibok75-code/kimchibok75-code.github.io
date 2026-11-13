// 김치복 홈페이지 — 데이터는 data/*.json (GitHub Actions가 자동 갱신)
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } },
};
const bust = () => `?t=${Math.floor(Date.now() / 60000)}`;
const load = (p, d = null) => fetch(p + bust()).then(r => (r.ok ? r.json() : d)).catch(() => d);

// ───────── 포맷 ─────────
const KST = 9 * 3600e3;
const kst = t => { const d = new Date(+t + KST); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay(), h: d.getUTCHours(), mi: d.getUTCMinutes() }; };
const kstTime = (y, m, d, h = 0, mi = 0) => Date.UTC(y, m, d, h, mi) - KST;
const dkey = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const keyOf = t => { const k = kst(t); return dkey(k.y, k.m, k.d); };
const hhmm = t => { const k = kst(t); return `${k.h < 12 ? '오전' : '오후'} ${((k.h + 11) % 12) + 1}:${String(k.mi).padStart(2, '0')}`; };
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
function num(n) {
  if (n == null) return '-';
  if (n >= 1e8) return `${+(n / 1e8).toFixed(1)}억`;
  if (n >= 1e4) return `${+(n / 1e4).toFixed(1)}만`;
  if (n >= 1e3) return `${+(n / 1e3).toFixed(1)}천`;
  return String(n);
}
function ago(t) {
  const s = (Date.now() - new Date(t)) / 1000;
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}일 전`;
  if (s < 86400 * 365) return `${Math.floor(s / 86400 / 30)}개월 전`;
  return `${Math.floor(s / 86400 / 365)}년 전`;
}
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 3200);
}

// ───────── 테마 ─────────
function initTheme() {
  const btn = $('#themeBtn');
  const apply = t => {
    if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
    const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    btn.innerHTML = `<svg><use href="#i-${dark ? 'sun' : 'moon'}"/></svg>`;
    btn.dataset.dark = dark ? '1' : '';
  };
  apply(store.get('kcb-theme', null));
  btn.onclick = () => { const t = btn.dataset.dark ? 'light' : 'dark'; store.set('kcb-theme', t); apply(t); };
}

// ───────── 상태 ─────────
const S = { cfg: null, yt: null, live: null, mods: null, ws: null, sched: null };

// ───────── 히어로 & 채널 ─────────
function renderHero() {
  const { cfg, yt, live } = S;
  $('#tagline').textContent = cfg.tagline;
  const main = yt?.channels?.[0];
  const stats = [];
  if (main?.subs) stats.push(`<span class="stat"><svg style="color:#ff0033"><use href="#i-yt"/></svg>유튜브 <b>${esc(main.subs.replace('구독자 ', ''))}</b></span>`);
  if (live?.followers) stats.push(`<span class="stat"><svg style="color:#00d38b"><use href="#i-chzzk"/></svg>치지직 팔로워 <b>${num(live.followers)}</b></span>`);
  $('#heroStats').innerHTML = stats.join('');

  const chs = [
    ...cfg.youtube.map(c => {
      const d = yt?.channels?.find(x => x.key === c.key);
      return { url: c.url, cls: 'ico-yt', icon: 'yt', img: d?.avatar, name: c.name, sub: d?.subs || c.desc, tag: '유튜브' };
    }),
    { url: cfg.chzzk.url, cls: 'ico-chzzk', icon: 'chzzk', name: '치지직', sub: live?.open ? '🔴 지금 방송 중' : '금·토·일 밤 9시' },
    { url: cfg.cafe.url, cls: 'ico-cafe', icon: 'cafe', name: '팬 카페', sub: '네이버 카페' },
    { url: cfg.discord.url, cls: 'ico-discord', icon: 'discord', name: '디스코드', sub: '커뮤니티 서버' },
  ];
  $('#channels').innerHTML = chs.map(c => `
    <a class="ch-card glass" href="${esc(c.url)}" target="_blank" rel="noopener">
      <span class="ch-ico ${c.cls}">${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<svg><use href="#i-${c.icon}"/></svg>`}</span>
      <span><strong>${esc(c.name)}${c.tag ? ` <small style="display:inline;color:var(--faint)">${c.tag}</small>` : ''}</strong><small>${esc(c.sub)}</small></span>
      <svg class="arrow"><use href="#i-arrow"/></svg>
    </a>`).join('');
  $('#cafeCard').href = cfg.cafe.url; $('#cafeCard').querySelector('p').textContent = cfg.cafe.desc;
  $('#discordCard').href = cfg.discord.url; $('#discordCard').querySelector('p').textContent = cfg.discord.desc;
}

// ───────── 홈: 생방송 상황판 ─────────
const dur = ms => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`; };
const until = ms => { const m = Math.max(0, Math.round(ms / 60000)); const d = Math.floor(m / 1440), h = Math.floor(m / 60) % 24, mi = m % 60; return [d && `${d}일`, h && `${h}시간`, (!d && mi) && `${mi}분`].filter(Boolean).join(' ') || '곧'; };
function renderLive() {
  const l = S.live; if (!l) return;
  const card = $('#liveCard');
  card.href = l.url || S.cfg.chzzk.url;
  card.classList.toggle('on', !!l.open);
  $('#avatarLive').hidden = !l.open;
  const last = l.history?.[0];
  const thumb = l.open ? l.thumb : last?.thumb;
  $('#liveMedia').innerHTML = `${thumb ? `<img src="${esc(thumb)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : '<span class="lb-ph"><svg><use href="#i-chzzk"/></svg></span>'}<span class="lb-badge">${l.open ? 'LIVE' : '오프라인'}</span>`;
  if (l.open) {
    $('#liveState').textContent = '지금 치지직에서 방송 중';
    $('#liveTitle').textContent = l.title || '생방송 중';
    $('#liveSub').textContent = [l.category, l.viewers != null ? `시청자 ${num(l.viewers)}명` : '', l.openDate ? `${hhmm(l.openDate)} 시작` : ''].filter(Boolean).join(' · ');
  } else {
    $('#liveState').textContent = '지금은 방송 중이 아니에요';
    $('#liveTitle').textContent = last ? `지난 방송 · ${last.title}` : '치지직 방송국';
    $('#liveSub').textContent = last ? `${ago(last.end)} · ${dur(last.end - last.start).replace(/:\d\d$/, '').replace(':', '시간 ')}분 방송${last.category ? ` · ${last.category}` : ''}` : '';
  }
  tickBoard();
}
function tickBoard() {
  const l = S.live; const el = $('#liveFoot'); if (!l || !el) return;
  if (l.open) { el.innerHTML = `<span>방송 시간 <b>${l.openDate ? dur(Date.now() - l.openDate) : '-'}</b></span><span class="btn btn-accent btn-sm">보러 가기</span>`; return; }
  const n = nextBroadcast();
  el.innerHTML = n ? `<span>다음 방송 <b>${kst(n.at).m + 1}/${kst(n.at).d} (${DOW[kst(n.at).dow]}) ${hhmm(n.at)}</b></span><span class="muted">${n.at - Date.now() > 0 ? `${until(n.at - Date.now())} 후` : '곧 시작'}</span>` : '<span class="muted">예정된 방송이 없어요</span>';
}

// ───────── 홈: 오늘부터 7일간 방송 일정 ─────────
function renderWeek() {
  const t = kst(Date.now());
  const today = dkey(t.y, t.m, t.d);
  let html = '';
  for (let i = 0; i < 7; i++) {
    const dt = new Date(Date.UTC(t.y, t.m, t.d + i));
    const [y, m, d] = [dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()];
    const key = dkey(y, m, d); const dow = dt.getUTCDay();
    const plans = plannedOn(y, m, d);
    const livedToday = (S.live?.history || []).some(h => keyOf(h.start) === key) || (S.live?.open && S.live.openDate && keyOf(S.live.openDate) === key);
    let what;
    if (key === today && S.live?.open) what = '<span class="wk-st on">🔴 방송 중</span>';
    else if (plans.some(p => p.type === 'off')) what = '<span class="wk-st off">휴방</span>';
    else if (key === today && livedToday) what = '<span class="wk-st done">방송 끝</span>';
    else {
      const ps = plans.filter(p => p.type === 'plan' || p.type === 'event');
      what = ps.length ? ps.map(p => `<span class="wk-st ${p.type}">${p.type === 'event' ? esc(p.title) : `${hhmm(p.at)} 방송`}</span>`).join('') : '<span class="wk-st none">방송 없음</span>';
    }
    html += `<li class="${key === today ? 'today' : ''} ${dow === 0 ? 'sun' : dow === 6 ? 'sat' : ''}"><span class="wk-d"><b>${key === today ? '오늘' : DOW[dow]}</b><small>${m + 1}/${d}</small></span>${what}</li>`;
  }
  $('#weekList').innerHTML = html;
}

// ───────── 영상 ─────────
const V = { ch: store.get('kcb-ch', 0), tab: 'videos' };
function renderVideoTabs() {
  $('#chTabs').innerHTML = S.cfg.youtube.map((c, i) => `<button data-i="${i}" class="${i === V.ch ? 'on' : ''}">${esc(c.name)}</button>`).join('');
  $('#chTabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; V.ch = +b.dataset.i; store.set('kcb-ch', V.ch); renderVideoTabs(); renderVideos(); };
  $('#vidTabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; V.tab = b.dataset.v; $$('#vidTabs button').forEach(x => x.classList.toggle('on', x === b)); renderVideos(); };
}
const isNew = v => Date.now() - new Date(v.published) < 3 * 86400e3;
// 유튜브 썸네일: 기본(hqdefault)은 4:3이라 16:9 칸에 넣으면 잘리거나 검은 띠가 보임
// → 16:9 원본(maxres / hq720 / mq)을 쓰고, 없으면 다음 후보로 넘어감
const ytImg = (id, name) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${name}.jpg`;
function thumbTag(v, size = 'md') {
  const chain = v.short ? ['hqdefault'] // 세로 칸에 가운데를 채우면 쇼츠 화면과 딱 맞음
    : size === 'lg' ? ['maxresdefault', 'hq720', 'mqdefault']
    : size === 'sm' ? ['mqdefault'] : ['hq720', 'mqdefault'];
  const [first, ...rest] = chain.map(n => ytImg(v.id, n));
  return `<img src="${first}" data-fb="${rest.join(' ')}" alt="" loading="lazy">`;
}
function nextThumb(img) {
  const [n, ...rest] = (img.dataset.fb || '').split(' ').filter(Boolean);
  if (!n) { delete img.dataset.fb; return; }
  img.dataset.fb = rest.join(' ');
  img.src = n;
}
// 없는 썸네일은 오류 대신 120×90 회색 이미지가 오기도 해서 크기로도 확인
document.addEventListener('load', e => { const t = e.target; if (t.tagName === 'IMG' && 'fb' in t.dataset && t.naturalWidth <= 120) nextThumb(t); }, true);
document.addEventListener('error', e => { const t = e.target; if (t.tagName === 'IMG' && 'fb' in t.dataset) nextThumb(t); }, true);
const vidCard = (v, size = 'md') => `
  <button class="vid ${size === 'lg' ? 'big' : ''}" data-id="${esc(v.id)}" data-short="${v.short ? 1 : ''}" data-title="${esc(v.title)}">
    <div class="thumb">${thumbTag(v, size)}${isNew(v) ? '<span class="badge new">NEW</span>' : ''}</div>
    <div class="info"><div class="title">${esc(v.title)}</div><div class="sub">조회수 ${num(v.views)}회 · ${ago(v.published)}</div></div>
  </button>`;
function renderVideos() {
  const area = $('#videoArea');
  const ch = S.yt?.channels?.[V.ch];
  const list = ch?.[V.tab] || [];
  // 라이브 탭은 영상이 있는 채널에서만 의미가 있으므로 숨김 처리
  $$('#vidTabs button').forEach(b => { b.hidden = !!S.yt && !(ch?.[b.dataset.v] || []).length; });
  if (!list.length) { area.innerHTML = `<div class="empty">아직 불러온 영상이 없어요</div>`; return; }
  if (V.tab === 'popular') {
    const max = list[0].views || 1;
    area.innerHTML = `<div class="pop-list">${list.slice(0, 10).map((v, i) => `
      <button class="pop" data-id="${esc(v.id)}" data-short="${v.short ? 1 : ''}" data-title="${esc(v.title)}">
        <span class="rank">${i + 1}</span>${thumbTag({ ...v, short: false }, 'sm')}
        <span><div class="title">${esc(v.title)}</div><div class="sub">조회수 ${num(v.views)}회 · ${ago(v.published)}</div><div class="views-bar"><i style="width:${(v.views / max) * 100}%"></i></div></span>
      </button>`).join('')}</div>`;
  } else if (V.tab === 'shorts') {
    area.innerHTML = `<div class="video-grid shorts">${list.slice(0, 12).map(v => vidCard({ ...v, short: true })).join('')}</div>`;
  } else {
    const [first, ...rest] = list;
    area.innerHTML = `<div class="featured">${vidCard(first, 'lg')}<div class="feat-side">${rest.slice(0, 3).map(v => vidCard(v, 'sm')).join('')}</div></div>
      <div class="video-grid">${rest.slice(3, 11).map(v => vidCard(v)).join('')}</div>`;
  }
}
function openPlayer(id, title, short) {
  const dlg = $('#player');
  $('#playerFrame').className = `player-frame${short ? ' short' : ''}`;
  $('#playerFrame').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  $('#playerTitle').textContent = title;
  $('#playerLink').href = short ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`;
  dlg.showModal();
}
document.addEventListener('click', e => {
  const v = e.target.closest('[data-id].vid, [data-id].pop');
  if (v) openPlayer(v.dataset.id, v.dataset.title, !!v.dataset.short);
});
$('#player')?.addEventListener('close', () => { $('#playerFrame').innerHTML = ''; });

// ───────── 방송 일정 ─────────
const C = { y: 0, m: 0, sel: null };
function plannedOn(y, m, d) {
  const sch = S.sched || { weekly: [], events: [], off: [] };
  const key = dkey(y, m, d);
  const dow = new Date(Date.UTC(y, m, d)).getUTCDay();
  const out = [];
  if (!(sch.off || []).includes(key)) {
    for (const w of sch.weekly || []) if (w.days.includes(dow)) {
      const [h, mi] = w.time.split(':').map(Number);
      out.push({ type: 'plan', at: kstTime(y, m, d, h, mi), title: w.title, platform: w.platform });
    }
  } else out.push({ type: 'off', title: '휴방' });
  for (const ev of sch.events || []) if (ev.date === key) {
    const [h = 0, mi = 0] = (ev.time || '0:0').split(':').map(Number);
    out.push({ type: 'event', at: kstTime(y, m, d, h, mi), title: ev.title, note: ev.note, url: ev.url, timed: !!ev.time });
  }
  return out;
}
function dayItems(y, m, d) {
  const key = dkey(y, m, d);
  const todayKey = keyOf(Date.now());
  const items = [];
  const lives = (S.live?.history || []).filter(h => keyOf(h.start) === key).map(h => ({ type: 'live', at: h.start, title: h.title, sub: `${hhmm(h.start)} ~ ${hhmm(h.end)} · ${h.category || ''}`, url: h.url, thumb: h.thumb }));
  if (S.live?.open && S.live.openDate && keyOf(S.live.openDate) === key) lives.unshift({ type: 'live', at: S.live.openDate, title: `🔴 ${S.live.title || '방송 중'}`, sub: `${hhmm(S.live.openDate)} 시작 · 방송 중`, url: S.live.url, thumb: S.live.thumb });
  items.push(...lives);
  for (const p of plannedOn(y, m, d)) {
    if (p.type === 'plan' && (key < todayKey || lives.length)) continue; // 지난 날은 실제 방송 기록으로 표시
    items.push({ ...p, sub: p.type === 'off' ? '이 날은 쉬어요' : p.type === 'event' ? [p.timed ? hhmm(p.at) : '', p.note].filter(Boolean).join(' · ') : `${hhmm(p.at)} · 치지직`, url: p.url || (p.type === 'plan' ? S.cfg.chzzk.url : null) });
  }
  for (const c of S.yt?.channels || []) for (const v of [...(c.videos || []), ...(c.shorts || [])]) {
    if (keyOf(new Date(v.published)) === key) items.push({ type: 'yt', at: +new Date(v.published), title: v.title, sub: `${c.name} · ${v.short ? '쇼츠' : '영상'} 업로드 · ${hhmm(new Date(v.published))}`, url: v.url, thumb: ytImg(v.id, 'mqdefault') });
  }
  return items.sort((a, b) => (a.at || 0) - (b.at || 0));
}
function renderCalendar() {
  const { y, m } = C;
  $('#calTitle').textContent = `${y}년 ${m + 1}월`;
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const today = keyOf(Date.now());
  let html = '';
  for (let i = 0; i < 42; i++) {
    const dt = new Date(Date.UTC(y, m, 1 - first + i));
    const [yy, mm, dd] = [dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()];
    if (i >= 35 && mm !== m) break;
    const key = dkey(yy, mm, dd);
    const items = dayItems(yy, mm, dd);
    const label = items.find(x => x.type === 'event') || items.find(x => x.type === 'live') || items.find(x => x.type === 'plan') || items.find(x => x.type === 'off');
    const types = [...new Set(items.map(x => x.type).filter(t => t !== 'off'))];
    const tagTxt = label ? (label.type === 'live' ? '방송함' : label.type === 'plan' ? hhmm(label.at).replace(':00', '시') : label.title) : '';
    html += `<button class="day ${mm !== m ? 'out' : ''} ${key === today ? 'today' : ''} ${key === C.sel ? 'sel' : ''}" data-key="${key}" aria-label="${mm + 1}월 ${dd}일 일정 ${items.length}개">
      <span class="n">${dd}</span>
      ${label ? `<span class="tag t-${label.type}">${esc(tagTxt)}</span>` : ''}
      <span class="dots">${types.map(t => `<i class="dot d-${t}"></i>`).join('')}</span></button>`;
  }
  $('#calGrid').innerHTML = html;
  renderDayDetail();
}
function renderDayDetail() {
  const [y, m, d] = C.sel.split('-').map(Number);
  const items = dayItems(y, m - 1, d);
  const dow = DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const color = { plan: 'var(--accent)', live: 'var(--green)', yt: '#ff3355', event: 'var(--purple)', off: 'var(--faint)' };
  $('#calDetail').innerHTML = `<h3>${m}월 ${d}일 (${dow})</h3>` + (items.length ? items.map(it => {
    const inner = `${it.thumb ? `<img src="${esc(it.thumb)}" alt="" loading="lazy">` : `<span class="bar" style="background:${color[it.type]}"></span>`}<span><strong>${esc(it.title)}</strong><small>${esc(it.sub || '')}</small></span>`;
    return it.url ? `<a class="ev" href="${esc(it.url)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="ev">${inner}</div>`;
  }).join('') : '<p class="muted">일정이 없어요</p>');
}
function nextBroadcast() {
  const now = Date.now(); const t = kst(now);
  for (let i = 0; i < 21; i++) {
    const dt = new Date(Date.UTC(t.y, t.m, t.d + i));
    const list = plannedOn(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()).filter(p => (p.type === 'plan' || (p.type === 'event' && p.timed)) && p.at > now - 2 * 3600e3);
    if (list.length) return list.sort((a, b) => a.at - b.at)[0];
  }
  return null;
}
function tickNext() {
  const el = $('#nextLive');
  if (S.live?.open) { el.innerHTML = `<span>🔴 지금 방송 중</span><a class="btn btn-accent btn-sm" href="${esc(S.live.url)}" target="_blank" rel="noopener">보러 가기</a>`; return; }
  const n = nextBroadcast();
  if (!n) { el.hidden = true; return; }
  el.hidden = false;
  const diff = n.at - Date.now();
  const k = kst(n.at);
  if (diff <= 0) { el.innerHTML = `<span>곧 방송 시작!</span><b>${DOW[k.dow]} ${hhmm(n.at)}</b>`; return; }
  const dd = Math.floor(diff / 86400e3), hh = Math.floor(diff / 3600e3) % 24, mm = Math.floor(diff / 60e3) % 60, ss = Math.floor(diff / 1e3) % 60;
  const p = v => String(v).padStart(2, '0');
  el.innerHTML = `<span>다음 방송 · ${k.m + 1}/${k.d} (${DOW[k.dow]}) ${hhmm(n.at)}</span><b>${dd ? `${dd}일 ` : ''}${p(hh)}:${p(mm)}:${p(ss)}</b>`;
}
function initCalendar() {
  const t = kst(Date.now());
  C.y = t.y; C.m = t.m; C.sel = dkey(t.y, t.m, t.d);
  const w = S.sched?.weekly?.[0];
  if (w) $('#schedHint').textContent = `매주 ${w.days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DOW[d]).join(' · ')} ${hhmm(kstTime(2000, 0, 1, ...w.time.split(':').map(Number)))} 치지직`;
  $('#calPrev').onclick = () => { C.m--; if (C.m < 0) { C.m = 11; C.y--; } renderCalendar(); };
  $('#calNext').onclick = () => { C.m++; if (C.m > 11) { C.m = 0; C.y++; } renderCalendar(); };
  $('#calGrid').onclick = e => { const b = e.target.closest('.day'); if (!b) return; C.sel = b.dataset.key; $$('.day').forEach(x => x.classList.toggle('sel', x === b)); renderDayDetail(); };
  renderCalendar();
  tickNext(); setInterval(tickNext, 1000);
}

// ───────── 모드 저장소 ─────────
const M = { cat: '', section: '', version: '', sort: 'order', q: '', limit: 60 };
const VERSIONS = ['1.6', '1.7']; // 버전 정보는 1.6 · 1.7만 표시
const versionsOf = m => { const v = new Set((m.steam?.tags || []).filter(t => VERSIONS.includes(t))); if (VERSIONS.includes(m.version)) v.add(m.version); return [...v].sort(); };
const norm = s => String(s || '').toLowerCase().replace(/\s+/g, '');
function hl(text, q) {
  const t = esc(text); if (!q) return t;
  const words = q.split(/\s+/).filter(Boolean).map(w => esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return words.length ? t.replace(new RegExp(`(${words.join('|')})`, 'gi'), '<mark>$1</mark>') : t;
}
function filteredMods() {
  const words = M.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let list = S.mods.items.filter(m =>
    (!M.cat || m.category === M.cat) &&
    (!M.section || m.section === M.section) &&
    (!M.version || versionsOf(m).includes(M.version)) &&
    (!words.length || words.every(w => norm([m.name, m.desc, m.section, m.category, m.steam?.title, ...(m.steam?.tags || [])].join(' ')).includes(w.replace(/\s+/g, '')))));
  const catOrder = Object.fromEntries(S.mods.categories.map((c, i) => [c.key, i]));
  const by = {
    order: (a, b) => (catOrder[a.category] - catOrder[b.category]) || (a.order - b.order),
    subs: (a, b) => (b.steam?.subs || 0) - (a.steam?.subs || 0),
    updated: (a, b) => (b.steam?.updated || 0) - (a.steam?.updated || 0),
    name: (a, b) => a.name.localeCompare(b.name, 'ko'),
  }[M.sort];
  return list.sort(by);
}
const catOf = k => S.mods.categories.find(c => c.key === k) || { key: k, label: k, icon: '🧩' };
function renderModFilters() {
  const { categories, items } = S.mods;
  const inVer = m => !M.version || versionsOf(m).includes(M.version);
  const count = k => items.filter(m => (!k || m.category === k) && inVer(m)).length;
  // 대분류
  $('#modCats').innerHTML = [{ key: '', label: '전체', icon: '✨' }, ...categories].map(c =>
    `<button class="cat ${M.cat === c.key ? 'on' : ''}" data-cat="${esc(c.key)}" role="tab" aria-selected="${M.cat === c.key}"><span class="ci">${c.icon || '🧩'}</span><span>${esc(c.label)}</span><small>${count(c.key)}</small></button>`).join('');
  // 소분류 (대분류를 고르면 나타남)
  const secs = M.cat ? [...new Set(items.filter(m => m.category === M.cat).map(m => m.section))] : [];
  const secCount = s => items.filter(m => m.category === M.cat && m.section === s && inVer(m)).length;
  $('#modSubs').hidden = !secs.length;
  $('#modSubs').innerHTML = secs.length ? ['', ...secs].map(s => `<button class="sub ${M.section === s ? 'on' : ''}" data-sec="${esc(s)}">${s ? esc(s) : '전체'} <small>${s ? secCount(s) : count(M.cat)}</small></button>`).join('') : '';
  const cat = categories.find(c => c.key === M.cat);
  $('#modNotes').innerHTML = cat ? `<strong>${esc(cat.desc || '')}</strong>${cat.notes?.length ? `<details><summary>${esc(cat.label)} 모드 안내 보기</summary><ul>${cat.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></details>` : ''}` : '';
}
function modRow(m, q) {
  const s = m.steam || {};
  const img = s.preview ? `${s.preview}${s.preview.includes('?') ? '&' : '?'}imw=160&imh=90&ima=fit&impolicy=Letterbox` : '';
  const vers = versionsOf(m);
  return `<a class="mrow" href="${esc(m.url)}" target="_blank" rel="noopener">
    <span class="mthumb">${m.kind === 'mapfile' ? '🗺️' : m.kind === 'collection' || s.collection ? '📦' : '🧩'}${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>
    <span class="mmain">
      <span class="mname">${hl(m.name, q)}</span>
      ${m.desc ? `<span class="mdesc">${hl(m.desc, q)}</span>` : ''}
    </span>
    <span class="msec">${M.cat ? '' : `${catOf(m.category).icon || ''} `}${esc(m.section)}</span>
    <span class="mver">${VERSIONS.map(v => `<i class="${vers.includes(v) ? 'ok' : ''}">${v}</i>`).join('')}</span>
    <span class="msubs">${s.subs ? `${num(s.subs)}` : '-'}<small>구독</small></span>
  </a>`;
}
function renderMods() {
  const list = filteredMods();
  const q = M.q.trim();
  $('#modCount').textContent = `김치복이 직접 쓰고 추천하는 림월드 모드 · ${list.length}개`;
  const shown = list.slice(0, M.limit);
  let html = '';
  if (!shown.length) html = '<div class="empty">조건에 맞는 모드가 없어요</div>';
  else if (M.sort === 'order' && !q) { // 추천 순서일 땐 소분류별 머리글로 묶어서 보여 줌
    let head = '';
    for (const m of shown) {
      const h = `${m.category}|${m.section}`;
      if (h !== head) { head = h; const c = catOf(m.category); html += `<div class="mgroup">${M.cat ? '' : `<span>${c.icon || ''} ${esc(c.label)}</span> · `}${esc(m.section)}</div>`; }
      html += modRow(m, q);
    }
  } else html = shown.map(m => modRow(m, q)).join('');
  $('#modGrid').innerHTML = html;
  $('#modMore').hidden = list.length <= M.limit;
  $('#modMore').textContent = `더 보기 (${list.length - M.limit}개 남음)`;
}
function initMods() {
  if (!S.mods?.items?.length) { $('#modGrid').innerHTML = '<div class="empty">모드 목록을 불러오지 못했어요</div>'; return; }
  const reset = () => { M.limit = 60; renderMods(); };
  $('#modCats').onclick = e => { const b = e.target.closest('.cat'); if (!b) return; M.cat = b.dataset.cat; M.section = ''; renderModFilters(); reset(); };
  $('#modSubs').onclick = e => { const b = e.target.closest('.sub'); if (!b) return; M.section = b.dataset.sec; renderModFilters(); reset(); };
  $('#modVersion').onclick = e => { const b = e.target.closest('button'); if (!b) return; M.version = b.dataset.v; $$('#modVersion button').forEach(x => x.classList.toggle('on', x === b)); renderModFilters(); reset(); };
  $('#modSort').onchange = e => { M.sort = e.target.value; reset(); };
  let t; $('#modSearch').oninput = e => { clearTimeout(t); t = setTimeout(() => { M.q = e.target.value; reset(); }, 120); };
  $('#modMore').onclick = () => { M.limit += 60; renderMods(); };
  renderModFilters(); renderMods();
  const g = S.mods.guide;
  if (g?.greeting || g?.faq?.length) {
    $('#guide').hidden = false;
    $('#guideBody').innerHTML = `${esc(g.greeting)}${g.faq?.length ? `<div class="faq">${g.faq.map(f => `<div><b>Q. ${esc(f.q)}</b>A. ${esc(f.a)}</div>`).join('')}</div>` : ''}`;
  }
}

// ───────── 주간 순위 ─────────
function renderWeekly() {
  const items = S.ws?.items || [];
  if (!items.length) { $('#rankList').innerHTML = '<div class="empty">순위를 불러오지 못했어요</div>'; return; }
  $('#rankList').innerHTML = items.map(m => {
    let move = '';
    if (m.prevRank == null) move = '<small class="new">NEW</small>';
    else if (m.prevRank > m.rank) move = `<small class="up">▲${m.prevRank - m.rank}</small>`;
    else if (m.prevRank < m.rank) move = `<small class="down">▼${m.rank - m.prevRank}</small>`;
    else move = '<small style="color:var(--faint)">–</small>';
    const img = m.preview ? `${m.preview}${m.preview.includes('?') ? '&' : '?'}imw=240&imh=135&ima=fit&impolicy=Letterbox` : '';
    const ver = (m.tags || []).filter(t => /^\d+\.\d+$/.test(t)).sort((a, b) => parseFloat(b) - parseFloat(a))[0];
    return `<li><a class="rank glass" href="${esc(m.url)}" target="_blank" rel="noopener">
      <span class="no">${m.rank}${move}</span>
      <img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer">
      <span><div class="title">${esc(m.title)}</div><div class="sum" title="${esc(m.summary || '')}">${esc(m.ko || m.summary || '')}</div></span>
      <span class="num"><b>${num(m.subs)}</b>구독${ver ? ` · v${ver}` : ''}</span></a></li>`;
  }).join('');
}

// ───────── 알림 (OneSignal 웹 푸시) ─────────
const N = { pref: store.get('kcb-notify', { on: false, video: true, live: true }), ready: null };
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
function oneSignal() {
  if (N.ready) return N.ready;
  const appId = S.cfg?.onesignal?.appId;
  if (!appId) return (N.ready = Promise.resolve(null));
  N.ready = new Promise(resolve => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    const base = new URL('.', location.href).pathname; // GitHub Pages 하위 경로 대응
    window.OneSignalDeferred.push(async OS => {
      try {
        await OS.init({
          appId,
          safari_web_id: S.cfg.onesignal.safariWebId,
          serviceWorkerPath: `${base.slice(1)}OneSignalSDKWorker.js`,
          serviceWorkerParam: { scope: base },
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
          promptOptions: { autoPrompt: false },
        });
        resolve(OS);
      } catch (e) { console.warn('OneSignal init 실패', e); resolve(null); }
    });
    const s = document.createElement('script');
    s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'; s.defer = true;
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return N.ready;
}
function paintNotifyBtn() {
  const b = $('#notifyBtn');
  b.classList.toggle('subscribed', N.pref.on);
  b.classList.toggle('btn-accent', !N.pref.on);
  b.querySelector('span').textContent = N.pref.on ? '알림 받는 중' : '알림 받기';
}
function openConsent() {
  $('#optVideo').checked = N.pref.video; $('#optLive').checked = N.pref.live;
  $('#optAgree').checked = N.pref.on;
  $('#notifyOff').hidden = !N.pref.on;
  $('#notifyOn').textContent = N.pref.on ? '설정 저장' : '동의하고 알림 받기';
  $('#iosHint').hidden = !(isIOS && !standalone);
  $('#consentMsg').textContent = '';
  $('#consent').showModal();
}
async function subscribe() {
  const msg = $('#consentMsg');
  const video = $('#optVideo').checked, live = $('#optLive').checked;
  if (!video && !live) { msg.textContent = '받을 알림을 하나 이상 골라 주세요.'; return; }
  if (!$('#optAgree').checked) { msg.textContent = '알림 수신 동의에 체크해 주세요.'; return; }
  if (isIOS && !standalone) { msg.textContent = '아이폰은 먼저 홈 화면에 추가해 주세요.'; return; }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) { msg.textContent = '이 브라우저는 푸시 알림을 지원하지 않아요.'; return; }
  msg.textContent = '알림 권한을 요청하는 중…';
  const OS = await oneSignal();
  if (!OS) { msg.textContent = '알림 서버가 아직 연결되지 않았어요. (운영자 설정 필요)'; return; }
  try {
    await OS.Notifications.requestPermission();
    if (!OS.Notifications.permission) { msg.textContent = '브라우저에서 알림이 차단되어 있어요. 주소창의 🔒 아이콘에서 알림을 허용해 주세요.'; return; }
    await OS.User.PushSubscription.optIn();
    await OS.User.addTags({ video: video ? '1' : '0', live: live ? '1' : '0', consent_at: String(Date.now()) });
    N.pref = { on: true, video, live }; store.set('kcb-notify', N.pref); paintNotifyBtn();
    $('#consent').close();
    toast(`🔔 ${[video && '새 영상', live && '생방송'].filter(Boolean).join(' · ')} 알림을 받아요`);
  } catch (e) { console.warn(e); msg.textContent = '알림 설정 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.'; }
}
async function unsubscribe() {
  const OS = await oneSignal();
  try { if (OS) { await OS.User.addTags({ video: '0', live: '0' }); await OS.User.PushSubscription.optOut(); } } catch (e) { console.warn(e); }
  N.pref = { ...N.pref, on: false }; store.set('kcb-notify', N.pref); paintNotifyBtn();
  $('#consent').close(); toast('알림을 껐어요');
}
function initNotify() {
  paintNotifyBtn();
  $('#notifyBtn').onclick = openConsent;
  $('#notifySettings').onclick = openConsent;
  $('#notifyOn').onclick = subscribe;
  $('#notifyOff').onclick = unsubscribe;
  if (N.pref.on) oneSignal(); // 이미 동의한 사람만 SDK 로드
}

// ───────── 네비 하이라이트 (홈에서 스크롤 위치에 따라) ─────────
function initNav() {
  const links = $$('.nav-links a');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === `./#${e.target.id}`));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => io.observe(s));
}


// ───────── 홈: 팬카페 최신글 ─────────
const CF = { board: '' };
const boardName = b => b.replace(/^[^\p{L}\p{N}]+/u, '').trim() || b; // 앞쪽 이모지 떼기
function renderCafe() {
  const items = S.cafe?.items || [];
  if (!items.length) return;
  $('#cafeFeed').hidden = false;
  $('#cafeMore').href = S.cafe.url || S.cfg.cafe.url;
  // 글이 많은 게시판 5개만 필터로 노출
  const cnt = {}; items.forEach(a => { cnt[a.board] = (cnt[a.board] || 0) + 1; });
  const boards = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 5);
  $('#cafeBoards').innerHTML = ['', ...boards].map(b => `<button class="chip${CF.board === b ? ' on' : ''}" data-b="${esc(b)}">${b ? esc(b) : '전체'}</button>`).join('');
  const list = items.filter(a => !CF.board || a.board === CF.board).slice(0, 8);
  $('#cafeList').innerHTML = list.map(a => `
    <li><a href="${esc(a.url)}" target="_blank" rel="noopener">
      <span class="cafe-text">
        <span class="cafe-meta"><span class="pill${/공지/.test(a.board) ? ' acc' : ''}">${esc(boardName(a.board))}</span>${a.head ? `<span class="muted">[${esc(a.head)}]</span>` : ''}</span>
        <strong>${esc(a.title)}</strong>
        <small class="muted">${esc(a.author)} · ${ago(a.time)}${a.comments ? ` · 댓글 ${a.comments}` : ''}${a.likes ? ` · 좋아요 ${a.likes}` : ''}</small>
      </span>
      ${a.thumb ? `<img src="${esc(a.thumb)}?type=w300" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
    </a></li>`).join('');
}
function initCafe() {
  renderCafe();
  $('#cafeBoards').addEventListener('click', e => {
    const b = e.target.closest('[data-b]'); if (!b) return;
    CF.board = b.dataset.b; renderCafe();
  });
}

// ───────── 모든 페이지 공통 요소 (아이콘 · 푸터 · 알림 동의 창 · 토스트) ─────────
function injectShell() {
  document.body.insertAdjacentHTML('afterbegin', `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <symbol id="i-yt" viewBox="0 0 24 24"><path fill="currentColor" d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.4-1.6.5-3.2.5-4.8s-.1-3.2-.5-4.8ZM9.8 15V9l5.7 3-5.7 3Z"/></symbol>
    <symbol id="i-chzzk" viewBox="0 0 24 24"><path fill="currentColor" d="M13.6 2 4 13.4h6.3L8.9 22l11-12.6h-6.6L13.6 2Z"/></symbol>
    <symbol id="i-cafe" viewBox="0 0 24 24"><path fill="currentColor" d="M3 5h15a3 3 0 0 1 0 6h-.6A7 7 0 0 1 10.5 18h-1A7 7 0 0 1 3 11V5Zm15 4a1 1 0 0 0 0-2v2ZM3 20h15v2H3z"/></symbol>
    <symbol id="i-discord" viewBox="0 0 24 24"><path fill="currentColor" d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9 0 13.5.3 18a19.9 19.9 0 0 0 6 3l1.3-2.1c-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.4-5.2-.8-9.7-3.8-13.6ZM8.5 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm7 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"/></symbol>
    <symbol id="i-steam" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1a11 11 0 0 0-11 10.1l5.9 2.4a3.1 3.1 0 0 1 1.9-.5l2.6-3.8v-.1a4.1 4.1 0 1 1 4.1 4.1h-.1l-3.8 2.7v.2a3.1 3.1 0 0 1-6.1.7L1.3 15A11 11 0 1 0 12 1Zm-4.1 15.8-1.3-.6a2.3 2.3 0 1 0 1.3-3.1l1.4.6a1.7 1.7 0 1 1-1.4 3.1ZM18.3 9.9a2.7 2.7 0 1 0-2.7 2.7 2.7 2.7 0 0 0 2.7-2.7Zm-4.8 0a2 2 0 1 1 2 2 2 2 0 0 1-2-2Z"/></symbol>
    <symbol id="i-bell" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/></symbol>
    <symbol id="i-search" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"/></symbol>
    <symbol id="i-arrow" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 17 17 7M8 7h9v9"/></symbol>
    <symbol id="i-left" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m15 18-6-6 6-6"/></symbol>
    <symbol id="i-right" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6"/></symbol>
    <symbol id="i-x" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M18 6 6 18M6 6l12 12"/></symbol>
    <symbol id="i-sheet" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M4 3h11l5 5v13H4zM4 10h16M4 15h16M10 10v11"/></symbol>
    <symbol id="i-sun" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g></symbol>
    <symbol id="i-moon" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></symbol>
  </svg>`);
  document.body.insertAdjacentHTML('beforeend', `
  <footer class="footer">
    <p>© 김치복 · 영상 · 방송 · 모드 정보는 유튜브, 치지직, 스팀에서 자동으로 가져옵니다.</p>
    <p class="muted" id="updatedAt"></p>
    <p><button class="link-btn" id="notifySettings">알림 설정</button></p>
  </footer>
  <dialog class="modal" id="consent">
    <form class="modal-box glass consent" method="dialog">
      <button class="icon-btn modal-x" value="cancel" aria-label="닫기"><svg><use href="#i-x"/></svg></button>
      <div class="consent-icon"><svg><use href="#i-bell"/></svg></div>
      <h3>김치복 알림 받기</h3>
      <p class="muted">받고 싶은 알림을 고르고 동의해 주세요. 언제든 이 화면에서 끌 수 있어요.</p>
      <label class="toggle"><input type="checkbox" id="optVideo" checked><span class="switch"></span><span><strong>새 영상 알림</strong><small>김치복 · 풀치복 · 음치복 새 영상이 올라오면</small></span></label>
      <label class="toggle"><input type="checkbox" id="optLive" checked><span class="switch"></span><span><strong>생방송 시작 알림</strong><small>치지직 방송이 켜지면</small></span></label>
      <label class="agree"><input type="checkbox" id="optAgree"><span>푸시 알림 수신에 동의합니다. 알림 발송을 위해 브라우저의 알림 구독 정보(기기 식별 토큰)가 알림 서비스(OneSignal)에 저장되며, 알림을 끄면 더 이상 발송되지 않습니다.</span></label>
      <p class="ios-hint" id="iosHint" hidden>📱 아이폰은 Safari 공유 버튼 → <b>홈 화면에 추가</b> 후, 홈 화면의 김치복 앱에서 알림을 켜 주세요.</p>
      <p class="consent-msg" id="consentMsg" role="status"></p>
      <div class="consent-actions">
        <button class="btn btn-ghost" type="button" id="notifyOff">알림 끄기</button>
        <button class="btn btn-accent" type="button" id="notifyOn">동의하고 알림 받기</button>
      </div>
    </form>
  </dialog>
  <div class="toast" id="toast" role="status"></div>`);
  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); }));
}

// ───────── 시작 ─────────
// 방송 상태는 Cloudflare 서버(liveApi)에서 실시간으로 받아 옴. 실패하면 data/live.json 그대로 사용
async function refreshLive() {
  const prev = S.live?.open;
  const api = S.cfg?.chzzk?.liveApi;
  const now = api ? await fetch(api, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null) : null;
  if (!now || now.error) return;
  const l = { ...(S.live || {}), ...now };
  if (!now.open) { l.viewers = null; }
  S.live = l;
  if (PAGE === 'home') { renderLive(); renderHero(); renderWeek(); }
  if (PAGE === 'schedule' && prev !== l.open) { renderCalendar(); tickNext(); }
  if (prev === false && l.open) toast('🔴 김치복 생방송이 시작됐어요!');
}
const PAGE = document.body.dataset.page || 'home';
async function main() {
  injectShell();
  initTheme();
  // 페이지마다 필요한 데이터만 불러옴
  const need = { home: ['youtube', 'live', 'schedule', 'cafe'], schedule: ['youtube', 'live', 'schedule'], mods: ['mods'], weekly: ['workshop'] }[PAGE] || [];
  const get = name => (need.includes(name) ? load(`data/${name}.json`) : null);
  [S.cfg, S.yt, S.live, S.mods, S.ws, S.sched, S.cafe] = await Promise.all([
    load('config/site.json'), get('youtube'), get('live'), get('mods'), get('workshop'), get('schedule'), get('cafe'),
  ]);
  if (!S.cfg) { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:20px">설정 파일을 불러오지 못했어요. 로컬에서는 <code>npm run dev</code>로 열어 주세요.</p>'); return; }
  if (PAGE === 'home') {
    renderHero(); renderLive();
    renderVideoTabs(); renderVideos();
    renderWeek(); initCafe(); initNav();
    setInterval(tickBoard, 1000);
    refreshLive(); setInterval(refreshLive, 60e3);
  } else if (PAGE === 'schedule') {
    initCalendar();
    refreshLive(); setInterval(refreshLive, 60e3);
  } else if (PAGE === 'mods') {
    $('#sheetLink').href = S.cfg.modSheet.url;
    initMods();
  } else if (PAGE === 'weekly') {
    $('#workshopLink').href = S.cfg.workshop.url;
    renderWeekly();
  }
  initNotify();
  const times = [S.yt, S.live, S.ws, S.mods].map(x => x?.updatedAt || 0);
  if (Math.max(...times)) $('#updatedAt').textContent = `마지막 데이터 갱신 ${new Date(Math.max(...times)).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
}
main();
