// 채팅 글 다듬기 (기획서 8-1 채팅 규칙). 속도·도배·경고는 town.js 에서
import { scanBad } from './filter.js';

const ALLOW_LINKS = ['youtube.com/@김치복', 'youtube.com', 'youtu.be', 'chzzk.naver.com', 'cafe.naver.com/kimchibok', 'discord.com/channels/1197441179197915136'];
const LINK_RE = /(https?:\/\/\S+|www\.\S+|\b(?:[\w-]+\.)+(com|net|kr|io|gg|me|co|org|xyz|ly)\b\S*)/ig;

// 결과: { ok, text, notes } 또는 { ok: false, why, warn }
export function cleanChat(raw) {
  let text = String(raw ?? '').replace(/\s+/g, ' ').trim();
  const notes = [];
  if (!text) return { ok: false };
  if ([...text].length > 60) return { ok: false, why: '한 번에 60글자까지 보낼 수 있어요' };
  const before = text; text = text.replace(/(.)\1{10,}/gu, (m, c) => c.repeat(10));
  if (text !== before) notes.push('반복 글자를 10개로 줄였어요');
  let link = false;
  text = text.replace(LINK_RE, m => { const u = m.toLowerCase().replace(/^https?:\/\//, '').replace(/^(www|m)\./, ''); if (ALLOW_LINKS.some(a => u === a || u.startsWith(a + '/') || u.startsWith(a + '?'))) return m; link = true; return ''; });   // 주소 맨 앞(사이트 이름)이 같아야 함
  if (link) return { ok: false, why: '인터넷 주소는 보낼 수 없어요 (김치복 공식 링크만 가능)' };
  const pi = text;
  text = text.replace(/01[016789][-. ]?\d{3,4}[-. ]?\d{4}/g, '(전화번호 가림)').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '(이메일 가림)').replace(/\d{6}[- ]?[1-4]\d{6}/g, '(주민번호 가림)');
  if (text !== pi) notes.push('개인정보처럼 보이는 글을 가렸어요');
  const r = scanBad(text);
  if (r.hard) return { ok: false, warn: true, why: '아주 심한 말은 보낼 수 없어요' };
  if (r.hit) notes.push('금지어를 가렸어요');
  return { ok: true, text: r.text, notes };
}
