// 치지직 채팅 → 치복 타운 (Cloudflare Durable Object, 하나만 씀)
// - 1분마다 방송 상태를 확인하고, 방송 중이면 치지직 채팅 서버에 "읽기 전용"으로 접속
// - 받은 채팅은 1초씩 모아서 마을 채널(Town)에 보냄. Town이 닉네임이 완전히 같고 광장 근처에 있는 사람의 말만 보여 줌
// - 치지직 공식 문서가 없는 방식(웹 채팅과 같은 주소)이라, 치지직이 바꾸면 안 될 수 있음 → 그래도 게임은 그대로 돌아감
import { DurableObject } from 'cloudflare:workers';
import { MAX_CH } from './town.js';

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; kimchibok-town)' };
const now = () => Date.now();

export class Chzzk extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.ws = null; this.cid = null; this.heard = 0; this.buf = []; this.flushT = null; this.busy = false; }

  async fetch(req) {   // 매 5분 크론 · 관리자 확인용
    if (new URL(req.url).pathname === '/nick') { this.nk = {}; return Response.json({ ok: true }); }   // 2026-11-20 누가 닉네임을 바꿈 → 채널별 닉네임 기억을 비워서 새 닉네임 말도 바로 이어 줌
    await this.tick();
    return Response.json({ on: !!this.ws, cid: this.cid, heard: this.heard });
  }
  async alarm() { await this.tick(); }

  async tick() {
    if (this.busy) return; this.busy = true;
    try {
      const ch = this.env.CHZZK_CHANNEL; if (!ch) return;
      let live = null;
      try { live = (await (await fetch(`https://api.chzzk.naver.com/polling/v2/channels/${ch}/live-status`, { headers: UA })).json()).content; } catch {}
      const on = live?.status === 'OPEN' && live.chatChannelId;
      if (on && (!this.ws || this.cid !== live.chatChannelId || now() - this.heard > 90e3)) await this.connect(live.chatChannelId).catch(e => console.log('chzzk connect', e.message));
      else if (live && !on) this.close();
      if (this.ws) try { this.ws.send(JSON.stringify({ ver: '2', cmd: 0 })); } catch {}   // 연결 유지
    } finally {
      this.busy = false;
      await this.ctx.storage.setAlarm(now() + (this.ws ? 20e3 : 120e3));   // 방송 중 20초, 아니면 2분마다 (2026-11-20 1분 → 2분)
    }
  }

  close() { const w = this.ws; this.ws = null; this.cid = null; if (w) try { w.close(1000, 'off'); } catch {} }

  async connect(cid) {
    this.close();
    const tk = await (await fetch(`https://comm-api.game.naver.com/nng_main/v1/chats/access-token?channelId=${cid}&chatType=STREAMING`, { headers: UA })).json();
    const acc = tk?.content?.accessToken; if (!acc) throw new Error('토큰 없음');
    const n = [...cid].reduce((a, c) => a + c.charCodeAt(0), 0) % 9 + 1;
    const r = await fetch(`https://kr-ss${n}.chat.naver.com/chat`, { headers: { Upgrade: 'websocket', ...UA } });
    const ws = r.webSocket; if (!ws) throw new Error('웹소켓 실패 ' + r.status);
    ws.accept();
    ws.addEventListener('message', e => this.onMsg(ws, e.data));
    const gone = () => { if (this.ws === ws) { this.ws = null; this.cid = null; } };
    ws.addEventListener('close', gone); ws.addEventListener('error', gone);
    this.ws = ws; this.cid = cid; this.heard = now();
    ws.send(JSON.stringify({ ver: '2', cmd: 100, svcid: 'game', cid, bdy: { uid: null, devType: 2001, accTkn: acc, auth: 'READ' }, tid: 1 }));
  }

  onMsg(ws, data) {
    if (typeof data !== 'string') return;
    let m; try { m = JSON.parse(data); } catch { return; }
    this.heard = now();
    if (m.cmd === 0) { try { ws.send(JSON.stringify({ ver: '2', cmd: 10000 })); } catch {} return; }
    if (m.cmd !== 93101 || !Array.isArray(m.bdy)) return;   // 93101 = 일반 채팅 (후원·공지 등은 안 씀)
    for (const b of m.bdy) {
      let nick = ''; try { nick = JSON.parse(b.profile || '{}').nickname || ''; } catch {}
      const text = String(b.msg ?? b.content ?? '').trim();
      if (!nick || !text || nick.length > 20) continue;
      this.buf.push({ n: nick, text: text.slice(0, 120) });
    }
    if (this.buf.length > 200) this.buf = this.buf.slice(-200);
    if (this.buf.length && !this.flushT) this.flushT = setTimeout(() => this.flush(), 3000);   // 2026-11-20 1초 → 3초씩 모아서
  }

  async flush() {
    this.flushT = null; const list = this.buf; this.buf = []; if (!list.length) return;
    // 2026-11-20 채널마다 접속한 닉네임을 기억(30초) → 그 채널에 말한 사람이 없으면 안 깨움
    const body = JSON.stringify(list), t = Date.now(), K = this.nk || (this.nk = {});
    await Promise.all(Array.from({ length: MAX_CH }, (_, i) => i + 1).map(async ch => {
      const k = K[ch]; if (k && t - k.at < 30e3 && !list.some(m => k.set.has(m.n))) return;
      try { const r = await this.env.TOWN.get(this.env.TOWN.idFromName('town-' + ch)).fetch('https://town/chzzk', { method: 'POST', body }); const j = await r.json(); K[ch] = { at: t, set: new Set(j.nicks || []) }; } catch {}
    }));
  }
}
