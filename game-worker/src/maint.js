// 2026-11-20 점검 모드 ('관리자만 접속 가능'): settings 표의 maint = {on, msg}. 15초 기억 (index.js · town.js 같이 씀)
let MAINT = { at: 0, v: { on: false, msg: '' } };
export async function maintGet(env, fresh) {
  if (!fresh && Date.now() - MAINT.at < 15e3) return MAINT.v;
  try {
    const r = await env.DB.prepare("SELECT v FROM settings WHERE k = 'maint'").first();
    const j = r ? JSON.parse(r.v) : {};
    MAINT = { at: Date.now(), v: { on: !!j.on, msg: String(j.msg || '') } };
  } catch { MAINT.at = Date.now(); }
  return MAINT.v;
}
export function maintSet(v) { MAINT = { at: Date.now(), v }; }
export const MAINT_MSG = '지금은 점검 중이에요. 잠시 뒤에 다시 들어와 주세요';
