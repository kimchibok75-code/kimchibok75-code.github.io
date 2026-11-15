// 금칙어 검사 (기획서 8-1 "금칙어 목록과 검사 방법")
import { BAD } from './banwords.js';

// 금칙어가 안에 들어 있어도 평범한 단어
const ALLOW = ['시바견', '시바이누', '땅따먹기', '따먹기', '사정이', '사정상', '사정을', '사정은', '사정해주', '사정해서', '사정하자면', '얼싸안', '얼싸좋', '배싸움', '속싸개', '시방서', '병진년', '꿈을좇', '좇아', '좇는', '좇던', '좇으', '보지않', '보지못', '보지마', '보지말', '자지마', '자지말', '자지않', '자지못'];
// 문맥 단어 바로 뒤/앞이 이 글자면 평범한 말 (보지 마세요, 안 보지, 해보지…)
const AMBIG_NEXT = /^[마말않못도는만요며고네나니죠지롱]/;
const AMBIG_PREV = /[안못잘해가와봐서려어아워져다]$/;

export function scanBad(text = '') {
  const chars = [...text], s = [], idx = [], wid = []; let w = 0;
  chars.forEach((ch, i) => { if (/\s/.test(ch)) { if (wid.length && wid[wid.length - 1] === w) w++; return; } if (/\p{L}/u.test(ch)) { s.push(ch.toLowerCase()); idx.push(i); wid.push(w); } });
  const str = s.join(''), first = {}, last = {};
  wid.forEach((x, k) => { if (first[x] === undefined) first[x] = k; last[x] = k; });
  const prot = new Uint8Array(s.length);
  const findAll = word => { const r = []; let k = str.indexOf(word); while (k !== -1) { r.push(k); k = str.indexOf(word, k + 1); } return r; };
  for (const a of ALLOW) for (const k of findAll(a)) for (let j = k; j < k + a.length; j++) prot[j] = 1;
  const ok = (k, len, ambig) => {
    const e = k + len - 1;
    for (let j = k; j <= e; j++) if (prot[j]) return false;
    if (wid[k] !== wid[e]) {                              // 띄어쓰기를 넘어 걸친 경우
      if (ambig) return false;
      if (first[wid[k]] !== k) return false;              // 앞 단어는 통째로 들어가야 함
      if (last[wid[e]] !== e && len < 3) return false;    // 짧은 말인데 뒷 단어가 이어지면 평범한 말
    }
    if (ambig && (AMBIG_NEXT.test(str[e + 1] || '') || AMBIG_PREV.test(str[k - 1] || ''))) return false;
    return true;
  };
  let hit = false, hard = false;
  const mask = (k, len) => { hit = true; for (let j = idx[k]; j <= idx[k + len - 1]; j++) if (!/\s/.test(chars[j])) chars[j] = '*'; };
  for (const word of BAD.hard) for (const k of findAll(word)) if (ok(k, word.length, false)) hard = true;
  for (const word of BAD.soft) for (const k of findAll(word)) if (ok(k, word.length, false)) mask(k, word.length);
  for (const word of BAD.ambig) for (const k of findAll(word)) if (ok(k, word.length, true)) mask(k, word.length);
  return { text: chars.join(''), hit: hit || hard, hard };
}
