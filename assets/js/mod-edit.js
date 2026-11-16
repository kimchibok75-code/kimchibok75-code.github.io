// 모드 추천 — 순서 편집 (김치복 관리자 계정만)
// 로그인은 치복 타운과 같은 계정·같은 토큰(cbt-token)을 씀. 저장은 게임 서버(D1 mod_order)에, 사이트는 그걸 바로 읽음
// 드래그: SortableJS (편집을 켤 때만 불러옴)
const API = (location.hostname === 'localhost' && new URLSearchParams(location.search).get('api')) || 'https://kimchibok-game.kimchibok.workers.dev';
const SORTABLE = 'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.6/Sortable.min.js';

const tok = {
  get: () => { try { return localStorage.getItem('cbt-token') || sessionStorage.getItem('cbt-token'); } catch { return null; } },
  set: (v, keep) => { try { (keep ? localStorage : sessionStorage).setItem('cbt-token', v); } catch {} },
  del: () => { try { localStorage.removeItem('cbt-token'); sessionStorage.removeItem('cbt-token'); } catch {} },
};
async function api(path, body) {
  const t = tok.get();
  let r;
  try { r = await fetch(API + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw new Error('서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요'); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && t) tok.del();
  if (!r.ok) throw Object.assign(new Error(j.error || `문제가 생겼어요 (${r.status})`), { status: r.status });
  return j;
}
let sortableP;
const loadSortable = () => sortableP ||= new Promise((ok, no) => {
  if (window.Sortable) return ok(window.Sortable);
  const s = document.createElement('script'); s.src = SORTABLE; s.onload = () => ok(window.Sortable); s.onerror = () => { sortableP = null; no(new Error('드래그 기능을 불러오지 못했어요')); };
  document.head.append(s);
});

export function initModEdit(x) {
  const { S, M, $, esc, toast, renderMods, renderModFilters } = x;
  const page = $('.page-top');
  page.insertAdjacentHTML('beforeend', `
    <div class="ed-entry"><button class="btn btn-ghost btn-sm" id="edOpen" hidden>✏️ 추천 순서 편집</button></div>
    <dialog class="modal ed-login" id="edLogin"><form method="dialog" class="modal-box glass">
      <h3>관리자 로그인</h3>
      <p class="muted">치복 타운과 같은 닉네임·비밀번호예요</p>
      <label>닉네임<input id="edNick" autocomplete="username" required></label>
      <label>비밀번호<input id="edPw" type="password" autocomplete="current-password" required></label>
      <label class="ed-keep"><input type="checkbox" id="edKeep" checked> 이 기기에서 30일 동안 로그인 유지</label>
      <p class="ed-err" id="edErr"></p>
      <div class="ed-btns"><button class="btn btn-ghost" value="cancel" formnovalidate>닫기</button><button class="btn btn-accent" id="edGo" value="go">로그인</button></div>
    </form></dialog>`);
  const bar = document.createElement('div');
  bar.className = 'ed-bar glass'; bar.hidden = true;
  bar.innerHTML = `<span class="ed-what"><b>순서 편집 중</b> <span class="muted" id="edCat"></span></span>
    <span class="ed-tip muted">⠿ 손잡이를 끌어서 옮겨요 · 소분류 묶음을 옮길 땐 '소분류만 보기'</span>
    <span class="ed-acts"><button class="btn btn-ghost btn-sm" id="edFold" aria-pressed="false">소분류만 보기</button><button class="btn btn-ghost btn-sm" id="edCancel">취소</button><button class="btn btn-accent btn-sm" id="edSave">저장</button></span>`;
  $('#modCats').before(bar);

  const E = { on: false, dirty: false, sorts: [] };
  M.editor = null;

  async function check() {
    if (!tok.get()) return false;
    try { const me = await api('/api/whoami'); $('#edOpen').hidden = !me.admin; return me.admin; }
    catch { $('#edOpen').hidden = true; return false; }
  }
  function login() {
    const d = $('#edLogin'); $('#edErr').textContent = ''; d.showModal();
    $('#edGo').onclick = async e => {
      e.preventDefault();
      const nick = $('#edNick').value.trim(), pw = $('#edPw').value;
      if (!nick || !pw) { $('#edErr').textContent = '닉네임과 비밀번호를 넣어 주세요'; return; }
      $('#edGo').disabled = true;
      try {
        const j = await api('/api/login', { nick, pw, keep: $('#edKeep').checked });
        tok.set(j.token, $('#edKeep').checked); $('#edPw').value = '';
        if (!(await check())) { $('#edErr').textContent = '관리자 계정이 아니에요'; return; }
        d.close(); start();
      } catch (err) { $('#edErr').textContent = err.message; }
      finally { $('#edGo').disabled = false; }
    };
  }

  // 지금 대분류의 모드를 소분류별로 (필터·검색과 상관없이 전부)
  function groups() {
    const items = S.mods.items.filter(m => m.category === M.cat).sort((a, b) => a.order - b.order);
    const rank = {}; for (const m of items) rank[m.section] = Math.min(rank[m.section] ?? Infinity, m.order);
    const secs = Object.keys(rank).sort((a, b) => rank[a] - rank[b]);
    return secs.map(s => ({ s, items: items.filter(m => m.section === s) }));
  }
  function render() {
    E.sorts.forEach(s => s.destroy()); E.sorts = [];
    E.dirty = false; $('#edSave').classList.remove('pulse'); $('#edFold').textContent = '소분류만 보기'; $('#edFold').setAttribute('aria-pressed', 'false');
    const cat = S.mods.categories.find(c => c.key === M.cat);
    $('#edCat').textContent = `· ${cat?.label || M.cat}`;
    const thumb = m => { const p = m.steam?.preview; return p ? `<img src="${esc(`${p}${p.includes('?') ? '&' : '?'}imw=96&imh=54&ima=fit&impolicy=Letterbox`)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''; };
    $('#modGrid').innerHTML = `<div class="ed-list" id="edList">${groups().map(g => `
      <div class="ed-sec">
        <div class="ed-h"><span class="ed-grip" title="끌어서 소분류 옮기기">⠿</span><b>${esc(g.s)}</b><small class="muted">${g.items.length}개</small></div>
        <div class="ed-items">${g.items.map(m => `
          <div class="ed-row" data-id="${esc(m.id)}"><span class="ed-grip" title="끌어서 옮기기">⠿</span><span class="ed-th">${thumb(m)}</span><span class="ed-name">${esc(m.name)}</span></div>`).join('')}
        </div>
      </div>`).join('')}</div>`;
    $('#modMore').hidden = true;
    const mark = () => { E.dirty = true; $('#edSave').classList.add('pulse'); };
    const opt = { handle: '.ed-grip', animation: 160, forceFallback: true, fallbackTolerance: 3, fallbackClass: 'ed-drag', ghostClass: 'ed-ghost', chosenClass: 'ed-chosen', onEnd: e => { if (e.oldIndex !== e.newIndex) mark(); } };
    E.sorts.push(new window.Sortable($('#edList'), { ...opt, draggable: '.ed-sec', handle: '.ed-h .ed-grip' }));
    document.querySelectorAll('#edList .ed-items').forEach((el, i) => E.sorts.push(new window.Sortable(el, { ...opt, draggable: '.ed-row', group: `sec${i}` })));
  }

  async function start() {
    try { await loadSortable(); } catch (e) { toast(e.message); return; }
    if (!M.cat) M.cat = S.mods.categories[0]?.key || '';
    M.section = ''; M.q = ''; M.version = ''; M.sort = 'order';
    $('#modSearch').value = ''; $('#modSort').value = 'order';
    document.querySelectorAll('#modVersion button').forEach(b => b.classList.toggle('on', !b.dataset.v));
    E.on = true; E.dirty = false; M.editor = E;
    page.classList.add('editing'); bar.hidden = false; $('#edOpen').hidden = true;
    renderModFilters(); render();
    bar.scrollIntoView({ block: 'nearest' });
  }
  function stop() {
    E.sorts.forEach(s => s.destroy()); E.sorts = [];
    E.on = false; E.dirty = false; M.editor = null;
    page.classList.remove('editing'); bar.hidden = true; $('#edOpen').hidden = false; $('#edSave').classList.remove('pulse');
    renderModFilters(); renderMods();
  }
  E.render = render;
  E.leave = () => !E.dirty || confirm('저장하지 않은 순서가 있어요. 버리고 넘어갈까요?');

  $('#edOpen').onclick = start;
  $('#edCancel').onclick = () => { if (E.leave()) stop(); };
  $('#edFold').onclick = () => { const on = $('#edList')?.classList.toggle('folded'); $('#edFold').setAttribute('aria-pressed', !!on); $('#edFold').textContent = on ? '모두 펼치기' : '소분류만 보기'; };
  $('#edSave').onclick = async () => {
    if (!E.dirty) { stop(); return; }
    const ids = [...document.querySelectorAll('#edList .ed-row')].map(r => r.dataset.id);
    const btn = $('#edSave'); btn.disabled = true; btn.textContent = '저장 중…';
    try {
      const j = await api('/api/admin/mods-order', { cat: M.cat, ids });
      const pos = new Map(ids.map((id, i) => [id, i]));
      for (const m of S.mods.items) if (m.category === M.cat && pos.has(m.id)) m.order = pos.get(m.id);
      stop();
      toast('저장했어요. 다른 사람에게도 바로 보여요');
    } catch (e) {
      if (e.status === 401) { toast('로그인이 끝났어요. 다시 로그인해 주세요'); login(); }
      else toast(e.message);
    } finally { btn.disabled = false; btn.textContent = '저장'; }
  };
  addEventListener('beforeunload', e => { if (E.on && E.dirty) e.preventDefault(); });

  check().then(admin => { if (!admin && new URLSearchParams(location.search).has('edit')) login(); });
}
