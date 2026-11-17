// 텍스쳐 템플릿 받기: 게임 화면이 보낸 PNG를 "텍스쳐 템플릿" 폴더에 저장 (5199 포트)
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '텍스쳐 템플릿');
http.createServer((q, r) => {
  r.setHeader('Access-Control-Allow-Origin', '*');
  if (q.method !== 'POST') {   // GET /template.js → 템플릿 만드는 코드 (미리보기 서버는 scripts 폴더를 막아 둬서 여기서 줌)
    if (q.url.startsWith('/template.js')) { r.setHeader('Content-Type', 'text/javascript; charset=utf-8'); r.end(fs.readFileSync(new URL('./template.js', import.meta.url))); return; }
    r.end('ok'); return;
  }
  const p = new URL(q.url, 'http://x').searchParams.get('p') || '';
  if (!/^[a-z0-9_\-\/]+\.png$/.test(p) || p.includes('..')) { r.statusCode = 400; r.end('bad'); return; }
  let b = ''; q.on('data', d => b += d); q.on('end', () => {
    const f = path.join(ROOT, p); fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, Buffer.from(b.replace(/^data:image\/png;base64,/, ''), 'base64')); r.end('saved');
  });
}).listen(5199, () => console.log('listening'));
