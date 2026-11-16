// 치복 타운 소리: 효과음과 배경 음악을 파일 없이 코드(Web Audio)로 만들어 냄
// sfx('coin') → 효과음, bgm('town' | 'hunt' | 'raid' | null) → 배경 음악
// 설정은 이 기기에만 저장 (localStorage cbt-snd = { sfx, bgm, mute })

let A = null, master = null, sfxBus = null, bgmBus = null, noiseBuf = null;
const live = new Map(); let total = 0;   // 동시에 나는 소리 수 (너무 많이 겹치지 않게)
export const SND = (() => { let o = {}; try { o = JSON.parse(localStorage.getItem('cbt-snd')) || {}; } catch {} return { sfx: o.sfx ?? .7, bgm: o.bgm ?? .4, mute: !!o.mute }; })();
export function sndSave() {
  try { localStorage.setItem('cbt-snd', JSON.stringify(SND)); } catch {}
  if (!A) return;
  const t = A.currentTime;
  master.gain.setTargetAtTime(SND.mute ? 0 : 1, t, .03);
  sfxBus.gain.setTargetAtTime(SND.sfx, t, .03);
  bgmBus.gain.setTargetAtTime(SND.bgm * .55, t, .05);
  if (SND.bgm > 0 && !SND.mute) musicKick();
}

function init() {
  if (A) return A;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  A = new AC();
  master = A.createGain(); master.connect(A.destination);
  const comp = A.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
  sfxBus = A.createGain(); sfxBus.connect(comp);
  bgmBus = A.createGain(); bgmBus.connect(comp);
  noiseBuf = A.createBuffer(1, A.sampleRate, A.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  sndSave();
  return A;
}
// 휴대폰·브라우저는 처음 화면을 누른 뒤에야 소리가 남
export function sndUnlock() {
  const go = () => { if (!init()) return; if (A.state === 'suspended') A.resume(); musicKick(); };
  for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, go, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!A) return; if (document.hidden) A.suspend(); else A.resume(); });
}

// ───── 소리 재료 ─────
// tone: 음 하나 (f → f2로 미끄러짐). at = 몇 초 뒤, t = 길이, v = 크기, a = 처음 커지는 시간
function tone(o, bus = sfxBus) {
  const t0 = A.currentTime + (o.at || 0), t = o.t || .1, v = (o.v ?? .3);
  const os = A.createOscillator(), g = A.createGain();
  os.type = o.type || 'sine'; os.frequency.setValueAtTime(o.f, t0);
  if (o.f2) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + t);
  if (o.det) os.detune.value = o.det;
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + (o.a ?? .005));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  let out = g;
  if (o.lp) { const fl = A.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; g.connect(fl); out = fl; }
  os.connect(g); out.connect(bus); os.start(t0); os.stop(t0 + t + .02);
}
// noise: 쉬익·탁 소리 (필터로 높낮이)
function noise(o, bus = sfxBus) {
  const t0 = A.currentTime + (o.at || 0), t = o.t || .1, v = (o.v ?? .3);
  const s = A.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const fl = A.createBiquadFilter(); fl.type = o.ft || 'bandpass'; fl.Q.value = o.q ?? 1;
  fl.frequency.setValueAtTime(o.f || 1000, t0); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t0 + t);
  const g = A.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + (o.a ?? .004)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  s.connect(fl); fl.connect(g); g.connect(bus); s.start(t0, Math.random() * .5); s.stop(t0 + t + .02);
}
const N = n => 440 * Math.pow(2, (n - 69) / 12);   // 음 번호 → 주파수 (60 = 가운데 도)
const arp = (notes, step, o = {}) => notes.forEach((n, i) => tone({ type: 'triangle', t: .16, v: .22, ...o, f: N(n), at: (o.at || 0) + i * step }));

// ───── 효과음 목록 ─────  r = 높낮이를 살짝 흔드는 값 (같은 소리가 똑같이 안 들리게)
const FX = {
  click: r => tone({ type: 'triangle', f: 720 * r, f2: 540 * r, t: .05, v: .16 }),
  open: r => { tone({ f: 520 * r, t: .07, v: .14 }); tone({ f: 780 * r, t: .1, v: .14, at: .05 }); },
  close: r => { tone({ f: 700 * r, t: .06, v: .12 }); tone({ f: 470 * r, t: .09, v: .12, at: .04 }); },
  error: () => { tone({ type: 'square', f: 220, f2: 160, t: .16, v: .07, lp: 1400 }); tone({ type: 'square', f: 180, f2: 130, t: .18, v: .07, lp: 1400, at: .09 }); },
  coin: r => { tone({ type: 'square', f: 988 * r, t: .07, v: .08, lp: 5000 }); tone({ type: 'square', f: 1319 * r, t: .22, v: .08, lp: 5000, at: .06 }); },
  buy: r => { FX.coin(r); tone({ type: 'triangle', f: 1568 * r, t: .25, v: .12, at: .14 }); },
  levelup: () => { arp([72, 76, 79, 84], .08, { v: .2, t: .22 }); arp([79, 84, 88], .06, { type: 'sine', v: .12, at: .36, t: .4 }); noise({ ft: 'highpass', f: 6000, t: .5, v: .05, at: .3 }); },
  gacha: () => { for (let i = 0; i < 7; i++) tone({ type: 'triangle', f: N(64 + i * 2), t: .07, v: .12, at: i * .055 }); noise({ ft: 'highpass', f: 3000, f2: 9000, t: .4, v: .04 }); },
  // 뽑기 결과: g = 등급 번호 (0 빈약 ~ 6 신화) → 좋을수록 화려하게
  reveal: (r, g = 0) => { const top = [60, 64, 67, 72, 76, 79, 84].slice(0, 2 + Math.min(5, g)); arp(top, .07, { v: .16 + g * .015 }); if (g >= 4) { noise({ ft: 'highpass', f: 5000, t: .7, v: .06, at: .1 }); tone({ type: 'sine', f: N(96), t: .6, v: .06, at: .2 }); } },
  hit: r => { noise({ f: 1400 * r, q: .8, t: .06, v: .3 }); tone({ type: 'triangle', f: 170 * r, f2: 80, t: .09, v: .3 }); },
  crit: r => { noise({ f: 2600 * r, q: .6, t: .09, v: .34 }); tone({ type: 'square', f: 240 * r, f2: 70, t: .14, v: .14, lp: 2400 }); tone({ f: 1800 * r, f2: 900, t: .1, v: .08 }); },
  magic: r => { tone({ f: 620 * r, f2: 1400 * r, t: .16, v: .12 }); tone({ type: 'triangle', f: 930 * r, f2: 2100 * r, t: .14, v: .06, at: .02 }); },
  arrow: r => { noise({ ft: 'highpass', f: 2500 * r, f2: 5000, t: .12, v: .12 }); tone({ type: 'triangle', f: 500 * r, f2: 300, t: .05, v: .08 }); },
  hurt: r => { tone({ type: 'square', f: 320 * r, f2: 130, t: .13, v: .08, lp: 1800 }); noise({ f: 600, t: .07, v: .12 }); },
  kill: r => { tone({ f: 640 * r, f2: 180, t: .16, v: .18 }); noise({ ft: 'lowpass', f: 1500, t: .12, v: .15 }); tone({ type: 'triangle', f: 1046 * r, t: .1, v: .07, at: .1 }); },
  die: () => { tone({ type: 'triangle', f: 440, f2: 110, t: .7, v: .2 }); tone({ type: 'triangle', f: 330, f2: 82, t: .8, v: .14, at: .15 }); },
  skill: r => { tone({ type: 'sawtooth', f: 300 * r, f2: 900 * r, t: .22, v: .06, lp: 2500 }); noise({ ft: 'highpass', f: 2000, f2: 7000, t: .25, v: .07 }); },
  chop: r => { noise({ ft: 'lowpass', f: 900 * r, q: 1.5, t: .08, v: .4 }); tone({ type: 'triangle', f: 210 * r, f2: 120, t: .08, v: .25 }); },
  mine: r => { tone({ type: 'square', f: 1500 * r, t: .05, v: .06, lp: 6000 }); tone({ f: 2300 * r, t: .16, v: .07, at: .005 }); noise({ ft: 'highpass', f: 3500, t: .05, v: .16 }); },
  splash: r => { noise({ ft: 'lowpass', f: 2600 * r, f2: 350, t: .4, v: .3 }); noise({ ft: 'highpass', f: 4000, t: .15, v: .06, at: .02 }); },
  cast: r => { noise({ ft: 'highpass', f: 1500 * r, f2: 4000, t: .2, v: .1 }); FX.splash(r * 1.2); },
  bite: r => { tone({ f: 900 * r, t: .05, v: .14 }); tone({ f: 900 * r, t: .05, v: .14, at: .09 }); },
  catch: () => { FX.splash(1.1); arp([67, 72, 76, 79], .07, { v: .17, at: .1 }); },
  plant: r => { noise({ ft: 'lowpass', f: 700 * r, t: .12, v: .22 }); tone({ f: 330 * r, f2: 420 * r, t: .1, v: .1, at: .05 }); },
  water: r => { for (let i = 0; i < 4; i++) noise({ f: 2600 * r + i * 300, q: 4, t: .08, v: .1, at: i * .06 }); },
  harvest: r => { tone({ f: 500 * r, f2: 900 * r, t: .08, v: .15 }); FX.coin(r * .9); },
  hammer: r => { tone({ type: 'square', f: 1900 * r, t: .03, v: .07, lp: 7000 }); tone({ f: 2800 * r, t: .25, v: .06 }); noise({ ft: 'highpass', f: 4000, t: .05, v: .2 }); },
  enhOk: () => { arp([72, 76, 79, 84, 88], .06, { v: .17 }); noise({ ft: 'highpass', f: 6000, t: .5, v: .05, at: .2 }); },
  enhFail: () => { tone({ type: 'triangle', f: 392, t: .18, v: .17 }); tone({ type: 'triangle', f: 311, t: .3, v: .17, at: .16 }); },
  pop: r => tone({ f: 420 * r, f2: 980 * r, t: .08, v: .12 }),
  chat: r => tone({ f: 1250 * r, t: .04, v: .05 }),
  door: r => { noise({ ft: 'lowpass', f: 500, t: .1, v: .2 }); tone({ type: 'triangle', f: 160 * r, f2: 110, t: .12, v: .15 }); },
  build: r => { FX.hammer(r); FX.hammer(r * .95); setTimeout(() => FX.hammer(r * 1.05), 160); setTimeout(() => FX.enhOk(), 380); },
  warp: r => { tone({ f: 200 * r, f2: 1200 * r, t: .3, v: .1 }); noise({ ft: 'bandpass', f: 600, f2: 3000, t: .3, v: .08 }); },
  alarm: () => { for (let i = 0; i < 2; i++) { tone({ type: 'sawtooth', f: N(57), t: .35, v: .07, lp: 1800, at: i * .42, a: .03 }); tone({ type: 'sawtooth', f: N(64), t: .35, v: .06, lp: 1800, at: i * .42, a: .03 }); } },
  roar: () => { noise({ ft: 'lowpass', f: 600, f2: 180, t: 1.1, v: .45, a: .08 }); tone({ type: 'sawtooth', f: 95, f2: 55, t: 1.1, v: .14, lp: 700, a: .08 }); },
  fire: r => noise({ ft: 'lowpass', f: 1800 * r, f2: 300, t: .7, v: .3, a: .05 }),
  boom: r => { noise({ ft: 'lowpass', f: 900 * r, f2: 120, t: .6, v: .45 }); tone({ f: 90 * r, f2: 40, t: .5, v: .3 }); },
  win: () => { arp([67, 72, 76, 79, 84], .09, { v: .2, t: .3 }); arp([72, 76, 79], 0, { type: 'sine', v: .1, at: .5, t: .9 }); },
};
const LIMIT = { chat: 2, hit: 4, coin: 3 };
// 효과음 내기. 같은 소리는 동시에 3개까지, 모두 합쳐 14개까지
export function sfx(k, arg) {
  if (SND.mute || SND.sfx <= 0 || !FX[k] || !A || A.state !== 'running') return;
  const n = live.get(k) || 0; if (n >= (LIMIT[k] || 3) || total >= 14) return;
  live.set(k, n + 1); total++;
  setTimeout(() => { live.set(k, Math.max(0, (live.get(k) || 1) - 1)); total = Math.max(0, total - 1); }, 140);
  try { FX[k](0.92 + Math.random() * .16, arg); } catch {}
}

// ───── 배경 음악: 8마디짜리 노래를 코드로 반복 (마을 / 사냥터 / 레이드) ─────
const SONGS = {
  town: { bpm: 92, root: 60, prog: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]], scale: [0, 2, 4, 7, 9, 12, 14, 16], lead: 'triangle', rest: .35, bass: 'sine', pad: .045, seed: 7 },
  hunt: { bpm: 118, root: 57, prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], scale: [0, 2, 3, 5, 7, 10, 12, 15], lead: 'square', rest: .3, bass: 'triangle', pad: .03, seed: 3, drum: 1 },
  raid: { bpm: 136, root: 50, prog: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 2, 5]], scale: [0, 1, 3, 5, 7, 8, 12, 13], lead: 'sawtooth', rest: .25, bass: 'sawtooth', pad: .025, seed: 11, drum: 2 },
};
const M = { mode: null, want: null, timer: null, next: 0, step: 0 };
const rnd = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);
function noteAt(song, bar, i) {   // 정해진 규칙으로 멜로디를 만듦 (같은 노래는 늘 같게)
  const r = rnd(song.seed * 1000 + (bar % 8) * 31 + i * 7 + 1); r();
  if (r() < song.rest && i % 2) return null;
  const ch = song.prog[Math.floor(bar / 2) % song.prog.length];
  return song.root + 12 + (i % 4 === 0 ? ch[Math.floor(r() * 3)] : song.scale[Math.floor(r() * song.scale.length)]);
}
function schedule() {
  const s = SONGS[M.mode]; if (!s || !A) return;
  const eighth = 60 / s.bpm / 2;
  while (M.next < A.currentTime + .4) {
    const at = M.next - A.currentTime, bar = Math.floor(M.step / 8), i = M.step % 8, ch = s.prog[Math.floor(bar / 2) % s.prog.length];
    const o = { at: Math.max(0, at) };
    // 멜로디
    const n = noteAt(s, bar, i); if (n != null) tone({ ...o, type: s.lead, f: N(n), t: eighth * 1.6, v: s.lead === 'triangle' ? .09 : .035, lp: 2600, a: .01 }, bgmBus);
    // 베이스 (1·3박)
    if (i % 4 === 0) tone({ ...o, type: s.bass, f: N(s.root - 12 + ch[0]), t: eighth * 3.5, v: s.bass === 'sine' ? .16 : .06, lp: 600, a: .01 }, bgmBus);
    // 화음 (마디 처음)
    if (i === 0) for (const c of ch) tone({ ...o, type: 'sine', f: N(s.root + c), t: eighth * 8, v: s.pad, a: .25 }, bgmBus);
    // 북
    if (s.drum) { if (i % 4 === 0) tone({ ...o, f: 110, f2: 45, t: .14, v: .2 }, bgmBus); if (i % 4 === 2 && s.drum > 1) noise({ ...o, f: 1800, t: .08, v: .07 }, bgmBus); if (i % 2) noise({ ...o, ft: 'highpass', f: 7000, t: .03, v: .025 }, bgmBus); }
    M.next += eighth; M.step++;
  }
}
function musicKick() {
  if (!A || A.state !== 'running') return;
  const want = SND.mute || SND.bgm <= 0 ? null : M.want;
  if (want === M.mode && (M.timer || !want)) return;
  clearInterval(M.timer); M.timer = null; M.mode = want;
  if (!want) return;
  M.step = 0; M.next = A.currentTime + .15; M.timer = setInterval(schedule, 120); schedule();
}
// 배경 음악 바꾸기 (null = 끔)
export function bgm(mode) { M.want = mode; musicKick(); }
// 지금 소리 상태 (확인용): 'running'이면 소리가 남
export const sndState = () => ({ ctx: A?.state || 'none', music: M.mode, playing: total });
