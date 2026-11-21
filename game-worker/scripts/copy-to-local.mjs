// 진짜 서버 데이터 일부를 이 컴퓨터의 테스트 데이터베이스로 복사 (진짜 서버는 읽기만 함)
// 실행: game-worker 폴더에서  node scripts/copy-to-local.mjs
// 복사하는 것: 김치복 · 테스트 계정 (계정, 캐릭터, 집, 낚시·농사 기록, 기부) + 마을 공동 데이터 (공동 건설, 분수)
// 이 컴퓨터의 테스트 데이터는 먼저 모두 지움
import { execSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const W = 'npx --yes wrangler@4.45.0 d1 execute kimchibok-game';
const NICKS = ['김치복', '테스트'];
const PER_USER = ['users:id', 'characters:user_id', 'houses:user_id', 'fishing:user_id', 'farming:user_id', 'village_give:user_id'];
const SHARED = ['village', 'fountain', 'fountain_win', 'mod_order'];
// 이 컴퓨터에서 비울 표 (d1_migrations, sqlite_sequence는 빼고)
const WIPE = ['sessions', 'signups', 'activity', 'chat_log', 'warnings', 'blocks', 'reports', 'login_fails', 'chronicle', 'suggestions', 'access', 'rejects', 'flags', 'growth', 'char_snap', 'settings',
  'village_give', 'houses', 'fishing', 'farming', 'characters', 'users', ...SHARED];

const remote = sql => {
  const out = execSync(`${W} --remote --json --command "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
  return JSON.parse(out.slice(out.indexOf('[')))[0].results;
};
const lit = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const ins = (t, rows) => rows.map(r => `INSERT INTO ${t} (${Object.keys(r).join(', ')}) VALUES (${Object.values(r).map(lit).join(', ')});`);

const users = remote(`SELECT id, nick FROM users WHERE nick IN (${NICKS.map(lit).join(', ')})`);
console.log('가져올 계정:', users.map(u => `${u.nick}(${u.id})`).join(', '));
const ids = users.map(u => u.id).join(', ');

const lines = WIPE.map(t => `DELETE FROM ${t};`);
for (const p of PER_USER) {
  const [t, col] = p.split(':'), rows = remote(`SELECT * FROM ${t} WHERE ${col} IN (${ids})`);
  console.log(`  ${t}: ${rows.length}줄`); lines.push(...ins(t, rows));
}
for (const t of SHARED) { const rows = remote(`SELECT * FROM ${t}`); console.log(`  ${t}: ${rows.length}줄`); lines.push(...ins(t, rows)); }

const f = join(mkdtempSync(join(tmpdir(), 'cbt-')), 'copy.sql');
writeFileSync(f, lines.join('\n'));
execSync(`${W} --local --file "${f}"`, { stdio: "ignore" });
console.log('\n끝! 이 컴퓨터의 테스트 데이터베이스에 넣었어요 (비밀번호는 진짜와 같음)');
