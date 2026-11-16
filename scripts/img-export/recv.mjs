import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT = 'C:/Users/bigib/Desktop/김치복 홈페이지/assets/img/game/';
http.createServer((q, r) => {
  r.setHeader('Access-Control-Allow-Origin', '*');
  if (q.method !== 'POST') { r.end('ok'); return; }
  const p = new URL(q.url, 'http://x').searchParams.get('p') || '';
  if (!/^[a-z0-9_\-\/]+\.png$/.test(p) || p.includes('..')) { r.statusCode = 400; r.end('bad'); return; }
  let b = ''; q.on('data', d => b += d); q.on('end', () => {
    const f = path.join(ROOT, p); fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, Buffer.from(b.replace(/^data:image\/png;base64,/, ''), 'base64')); r.end('saved');
  });
}).listen(5199, () => console.log('listening'));
