window.__export = async () => {
  const out = [], bad = [], SRV = 'http://localhost:5199/save?p=';
  const save = async (p, c) => { try { if (!c || !c.width) { bad.push(p); return; } await fetch(SRV + encodeURIComponent(p), { method: 'POST', body: c.toDataURL('image/png') }); out.push(p); } catch (e) { bad.push(p + ' ' + e.message); } };
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const blank = (w, h, k = 2) => { const c = document.createElement('canvas'); c.width = Math.ceil(w * k); c.height = Math.ceil(h * k); const g = c.getContext('2d'); g.scale(k, k); return [c, g]; };
  const snap = (w, h, fn) => { const k = Math.min(2, cv.width / w, cv.height / h); const [c] = blank(w, h, k); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(k, 0, 0, k, 0, 0); try { fn(); } finally { ctx.restore(); } c.getContext('2d').drawImage(cv, 0, 0, w * k, h * k, 0, 0, w * k, h * k); return c; };
  const base = { face: '#ffe0c2', body: '#e8553a', eyes: 'dot', hat: 'none', hair: 'none', hairC: HAIR_COLORS[0], suit: '', wsk: {}, equip: {}, cls: 'sword', dir: 1, still: true, moving: false, sit: -1, swing: 0 };
  const chr = c => { const [cc, g] = blank(90, 110, 3); drawChar(g, 45, 100, { ...base, ...c }, 0, 1); return cc; };
  await save('char/base.png', chr({}));
  for (const h of HAIRS) if (h.id !== 'none') await save(`char/hair/${h.id}.png`, chr({ hair: h.id }));
  for (const [i, hc] of HAIR_COLORS.entries()) await save(`char/hair-color/short-${i + 1}.png`, chr({ hair: 'short', hairC: hc }));
  for (const h of HATS) if (h.id !== 'none') await save(`char/hat/${slug(h.id)}.png`, chr({ hat: h.id }));
  for (const e of EYE_SKINS) await save(`char/eyes/${slug(e.id)}.png`, chr({ eyes: e.id }));
  for (const s of SUITS) await save(`char/suit/${slug(s.id)}.png`, chr({ suit: s.id }));
  for (const w of WSKINS) await save(`char/weapon-skin/${w.t}-${slug(w.id)}.png`, chr({ cls: w.t, wsk: { [w.t]: w.id } }));
  const G = Object.keys(GRADES), SL = ['sword', 'bow', 'staff', 'hat', 'armor', 'shoes'];
  for (const cl of ['sword', 'bow', 'staff']) for (let st = 1; st <= 6; st++) { const eq = {}; for (const s of SL) eq[s] = { slot: s, st, g: G[3] }; await save(`char/gear/${cl}-tier${st}.png`, chr({ cls: cl, equip: eq })); }
  for (const s of SL) for (let st = 1; st <= 6; st++) { const im = new Image(); im.src = itemImg({ slot: s, st, g: G[3] }); await im.decode(); const [c, g] = blank(96, 96, 1); g.drawImage(im, 0, 0, 96, 96); await save(`item/${s}/tier${st}.png`, c); }
  for (const s of SL) for (const gr of G) { const im = new Image(); im.src = itemImg({ slot: s, st: 3, g: gr }); await im.decode(); const [c, g] = blank(96, 96, 1); g.drawImage(im, 0, 0, 96, 96); await save(`item/grade/${s}-${gr}.png`, c); }
  for (const k of Object.keys(MONS)) await save(`mon/${k}.png`, monSprite(MONS[k], false).c);
  for (const f of FIELDS) await save(`mon/boss-${f.boss.k}.png`, monSprite(f.boss, false).c);
  await save('mon/raid-dragon.png', snap(760, 640, () => drawDragon(380, 430, 0, false, 0, false)));
  await save('mon/raid-dragon-fire.png', snap(760, 640, () => drawDragon(380, 430, .4, true, 0, false)));
  for (const b of BUILDINGS) if (BLD[b.id]) await save(`build/${b.id}.png`, bSprite(b).c);
  for (let lv = 0; lv < 6; lv++) { try { await save(`build/house-lv${lv}.png`, houseSprite(0, lv).c); } catch (e) { bad.push('house' + lv + e.message); } }
  for (let r = 0; r < HOUSE.roofs.length; r++) await save(`build/house-roof${r + 1}.png`, houseSprite(r, 0).c);
  for (const k of Object.keys(SP_TREE)) await save(`nature/tree-${k}.png`, SP_TREE[k]().c);
  for (const k of Object.keys(SP_NODE)) await save(`nature/gather-${k}.png`, SP_NODE[k]().c);
  for (const cr of CROPS) { await save(`nature/crop/${cr.id}-grow.png`, snap(40, 44, () => cropPlant(20, 40, .5, cr, 0, 0))); await save(`nature/crop/${cr.id}.png`, snap(40, 44, () => cropPlant(20, 40, 1, cr, 0, 0))); }
  await save('props/fountain.png', SP_FOUNT().c); await save('props/bench.png', SP_BENCH().c); await save('props/fishing-sign.png', SP_FSIGN().c);
  await save('props/portal.png', snap(80, 100, () => { ctx.translate(40 - PORTAL.x, 92 - PORTAL.y); drawPortal(0); }));
  const GI = await import('./assets/js/game-icons.js?v=__BUILD__');
  for (const k of Object.keys(GI.ICONS)) { const im = new Image(); im.src = GI.iconUrl(k); try { await im.decode(); } catch { bad.push('icon ' + k); continue; } const [c, g] = blank(128, 128, 1); g.drawImage(im, 0, 0, 128, 128); await save(`ui/${slug(k)}.png`, c); }
  for (const f of FIELDS) await save(`bg/hunt-${f.id}.png`, paintHunt(f));
  await save('bg/raid.png', paintRaid());
  if (ground) { const [c, g] = blank(ground.width, ground.height, 1); g.drawImage(ground, 0, 0); await save('bg/town.png', c); }
  return { n: out.length, bad };
};
