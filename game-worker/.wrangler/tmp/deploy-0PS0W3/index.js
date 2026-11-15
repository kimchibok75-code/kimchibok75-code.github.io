var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../assets/js/game-rules.js
var T = 32;
var MW = 40;
var MH = 30;
var START = { x: 19.5 * T, y: 19.5 * T };
var FACES = ["#ffe0c2", "#f7c9a0", "#d9a77a", "#a8754f", "#ffd4e0", "#c9f0d2", "#d6e4ff", "#fff3b0"];
var BODIES = ["#e8553a", "#4f9d5a", "#3d7bd9", "#9a5ad6", "#e9a23b", "#2f3b4f", "#ef7fa6", "#2bb3a6"];
var EYES = ["dot", "happy", "sleep", "wow"];
var START_GOLD = 500;
var NICK_BAN = ["\uAE40\uCE58\uBCF5", "\uCE58\uBCF5", "\uAD00\uB9AC\uC790", "\uC6B4\uC601\uC790", "\uC6B4\uC601\uC9C4", "admin", "gm"];
var COMMON_PW = ["password1", "qwer1234", "abc12345", "asdf1234", "qwerty123", "1q2w3e4r", "zxcv1234", "iloveyou1", "password123", "a1234567", "1q2w3e4r5t", "qwerty1234", "asdf12345", "abcd1234", "aa123456", "qwer12345"];
function nickChecks(n = "") {
  const len = [...n].length;
  return { len: len >= 2 && len <= 10, chars: /^[가-힣a-zA-Z0-9]+$/.test(n), name: !NICK_BAN.some((b) => n.toLowerCase().includes(b)) };
}
__name(nickChecks, "nickChecks");
function pwChecks(p = "", n = "") {
  return { len: p.length >= 8 && p.length <= 64, mix: /[a-zA-Z]/.test(p) && /\d/.test(p), nick: !n || !p.toLowerCase().includes(n.toLowerCase()), common: !COMMON_PW.includes(p.toLowerCase()), repeat: !/^(.)\1*(.)\2*$/.test(p) };
}
__name(pwChecks, "pwChecks");
var allOk = /* @__PURE__ */ __name((o) => Object.values(o).every(Boolean), "allOk");
var pick = /* @__PURE__ */ __name((a) => a[Math.floor(Math.random() * a.length)], "pick");
var GRADES = { normal: { n: "\uC77C\uBC18", c: "#6f7a8a", m: 1, o: 0 }, uncommon: { n: "\uACE0\uAE09", c: "#2f8f45", m: 1.15, o: 0 }, rare: { n: "\uD76C\uADC0", c: "#2f6fd0", m: 1.3, o: 1 }, epic: { n: "\uC601\uC6C5", c: "#8a48cc", m: 1.5, o: 2 }, legend: { n: "\uC804\uC124", c: "#e0731c", m: 1.8, o: 3 } };
var TIERS = [{ n: "\uB4E4\uD310", req: 1, price: 100 }, { n: "\uC232", req: 10, price: 900 }, { n: "\uD611\uACE1", req: 25, price: 3500 }, { n: "\uACF5\uC7A5", req: 40, price: 1e4 }];
var WTYPES = { sword: { n: "\uAC80", i: "\u{1F5E1}\uFE0F", gap: 1, m: 1 }, dagger: { n: "\uB2E8\uAC80", i: "\u{1F52A}", gap: 0.7, m: 0.7 }, hammer: { n: "\uB9DD\uCE58", i: "\u{1F528}", gap: 1.5, m: 1.5 }, staff: { n: "\uC9C0\uD321\uC774", i: "\u{1FA84}", gap: 1.1, m: 0.95, sp: 1.3 } };
var STATS = { str: { n: "\uD798", i: "\u{1F4AA}", d: "\uACF5\uACA9\uB825 +2 \xB7 \uCCB4\uB825 +5" }, dex: { n: "\uBBFC\uCCA9", i: "\u{1F3C3}", d: "\uACF5\uACA9 \uC18D\uB3C4 +0.5% \xB7 \uD68C\uD53C +0.2%" }, int: { n: "\uC9C0\uB825", i: "\u{1F9E0}", d: "\uD544\uC0B4\uAE30 \uD53C\uD574 +2% \xB7 \uD655\uB960 +0.1%" }, luk: { n: "\uC6B4", i: "\u{1F340}", d: "\uCE58\uBA85\uD0C0 +0.25% \xB7 \uB4DC\uB78D\xB7\uACE8\uB4DC +0.5%" } };
var BASE = { weapon: [10, 32, 70, 120], hatDef: [2, 6, 13, 22], hatHp: [10, 30, 70, 120], armorDef: [4, 12, 26, 44], armorHp: [20, 60, 140, 240], shoesDef: [1, 4, 9, 15], shoesHp: [5, 20, 45, 80], acc: [2, 5, 9, 14] };
var PRICE_MUL = { weapon: 1, armor: 0.9, hat: 0.6, shoes: 0.5, acc: 0.8 };
var seq = 1;
var newId = /* @__PURE__ */ __name(() => globalThis.crypto?.randomUUID ? crypto.randomUUID().slice(0, 8) : `i${Date.now().toString(36)}${seq++}`, "newId");
function makeItem(slot, tier, o = {}) {
  const g = o.grade || "normal", it = { id: o.id || newId(), slot, tier, grade: g, enh: o.enh || 0, opts: [] };
  if (slot === "weapon") {
    it.wt = o.wt || "sword";
    it.atk = Math.round(BASE.weapon[tier] * WTYPES[it.wt].m);
  } else if (slot === "acc") {
    it.stat = o.stat || pick(Object.keys(STATS));
    it.val = BASE.acc[tier];
  } else {
    it.def = BASE[slot + "Def"][tier];
    it.hp = BASE[slot + "Hp"][tier];
  }
  for (let k = 0; k < GRADES[g].o; k++) it.opts.push(randOpt(tier));
  it.price = Math.round(TIERS[tier].price * PRICE_MUL[slot] * GRADES[g].m);
  return it;
}
__name(makeItem, "makeItem");
function randOpt(tier) {
  const r = Math.random();
  if (r < 0.6) return { k: pick(Object.keys(STATS)), v: (2 + Math.floor(Math.random() * 4)) * (tier + 1) };
  if (r < 0.8) return { k: "crit", v: 1 + Math.floor(Math.random() * 3) };
  return { k: "gold", v: 3 + Math.floor(Math.random() * 6) };
}
__name(randOpt, "randOpt");
var enhMul = /* @__PURE__ */ __name((it) => GRADES[it.grade].m * (1 + it.enh * 0.08), "enhMul");
function derive(c) {
  const b = { str: 0, dex: 0, int: 0, luk: 0, crit: 0, gold: 0 };
  let def = 0, hp = 0;
  for (const it of Object.values(c.equip || {})) {
    if (!it) continue;
    const m = enhMul(it);
    if (it.slot === "acc") b[it.stat] += Math.round(it.val * m);
    else if (it.slot !== "weapon") {
      def += it.def * m;
      hp += it.hp * m;
    }
    it.opts.forEach((o) => b[o.k] += o.v);
  }
  const str = c.str + b.str, dex = c.dex + b.dex, int = c.int + b.int, luk = c.luk + b.luk, w = c.equip?.weapon, wt = WTYPES[w?.wt || "sword"];
  return {
    b,
    str,
    dex,
    int,
    luk,
    atk: Math.round((w ? w.atk * enhMul(w) : 3) + str * 2 + c.lv),
    def: Math.round(def),
    maxHp: Math.round(100 + c.lv * 20 + str * 5 + hp),
    gap: wt.gap / Math.min(2, 1 + dex * 5e-3),
    crit: Math.min(60, 5 + luk * 0.25 + b.crit),
    eva: Math.min(40, dex * 0.2),
    sp: 5 + int * 0.1,
    spMul: (2 + int * 0.02) * (wt.sp || 1),
    goldB: luk * 0.5 + b.gold,
    dropB: luk * 0.5
  };
}
__name(derive, "derive");
function newCharacter() {
  const c = {
    face: FACES[0],
    body: BODIES[0],
    eyes: "dot",
    hat: "none",
    intro: "",
    title: "\u{1F3F7}\uFE0F \uC0C8\uB0B4\uAE30 \uC8FC\uBBFC",
    x: START.x,
    y: START.y,
    lv: 1,
    exp: 0,
    gold: START_GOLD,
    str: 5,
    dex: 5,
    int: 5,
    luk: 5,
    points: 0,
    equip: { weapon: makeItem("weapon", 0, { wt: "sword" }), hat: null, armor: null, shoes: null, acc: null },
    bag: [],
    hats: ["none"],
    pots: { s: 5, l: 0, xl: 0 },
    potAt: 40
  };
  c.hp = derive(c).maxHp;
  return c;
}
__name(newCharacter, "newCharacter");

// src/banwords.js
var BAD = { "soft": ["\uC528\uBC1C", "\uC2DC\uBC1C", "\uC26C\uBC1C", "\uC2C0\uBC1C", "\uC4F0\uBC1C", "\uC2A4\uBC1C", "\uC4B8\uBC1C", "\uC4D4\uBC1C", "\uC288\uBC1C", "\uC464\uBC1C", "\uC448\uBC1C", "\uC528\uBC14", "\uC26C\uBC14", "\uC2C0\uBC14", "\uC4F0\uBC14", "\uC288\uBC14", "\uC4B8\uBC14", "\uC528\uBE68", "\uC2DC\uBE68", "\uC26C\uBE68", "\uC2C0\uBE68", "\uC4F0\uBE68", "\uC2A4\uBE68", "\uC4B8\uBE68", "\uC4D4\uBE68", "\uC288\uBE68", "\uC464\uBE68", "\uC528\uBC8C", "\uC2DC\uBC8C", "\uC26C\uBC8C", "\uC2C0\uBC8C", "\uC4F0\uBC8C", "\uC2A4\uBC8C", "\uC288\uBC8C", "\uC4B8\uBC8C", "\uC528\uD384", "\uC2DC\uD384", "\uC26C\uD384", "\uC4F0\uD384", "\uC2A4\uD384", "\uC288\uD384", "\uC528\uD314", "\uC2DC\uD314", "\uC26C\uD314", "\uC4F0\uD314", "\uC2A4\uD314", "\uC288\uD314", "\uC4B8\uD314", "\uC528\uBED8", "\uC2DC\uBED8", "\uC26C\uBED8", "\uC528\uBDA4", "\uC2DC\uBDA4", "\uC528\uBD80\uB784", "\uC2DC\uBD80\uB784", "\uC528\uBD80\uB7F4", "\uC2DC\uBD80\uB7F4", "\uC528\uBD80\uB808", "\uC2DC\uBD80\uB808", "\uC528\uBD80\uB801", "\uC2DC\uBD80\uB801", "\uC528\uBD80\uC5C9", "\uC2DC\uBD80\uC5C9", "\uC528\uBD80\uB9AC", "\uC2DC\uBD80\uB9AC", "\uC26C\uBC29", "\uC4F0\uBC29", "\uC4B8\uBC29", "\uC528\uBD09", "\uC26C\uBD09", "\uC528\uBC1C\uB828", "\uC2DC\uBC1C\uB828", "\uC528\uBC1C\uB188", "\uC2DC\uBC1C\uB188", "\uC528\uBC1C\uB144", "\uC2DC\uBC1C\uB144", "\uC528\uBC1C\uC0C8\uB07C", "\uC2DC\uBC1C\uC0C8\uB07C", "\uC528\uBC1C\uB7FC", "\uC2DC\uBC1C\uB7FC", "\uC528\uBC1C\uB86C", "\uC2DC\uBC1C\uB86C", "\uC528\uBC1C\uAC83", "\uC2DC\uBC1C\uAC83", "\uC528\uBC1C\uAEBC", "\uC2DC\uBC1C\uAEBC", "\uC528\uBC14\uC0C8\uB07C", "\uC2DC\uBC14\uC0C8\uB07C", "\uC2DC\uBC8C\uD0F1", "\uC528\uBC8C\uD0F1", "\uC2DC\uBD80\uB784\uD0F1", "\uC528\uBD80\uB784\uD0F1", "\uC2DC\uD314\uD0F1", "\uC528\uD314\uD0F1", "\uC528\uBC1C\uD0F1", "\uC528\uBC1C\uD0F1\uC774", "\uC2DC\uBC1C\uD0F1\uC774", "\uC2DC\uBC1C\uB118", "\uC528\uBC1C\uB118", "\uC2DC\uBC8C\uB118", "\uC528\uBC8C\uB118", "\uC539\uBC1C", "\uC539\uBC8C", "\uC539\uD314", "\uC539\uD384", "\uC539\uBC14", "\uC539\uBE68", "\uC528\uC774\uBC1C", "\uC2DC\uC774\uBC1C", "\uC528\uC774\uC774\uBC1C", "\uC2DC\uC774\uC774\uBC1C", "\uC528\uBC54", "\uC2DC\uBC54", "\uC528\uBEA0", "\uC2DC\uBEA0", "\uC528\uBF48", "\uC2DC\uBF48", "\uC2DC\uBD80\uB784\uB188", "\uC528\uBD80\uB784\uB188", "\uAC1C\uC0C8\uB07C", "\uAC1C\uC0C9\uAE30", "\uAC1C\uC0C9\uB07C", "\uAC1C\uC138\uB07C", "\uAC1C\uC138\uD0A4", "\uAC1C\uC250\uB07C", "\uAC1C\uC250\uD0A4", "\uAC1C\uC251\uB07C", "\uAC1C\uC2DC\uB07C", "\uAC1C\uC250\uB9AC", "\uAC1C\uC314\uB07C", "\uAC1C\uC314\uD0A4", "\uAC1C\uC0DB\uAE30", "\uAC1C\uC0DB\uB07C", "\uAC1C\uC7A1\uB188", "\uAC1C\uC7A1\uB144", "\uAC1C\uC886", "\uAC1C\uC528\uBC1C", "\uAC1C\uC2DC\uBC1C", "\uAC1C\uC539", "\uAC1C\uBCD1\uC2E0", "\uAC1C\uBE05\uC2E0", "\uAC1C\uBE59\uC2E0", "\uAC1C\uC30D\uB188", "\uAC1C\uC30D\uB144", "\uAC1C\uC0C8\uAE84", "\uAC1C\uC0C8\uCEAC", "\uBCD1\uC2E0", "\uBE05\uC2E0", "\uBE59\uC2E0", "\uBC45\uC2E0", "\uBCB5\uC2E0", "\uBD79\uC2E0", "\uBFC5\uC2E0", "\uBD95\uC2E0", "\uBF1D\uC2E0", "\uBCD1\uC52C", "\uBE05\uC52C", "\uBE59\uC52C", "\uBCD1\uC2C4", "\uBCD1\uC2DC\uB098", "\uBCD1\uC2DC\uB2C8", "\uBCD1\uC270", "\uBE05\uC270", "\uBE59\uC270", "\uBE05\uC9C4", "\uBE59\uC9C4", "\uBCD1\uB531", "\uBE05\uB531", "\uBE59\uB531", "\uBCD1\uC2DC\uC774\uC778", "\uBCD1\uC2DC\uC778", "\uBCD1\uC2DC\uB2C8\uAE50", "\uBCD1\uC2E0\uC0C8\uB07C", "\uBE05\uC2E0\uC0C8\uB07C", "\uBE59\uC2E0\uC0C8\uB07C", "\uBCD1\uC2E0\uB144", "\uBE05\uC2E0\uB144", "\uBE59\uC2E0\uB144", "\uBCD1\uC2E0\uB188", "\uBE05\uC2E0\uB188", "\uBE59\uC2E0\uB188", "\uBCD1\uC2E0\uB828", "\uBE05\uC2E0\uB828", "\uBE59\uC2E0\uB828", "\uC886", "\uC883", "\uC877", "\uC8F6", "\uC8F3", "\uC889", "\uC88A", "\uC89D", "\uC89F", "\uC886\uB098", "\uC883\uB098", "\uC874\uB098", "\uC83C\uB098", "\uC83C\uB2C8", "\uC874\uB2C8", "\uC874\uB0B4", "\uC874\uB204", "\uC886\uAC19", "\uC883\uAC19", "\uC887\uAC19", "\uC877\uAC19", "\uC886\uAC00\uD2BC", "\uC883\uAC00\uD2BC", "\uC886\uAC00\uD0C0", "\uC883\uAC00\uD0C0", "\uC886\uAC19\uC544", "\uC886\uAC19\uB124", "\uC886\uAC19\uB2E4", "\uC886\uAC19\uC74C", "\uC886\uAC19\uC740", "\uC886\uAC19\uC774", "\uC886\uAE4C", "\uC883\uAE4C", "\uC886\uAE4C\uB77C", "\uC883\uAE4C\uB77C", "\uC886\uAE4C\uACE0", "\uC886\uAE4C\uB124", "\uC886\uAE4C\uB294", "\uC886\uAE4C\uC138\uC694", "\uC886\uAE4C\uC148", "\uC886\uAE4C\uB834", "\uC886\uB9DD", "\uC883\uB9DD", "\uC886\uB9DD\uAC9C", "\uC886\uBC25", "\uC883\uBC25", "\uC886\uBE71", "\uC883\uBE71", "\uC886\uB098\uAC8C", "\uC886\uB098\uB9AC", "\uC886\uB3C4", "\uC883\uB3C4", "\uC886\uB9CC", "\uC883\uB9CC", "\uC886\uB9CC\uD55C", "\uC886\uB9CC\uC774", "\uC886\uB9CC\uC544", "\uC886\uC0C8\uB07C", "\uC886\uAC19\uC740\uC0C8\uB07C", "\uC886\uAC19\uC740\uB188", "\uC886\uAC19\uC740\uB144", "\uC886\uD138", "\uC886\uBB3C", "\uC886\uB300\uAC00\uB9AC", "\uC886\uC7A1\uACE0", "\uC886\uBE60", "\uC886\uBE60\uB294", "\uC886\uBC15", "\uC539\uC0C8\uB07C", "\uC539\uC0C9\uB07C", "\uC539\uC0C9\uAE30", "\uC539\uC138\uB07C", "\uC539\uC138\uD0A4", "\uC539\uC250\uB07C", "\uC539\uC250\uD0A4", "\uC539\uC314\uB07C", "\uC539\uC314\uD0A4", "\uC539\uB144", "\uC539\uB188", "\uC539\uB118", "\uC539\uB828", "\uC539\uB7FC", "\uC539\uB86C", "\uC539\uCC3D", "\uC539\uCC3D\uB0A8", "\uC539\uCC3D\uB0AC\uB2E4", "\uC539\uCC3D\uB0AC\uB124", "\uC539\uAE4C", "\uC539\uAE4C\uB77C", "\uC539\uAC19\uB124", "\uC539\uAC19\uB2E4", "\uC539\uAC19\uC740", "\uC539\uAC19\uC544", "\uC539\uC9C8", "\uC539\uBB3C", "\uC539\uC790\uC9C0", "\uC539\uBCF4\uC9C0", "\uC539\uBE60", "\uC539\uBE68\uC544", "\uC539\uC9C0\uB784", "\uC539\uC314", "\uC9C0\uB784", "\uC9C0\uB7F4", "\uC9C0\uB864", "\uC9C0\uB8F0", "\uC9C0\uB784\uC5FC\uBCD1", "\uC9C0\uB784\uBCD1", "\uC9C0\uB784\uD558\uB124", "\uC9C0\uB784\uD558\uB0D0", "\uC9C0\uB784\uD55C\uB2E4", "\uC9C0\uB784\uB9C8", "\uC9C0\uB784\uD558\uC9C0\uB9C8", "\uC9C0\uB784\uB5A0\uB124", "\uC9C0\uB784\uB9DE\uB124", "\uC9C0\uB784\uB9DE\uB2E4", "\uC9C0\uB784\uB0AC\uB124", "\uC9C0\uB784\uB0AC\uB0D0", "\uC9C0\uB7F4\uBCD1", "\uC9C0\uB864\uBCD1", "\uC9C0\uB7F4\uD558\uB124", "\uC9C0\uB864\uD558\uB124", "\uC950\uB784", "\uC950\uB7F4", "\uC950\uB864", "\uC950\uB8F0", "\uC958\uC54C", "\uC958\uB784", "\uC958\uB7F4", "\uC950\uB784\uBCD1", "\uC950\uB784\uD558\uB124", "\uC7C8\uB784", "\uC840\uB784", "\uC30D\uB188\uC758\uC0C8\uB07C", "\uC30D\uB144\uC758\uC0C8\uB07C", "\uBCF4\uC950", "\uBCF4\uC9A4", "\uBCF4\uC950\uC774", "\uBCF4\uC9C0\uB144", "\uBCF4\uC9C0\uB828", "\uBCF4\uC9D3\uBB3C", "\uBCF4\uC9C0\uBB3C", "\uBCF4\uBE68", "\uBCF4\uBE68\uB7EC", "\uBCF4\uBE68\uB0A8", "\uBCF4\uBE68\uCDA9", "\uC790\uC950", "\uC790\uC9A4", "\uC790\uC950\uC774", "\uC790\uC9C0\uD138", "\uC790\uC9C0\uBB3C", "\uACE0\uCD94\uBE68", "\uACE0\uCD94\uBB3C", "\uACE0\uCD94\uBE68\uC544", "\uAF2C\uCE58\uBE68\uC544", "\uAF2C\uCD94\uBE68\uC544", "\uC785\uC5D0\uC2F8", "\uC5BC\uAD74\uC5D0\uC2F8", "\uC785\uC2F8", "\uB178\uCF58", "\uCF58\uB3D4\uC5C6\uC774", "\uC139\uC2A4", "\uC385\uC2A4", "\uC315\uC2A4", "\uC385\uC4F0", "\uC139\uC4F0", "\uC385\uC218", "\uC139\uC218", "\uC3BD\uC2A4", "\uC0C9\uC2A4", "\uC0C9\uC4F0", "\uC315\uC4F0", "\uC315\uC464", "\uC385\uC464", "\uC3BE\uC2A4", "\uC14B\uC2A4", "\uC0C9\uC218", "\uD56D\uBB38\uC139\uC2A4", "\uC560\uB110\uC139\uC2A4", "\uC624\uB7F4\uC139\uC2A4", "\uD3A0\uB77C\uCE58\uC624", "\uCEE4\uB2D0\uB9C1\uAD6C\uC2A4", "\uB525\uC2A4\uB85C\uD2B8", "\uD578\uB4DC\uC7A1", "\uD48B\uC7A1", "\uBE14\uB85C\uC6B0\uC7A1", "\uB538\uB538\uC774", "\uB538\uCE58\uAE30", "\uB538\uCCD0", "\uB538\uCE58\uB2E4", "\uB538\uAC10", "\uB538\uC7A1\uC774", "\uC790\uC704\uC9C8", "\uC624\uB098\uB2C8", "\uC624\uB098\uD640", "\uB51C\uB3C4", "\uC57C\uB3D9", "\uC57C\uC124", "\uC57C\uC9E4", "\uC57C\uAC9C", "\uD3EC\uB974\uB178", "\uD3EC\uB974\uB178\uC601\uC0C1", "\uD3EC\uB974\uB178\uC0AC\uC774\uD2B8", "\uBC97\uBC29", "\uBC97\uC9E4", "\uB178\uCD9C\uBC29\uC1A1", "\uAC00\uC2B4\uAE4C", "\uC816\uD0F1\uC774", "\uC816\uD1B5", "\uBE68\uD1B5", "\uBE68\uAC00\uC2B4", "\uC5C9\uB369\uC774\uAE4C", "\uC139\uB4DC\uB9BD", "\uC139\uD30C", "\uC139\uD30C\uD2B8\uB108", "\uCC3D\uB140", "\uCC3D\uB144", "\uCC59\uB140", "\uCC59\uB144", "\uCC3D\uB188", "\uAC78\uB808\uB144", "\uAC78\uB808\uAC19\uC740\uB144", "\uAC78\uB808\uAC19\uC740\uB188", "\uBA39\uBC84", "\uBC1C\uC815\uB0A8", "\uBC1C\uC815\uB140", "\uBC1C\uC815\uB0AC\uB2E4", "\uD480\uBC1C\uAE30", "\uAF34\uB9B0\uB2E4", "\uAF34\uB9BF", "\uAF34\uB9BC", "\uAF34\uB9AC\uB124", "\uAF34\uB9AC\uB0D0", "\uC74C\uD0D5\uD55C\uB144", "\uC74C\uD0D5\uD55C\uB188", "\uBC1C\uBE68\uC544", "\uC544\uAC00\uB9AC\uB2E5\uCCD0", "\uC544\uAC08\uB2E5\uCCD0", "\uC8FC\uB465\uC774\uB2E5\uCCD0", "\uC785\uCCD0\uB2EB\uC544", "\uCCD0\uAEBC\uC838", "\uB4A4\uC838\uB77C", "\uB4A4\uC9C0\uACE0\uC2F6\uB0D0", "\uB4A4\uC9C8\uB798", "\uB4A4\uC9C8\uAC70\uB0D0", "\uB4A4\uC84C\uC73C\uBA74", "\uC8FD\uC5B4\uBC84\uB824", "\uC8FD\uC5B4\uBC84\uB838\uC73C\uBA74", "\uC5FC\uBCD1", "\uC5FC\uBCD1\uD558\uB124", "\uC5FC\uBCD1\uD55C\uB2E4", "\uC5FC\uBCD1\uB5A8\uACE0", "\uC618\uBCD1", "\uC618\uBCD1\uD558\uB124", "\uC5E0\uBCD1", "\uC5E0\uBCD1\uD558\uB124", "\uC345", "\uC345\uB144", "\uC345\uB188", "\uC345\uB118", "\uC345\uB828", "\uC30D\uB144", "\uC30D\uB188", "\uC30D\uB118", "\uC30D\uB828", "\uC345\uAC83", "\uC345\uB178\uBB34", "\uC345\uB188\uC758", "\uBBF8\uCE5C\uB188", "\uBBF8\uCE5C\uB144", "\uBBF8\uCE5C\uC0C8\uB07C", "\uBBF8\uCE5C\uC0C9\uAE30", "\uBBF8\uCE5C\uC0C9\uB07C", "\uBBF8\uCE5C\uBCD1\uC2E0", "\uBBF8\uCE5C\uBE05\uC2E0", "\uBBF8\uCE5C\uB118", "\uBBF8\uCE5C\uB828", "\uBBF8\uCE5C\uB188\uC544", "\uBBF8\uCE5C\uB144\uC544", "\uC7A5\uC560\uC0C8\uB07C", "\uC7A5\uC560\uB144", "\uC7A5\uC560\uB188", "\uC7A5\uC560\uCDA9", "\uC7A5\uC560\uC788\uB0D0", "\uC7A5\uC560\uB0D0", "\uC800\uB2A5\uC544\uC0C8\uB07C", "\uC800\uB2A5\uC544\uB144", "\uC800\uB2A5\uC544\uB188", "\uC4F0\uB808\uAE30\uC0C8\uB07C", "\uC4F0\uB808\uAE30\uB144", "\uC4F0\uB808\uAE30\uB188", "\uBC8C\uB808\uC0C8\uB07C", "\uBC8C\uB808\uB144", "\uBC8C\uB808\uB188", "\uAE30\uC0DD\uCDA9\uC0C8\uB07C", "\uAE30\uC0DD\uCDA9\uB144", "\uAE30\uC0DD\uCDA9\uB188", "\uAD6C\uB354\uAE30\uC0C8\uB07C", "\uC5ED\uACA8\uC6B4\uC0C8\uB07C", "\uC5ED\uACA8\uC6B4\uB144", "\uC5ED\uACA8\uC6B4\uB188", "\uC539\uADF9\uD610", "\u3145\u3142", "\u3146\u3142", "\u3145\u314D", "\u3146\u314D", "\u3145\u3142\u3139", "\u3146\u3142\u3139", "\u3145\u3142\u3134", "\u3146\u3142\u3134", "\u3145\u3142\u3145\u3132", "\u3146\u3142\u3145\u3132", "\u3142\u3145", "\u3144", "\u3142\u3145\u3134", "\u3142\u3145\u3145\u3132", "\u3142\u3145\u3132", "\u3148\u3139", "\u3148\u3134", "\u3148\u3132\u3139", "\u3131\u3145\u3132", "\u3131\u3145\u3131", "\u3131\u3146\u3132", "\u3131\u3142\u3145", "\u3131\u3148\u3139", "\u3131\u3146\u3142", "\u3131\u3145\u3142", "\u3131\u3146\u314D", "\u3141\u314A\u3145\u3132", "\u3146\u3145\u3132", "\u3146\u3142\u3145\u314B", "fuck", "shit", "\uB2E5\uCCD0", "\uCC10\uB530"], "hard": ["\uC886\uBC15\uC544", "\uB290\uAE08\uB9C8", "\uB290\uADF8\uC5C4\uB9C8", "\uB290\uADF8\uC560\uBBF8", "\uB290\uADF8\uC5B4\uBBF8", "\uB290\uAE08", "\uB290\uAE08\uB9C8\uCC3D\uB140", "\uB2C8\uC5C4\uB9C8\uB4A4\uC9D0", "\uB2C8\uC5C4\uB9C8\uC8FD\uC74C", "\uB2C8\uC560\uBBF8\uB4A4\uC9D0", "\uB2C8\uC560\uBBF8\uC8FD\uC74C", "\uB2C8\uC5C4\uB9C8\uCC3D\uB140", "\uB2C8\uC560\uBBF8\uCC3D\uB140", "\uB2C8\uC560\uBBF8\uBCF4\uC9C0", "\uB2C8\uC5C4\uB9C8\uBCF4\uC9C0", "\uB2C8\uC5C4\uB9C8\uAC78\uB808", "\uB2C8\uC560\uBBF8\uAC78\uB808", "\uB2C8\uC560\uBBF8\uC5C6\uB0D0", "\uB2C8\uC5C4\uB9C8\uC5C6\uB0D0", "\uC560\uBBF8\uC5C6\uB0D0", "\uC5D0\uBBF8\uC5C6\uB0D0", "\uC560\uBE44\uC5C6\uB0D0", "\uC560\uBBF8\uB4A4\uC9C4", "\uC5D0\uBBF8\uB4A4\uC9C4", "\uC560\uBE44\uB4A4\uC9C4", "\uBD80\uBAA8\uB4A4\uC9C4", "\uC5C4\uB9C8\uB4A4\uC9C4", "\uC544\uBE60\uB4A4\uC9C4", "\uC560\uBBF8\uB4A4\uC84C\uB0D0", "\uC5D0\uBBF8\uB4A4\uC84C\uB0D0", "\uC560\uBE44\uB4A4\uC84C\uB0D0", "\uBD80\uBAA8\uB4A4\uC84C\uB0D0", "\uACE0\uC544\uC0C8\uB07C", "\uACE0\uC544\uB144", "\uACE0\uC544\uB188", "\uD638\uB85C\uC0C8\uB07C", "\uD638\uB85C\uC790\uC2DD", "\uD638\uB85C\uC7A1\uB188", "\uD638\uB85C\uC7A1\uB144", "\uD6C4\uB808\uC790\uC2DD", "\uD6C4\uB808\uC0C8\uB07C", "\uD6C4\uB808\uB144", "\uD6C4\uB808\uB188", "\uC560\uBBF8\uD130\uC9C4", "\uC5D0\uBBF8\uD130\uC9C4", "\uC560\uBE44\uD130\uC9C4", "\uC5C4\uB9C8\uD130\uC9C4", "\uBD80\uBAA8\uD130\uC9C4", "\uC560\uBBF8\uB9AC\uC2A4", "\uC5D0\uBBF8\uB9AC\uC2A4", "\uC560\uBE44\uB9AC\uC2A4", "\uC5C4\uB9C8\uB9AC\uC2A4", "\uC560\uBBF8\uB4A4", "\uC5D0\uBBF8\uB4A4", "\uC560\uBE44\uB4A4", "\uC5C4\uB4A4", "\uC570\uB4A4", "\uC5E0\uB4A4", "\uC560\uB4A4", "\uC5D0\uB4A4", "\uC560\uBBF8\uCC3D\uB144", "\uC5D0\uBBF8\uCC3D\uB144", "\uC815\uC561\uBA39\uC5B4", "\uC815\uC561\uC2F8", "\uC815\uC561\uBC1C\uC0AC", "\uC0AC\uC815\uC2DC\uCF1C", "\uC9C8\uC2F8", "\uC9C8\uB0B4\uC0AC\uC815", "\uC9C8\uC678\uC0AC\uC815", "\uC548\uC5D0\uC2F8\uC918", "\uB5A1\uCE58\uC790", "\uB5A1\uCE58\uAE30", "\uB5A1\uCCD0", "\uB5A1\uCE58\uACE0", "\uB5A1\uCE60\uB798", "\uB5A1\uCE58\uACE0\uC2F6\uB2E4", "\uC57C\uC2A4\uD558\uC790", "\uC57C\uC464\uD558\uC790", "\uAC00\uC2B4\uBCF4\uC5EC\uC918", "\uAC00\uC2B4\uBCF4\uC5EC", "\uCC0C\uCC0C\uBCF4\uC5EC\uC918", "\uC5C9\uB369\uC774\uBCF4\uC5EC\uC918", "\uD32C\uD2F0\uBCF4\uC5EC\uC918", "\uC18D\uC637\uBCF4\uC5EC\uC918", "\uD32C\uD2F0\uBC97\uC5B4", "\uC637\uBC97\uC5B4", "\uBC97\uC5B4\uBD10", "\uBC97\uC5B4\uB77C", "\uBC97\uACE0\uC640", "\uB2E4\uBC97\uC5B4", "\uBAB8\uB9E4\uBCF4\uC5EC\uC918", "\uBAB8\uCEA0\uD558\uC790", "\uC601\uD1B5\uC57C\uC2A4", "\uD3F0\uC139", "\uD3F0\uC139\uC2A4", "\uC870\uAC74\uB9CC\uB0A8", "\uC870\uAC74\uB140", "\uC870\uAC74\uB0A8", "\uC131\uB9E4\uB9E4", "\uC131\uB9E4\uC218", "\uC131\uD310\uB9E4", "\uB9E4\uCD98\uBD80", "\uC721\uBCC0\uAE30", "\uC131\uB178\uC608", "\uAC15\uAC04\uD574", "\uAC15\uAC04\uD55C\uB2E4", "\uAC15\uAC04\uD558\uACE0\uC2F6\uB2E4", "\uBC15\uC544\uC918", "\uBC15\uC544\uBC84\uB824", "\uBC15\uC544\uC904\uAC8C", "\uBC15\uD788\uACE0\uC2F6\uB2E4", "\uC464\uC154\uB123\uC5B4", "\uC464\uC154\uC904\uAC8C", "\uBE68\uC544\uC918", "\uD565\uC544\uC918", "\uD565\uACE0\uC2F6\uB2E4", "\uD5C8\uBC85\uC9C0\uD565\uC544", "\uBC1C\uD565\uC544", "\uACA8\uB4DC\uB791\uC774\uD565\uC544", "\uC8FD\uC774\uACE0\uC2F6\uB2E4", "\uC8FD\uC5EC\uBC84\uB9B0\uB2E4", "\uC8FD\uC5EC\uC904\uAC8C", "\uC8FD\uC5EC\uBC84\uB9B4\uAC70\uC57C", "\uC0B4\uC778\uD574\uBC84\uB9B0\uB2E4", "\uD328\uC8FD\uC778\uB2E4", "\uD328\uC8FD\uC77C", "\uCCD0\uC8FD\uC778\uB2E4", "\uCCD0\uC8FD\uC77C", "\uB54C\uB824\uC8FD\uC778\uB2E4", "\uB54C\uB824\uC8FD\uC77C", "\uCC22\uC5B4\uC8FD\uC778\uB2E4", "\uCC22\uC5B4\uC8FD\uC77C", "\uBAA9\uB530\uBC84\uB9B0\uB2E4", "\uB300\uAC00\uB9AC\uAE68\uBC84\uB9B0\uB2E4", "\uBA38\uB9AC\uAE68\uBC84\uB9B0\uB2E4", "\uB208\uAE54\uBF51\uC544", "\uB208\uAE54\uBF51\uB294\uB2E4", "\uB2C8\uBBF8\uB7F4", "\uB2C8\uBBF8\uB784", "\uB2C8\uBBF8\uB7F4\uC528\uBC1C", "\uB2C8\uBBF8\uC539", "\uB2C8\uBBF8\uC886", "\uB2C8\uBBF8\uB7F4\uB188", "\uB2C8\uBBF8\uB784\uB188", "\u3134\u3131\u3141", "\u3134\u3147\u3141", "\u3134\u3131\u3147\u3141", "\u3134\u3131\u3147\u3142", "\u3147\u3141\u3137\u3148", "\u3147\u3142\u3137\u3148", "\u3147\u3141\u3139\u3145", "\u3147\u3141\u314C\u3148", "\u3147\u3142\u314C\u3148", "\uB2C8\uC560\uBBF8", "\uB2C8\uC5C4\uB9C8", "\uB290\uADF8\uC560\uBE44"], "ambig": ["\uBCF4\uC9C0", "\uBCF4\uC9D3", "\uC790\uC9C0", "\uC790\uC9D3", "\uC2DC\uBC14", "\uC2A4\uBC14", "\uC2DC\uBC29", "\uC528\uBC29", "\uC2DC\uBD09", "\uBCD1\uC9C4", "\uC887", "\uC0AC\uC815\uD574", "\uC0AC\uC815\uD558\uC790", "\uC548\uC5D0\uC2F8", "\uBC16\uC5D0\uC2F8", "\uC5BC\uC2F8", "\uBC30\uC2F8", "\uC18D\uC2F8", "\uC57C\uC0AC", "\uD3EC\uB178", "\uC8FD\uC5B4\uB77C", "\uB2C8\uBBF8", "\uC874\uB124", "\uB530\uBA39", "\uB530\uBA39\uC5B4", "\uB530\uBA39\uACE0", "\uB530\uBA39\uC790", "\uAF34\uB824", "\uAC1C\uC2DC\uD0A4"] };

// src/filter.js
var ALLOW = ["\uC2DC\uBC14\uACAC", "\uC2DC\uBC14\uC774\uB204", "\uB545\uB530\uBA39\uAE30", "\uB530\uBA39\uAE30", "\uC0AC\uC815\uC774", "\uC0AC\uC815\uC0C1", "\uC0AC\uC815\uC744", "\uC0AC\uC815\uC740", "\uC0AC\uC815\uD574\uC8FC", "\uC0AC\uC815\uD574\uC11C", "\uC0AC\uC815\uD558\uC790\uBA74", "\uC5BC\uC2F8\uC548", "\uC5BC\uC2F8\uC88B", "\uBC30\uC2F8\uC6C0", "\uC18D\uC2F8\uAC1C", "\uC2DC\uBC29\uC11C", "\uBCD1\uC9C4\uB144", "\uAFC8\uC744\uC887", "\uC887\uC544", "\uC887\uB294", "\uC887\uB358", "\uC887\uC73C", "\uBCF4\uC9C0\uC54A", "\uBCF4\uC9C0\uBABB", "\uBCF4\uC9C0\uB9C8", "\uBCF4\uC9C0\uB9D0", "\uC790\uC9C0\uB9C8", "\uC790\uC9C0\uB9D0", "\uC790\uC9C0\uC54A", "\uC790\uC9C0\uBABB"];
var AMBIG_NEXT = /^[마말않못도는만요며고네나니죠지롱]/;
var AMBIG_PREV = /[안못잘해가와봐서려어아워져다]$/;
function scanBad(text = "") {
  const chars = [...text], s = [], idx = [], wid = [];
  let w = 0;
  chars.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (wid.length && wid[wid.length - 1] === w) w++;
      return;
    }
    if (/\p{L}/u.test(ch)) {
      s.push(ch.toLowerCase());
      idx.push(i);
      wid.push(w);
    }
  });
  const str = s.join(""), first = {}, last = {};
  wid.forEach((x, k) => {
    if (first[x] === void 0) first[x] = k;
    last[x] = k;
  });
  const prot = new Uint8Array(s.length);
  const findAll = /* @__PURE__ */ __name((word) => {
    const r = [];
    let k = str.indexOf(word);
    while (k !== -1) {
      r.push(k);
      k = str.indexOf(word, k + 1);
    }
    return r;
  }, "findAll");
  for (const a of ALLOW) for (const k of findAll(a)) for (let j = k; j < k + a.length; j++) prot[j] = 1;
  const ok = /* @__PURE__ */ __name((k, len, ambig) => {
    const e = k + len - 1;
    for (let j = k; j <= e; j++) if (prot[j]) return false;
    if (wid[k] !== wid[e]) {
      if (ambig) return false;
      if (first[wid[k]] !== k) return false;
      if (last[wid[e]] !== e && len < 3) return false;
    }
    if (ambig && (AMBIG_NEXT.test(str[e + 1] || "") || AMBIG_PREV.test(str[k - 1] || ""))) return false;
    return true;
  }, "ok");
  let hit = false, hard = false;
  const mask = /* @__PURE__ */ __name((k, len) => {
    hit = true;
    for (let j = idx[k]; j <= idx[k + len - 1]; j++) if (!/\s/.test(chars[j])) chars[j] = "*";
  }, "mask");
  for (const word of BAD.hard) for (const k of findAll(word)) if (ok(k, word.length, false)) hard = true;
  for (const word of BAD.soft) for (const k of findAll(word)) if (ok(k, word.length, false)) mask(k, word.length);
  for (const word of BAD.ambig) for (const k of findAll(word)) if (ok(k, word.length, true)) mask(k, word.length);
  return { text: chars.join(""), hit: hit || hard, hard };
}
__name(scanBad, "scanBad");

// src/index.js
var ORIGINS = ["https://kimchibok75-code.github.io", "http://localhost:5173", "http://127.0.0.1:5173"];
var PBKDF2_ITER = 3e4;
var DAY = 864e5;
var LOCK_FAILS = 5;
var LOCK_MS = 10 * 6e4;
var SIGNUP_PER_HOUR = 3;
var HttpError = class extends Error {
  static {
    __name(this, "HttpError");
  }
  constructor(status, msg) {
    super(msg);
    this.status = status;
  }
};
var fail = /* @__PURE__ */ __name((status, msg) => {
  throw new HttpError(status, msg);
}, "fail");
var json = /* @__PURE__ */ __name((o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }), "json");
var index_default = {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = { "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0], "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "86400", Vary: "Origin" };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      res = await route(req, env, new URL(req.url));
    } catch (e) {
      if (e instanceof HttpError) res = json({ error: e.message }, e.status);
      else {
        console.error(e?.stack || String(e));
        res = json({ error: "\uC11C\uBC84\uC5D0 \uBB38\uC81C\uAC00 \uC0DD\uACBC\uC5B4\uC694. \uC7A0\uC2DC \uB4A4\uC5D0 \uB2E4\uC2DC \uD574 \uC8FC\uC138\uC694" }, 500);
      }
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  }
};
async function route(req, env, url) {
  const p = url.pathname, m = req.method;
  if (p === "/" || p === "/api/health") return json({ ok: true, name: "\uCE58\uBCF5 \uD0C0\uC6B4 \uC11C\uBC84", stage: 1 });
  if (m === "POST" && p === "/api/signup") return signup(req, env);
  if (m === "POST" && p === "/api/login") return login(req, env);
  if (m === "POST" && p === "/api/recover") return recover(req, env);
  const s = await auth(req, env);
  if (m === "GET" && p === "/api/me") return json({ me: await loadMe(env, s.user) });
  if (m === "POST" && p === "/api/logout") {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(s.tokenHash).run();
    return json({ ok: true });
  }
  if (m === "POST" && p === "/api/character") return saveLook(req, env, s.user);
  if (m === "POST" && p === "/api/move") return saveMove(req, env, s.user);
  if (m === "POST" && p === "/api/stats") return addStats(req, env, s.user);
  if (m === "POST" && p === "/api/password") return changePw(req, env, s);
  if (m === "POST" && p === "/api/recovery-code") return newRecovery(req, env, s.user);
  fail(404, "\uC5C6\uB294 \uC8FC\uC18C\uC608\uC694");
}
__name(route, "route");
var enc = new TextEncoder();
var b64 = /* @__PURE__ */ __name((buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "b64");
var unb64 = /* @__PURE__ */ __name((s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0)), "unb64");
var randB64 = /* @__PURE__ */ __name((n) => b64(crypto.getRandomValues(new Uint8Array(n))), "randB64");
var sha256 = /* @__PURE__ */ __name(async (s) => b64(await crypto.subtle.digest("SHA-256", enc.encode(s))), "sha256");
async function pbkdf2(pw, salt, iter) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unb64(salt), iterations: iter }, key, 256));
}
__name(pbkdf2, "pbkdf2");
function same(a, b) {
  const x = enc.encode(a), y = enc.encode(b);
  return x.length === y.length && crypto.subtle.timingSafeEqual(x, y);
}
__name(same, "same");
var CODE_ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode() {
  const r = crypto.getRandomValues(new Uint8Array(12));
  let s = "";
  r.forEach((v, i) => {
    if (i && i % 4 === 0) s += "-";
    s += CODE_ABC[v % 32];
  });
  return s;
}
__name(newCode, "newCode");
var normCode = /* @__PURE__ */ __name((c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, ""), "normCode");
async function readBody(req) {
  const t = await req.text();
  if (t.length > 4e3) fail(413, "\uBCF4\uB0B8 \uB0B4\uC6A9\uC774 \uB108\uBB34 \uCEE4\uC694");
  try {
    return JSON.parse(t || "{}");
  } catch {
    fail(400, "\uC798\uBABB\uB41C \uC694\uCCAD\uC774\uC5D0\uC694");
  }
}
__name(readBody, "readBody");
var now = /* @__PURE__ */ __name(() => Date.now(), "now");
var log = /* @__PURE__ */ __name((env, uid, kind, detail = "") => env.DB.prepare("INSERT INTO activity (user_id, kind, detail, at) VALUES (?, ?, ?, ?)").bind(uid, kind, detail, now()).run(), "log");
async function newSession(env, uid, keep) {
  const token = randB64(32), t = now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at < ?").bind(uid, t),
    env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").bind(await sha256(token), uid, t + (keep ? 30 * DAY : DAY), t)
  ]);
  return token;
}
__name(newSession, "newSession");
async function auth(req, env) {
  const m = (req.headers.get("Authorization") || "").match(/^Bearer ([\w-]{20,})$/);
  if (!m) fail(401, "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD574\uC694");
  const tokenHash = await sha256(m[1]);
  const user = await env.DB.prepare("SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?").bind(tokenHash, now()).first();
  if (!user) fail(401, "\uB85C\uADF8\uC778\uC774 \uB05D\uB0AC\uC5B4\uC694. \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694");
  if (user.banned) fail(403, "\uC774\uC6A9\uC774 \uC815\uC9C0\uB41C \uACC4\uC815\uC774\uC5D0\uC694. \uAE40\uCE58\uBCF5 \uB514\uC2A4\uCF54\uB4DC\uB098 \uD32C \uCE74\uD398\uB85C \uBB38\uC758\uD574 \uC8FC\uC138\uC694");
  return { user, tokenHash };
}
__name(auth, "auth");
async function checkPw(user, pw) {
  return same(await pbkdf2(String(pw || ""), user.pw_salt, user.pw_iter), user.pw_hash);
}
__name(checkPw, "checkPw");
function lockedMsg(user) {
  const left = user.lock_until - now();
  return left > 0 ? `\uC5EC\uB7EC \uBC88 \uD2C0\uB824\uC11C \uC7A0\uACBC\uC5B4\uC694. ${Math.ceil(left / 6e4)}\uBD84 \uB4A4\uC5D0 \uB2E4\uC2DC \uD574 \uC8FC\uC138\uC694` : null;
}
__name(lockedMsg, "lockedMsg");
async function countFail(env, user) {
  const n = user.fail_count + 1;
  if (n >= LOCK_FAILS) {
    await env.DB.prepare("UPDATE users SET fail_count = 0, lock_until = ? WHERE id = ?").bind(now() + LOCK_MS, user.id).run();
    return `${LOCK_FAILS}\uBC88 \uD2C0\uB824\uC11C 10\uBD84 \uB3D9\uC548 \uC7A0\uACBC\uC5B4\uC694`;
  }
  await env.DB.prepare("UPDATE users SET fail_count = ? WHERE id = ?").bind(n, user.id).run();
  return n;
}
__name(countFail, "countFail");
var findUser = /* @__PURE__ */ __name((env, nick) => env.DB.prepare("SELECT * FROM users WHERE nick_key = ?").bind(String(nick || "").trim().toLowerCase()).first(), "findUser");
async function signup(req, env) {
  const b = await readBody(req), nick = String(b.nick || "").trim(), pw = String(b.pw || "");
  if (!allOk(nickChecks(nick))) fail(400, "\uB2C9\uB124\uC784 \uADDC\uCE59\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694 (2~10\uAE00\uC790, \uD55C\uAE00\xB7\uC601\uBB38\xB7\uC22B\uC790)");
  if (scanBad(nick).hit) fail(400, "\uB2C9\uB124\uC784\uC5D0 \uC4F8 \uC218 \uC5C6\uB294 \uB9D0\uC774 \uB4E4\uC5B4 \uC788\uC5B4\uC694");
  if (!allOk(pwChecks(pw, nick))) fail(400, "\uBE44\uBC00\uBC88\uD638 \uADDC\uCE59\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694");
  const ipHash = await sha256("signup:" + (req.headers.get("CF-Connecting-IP") || "local"));
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM signups WHERE ip_hash = ? AND at > ?").bind(ipHash, now() - 36e5).first();
  if (recent.n >= SIGNUP_PER_HOUR) fail(429, "\uAC19\uC740 \uACF3\uC5D0\uC11C \uAC00\uC785\uC744 \uB108\uBB34 \uB9CE\uC774 \uD588\uC5B4\uC694. 1\uC2DC\uAC04 \uB4A4\uC5D0 \uB2E4\uC2DC \uD574 \uC8FC\uC138\uC694");
  if (await findUser(env, nick)) fail(409, "\uC774\uBBF8 \uC788\uB294 \uB2C9\uB124\uC784\uC774\uC5D0\uC694");
  const salt = randB64(16), code = newCode(), t = now();
  let id;
  try {
    const r = await env.DB.prepare("INSERT INTO users (nick, nick_key, pw_hash, pw_salt, pw_iter, rec_hash, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(nick, nick.toLowerCase(), await pbkdf2(pw, salt, PBKDF2_ITER), salt, PBKDF2_ITER, await sha256(normCode(code)), t, t).run();
    id = r.meta.last_row_id;
  } catch (e) {
    if (String(e).includes("UNIQUE")) fail(409, "\uC774\uBBF8 \uC788\uB294 \uB2C9\uB124\uC784\uC774\uC5D0\uC694");
    throw e;
  }
  const c = newCharacter();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO characters (user_id, face, body, eyes, hat, intro, title, x, y, lv, exp, gold, s_str, s_dex, s_int, s_luk, points, hp, equip, bag, hats, pots, pot_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, c.face, c.body, c.eyes, c.hat, c.intro, c.title, c.x, c.y, c.lv, c.exp, c.gold, c.str, c.dex, c.int, c.luk, c.points, c.hp, JSON.stringify(c.equip), JSON.stringify(c.bag), JSON.stringify(c.hats), JSON.stringify(c.pots), c.potAt, t),
    env.DB.prepare("INSERT INTO signups (ip_hash, at) VALUES (?, ?)").bind(ipHash, t),
    env.DB.prepare("INSERT INTO activity (user_id, kind, detail, at) VALUES (?, ?, ?, ?)").bind(id, "signup", nick, t)
  ]);
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
  return json({ token: await newSession(env, id, true), code, me: await loadMe(env, user) });
}
__name(signup, "signup");
async function login(req, env) {
  const b = await readBody(req), user = await findUser(env, b.nick);
  if (!user) fail(401, "\uB2C9\uB124\uC784 \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uB9DE\uC9C0 \uC54A\uC544\uC694");
  const locked = lockedMsg(user);
  if (locked) fail(429, locked);
  if (!await checkPw(user, b.pw)) {
    const r = await countFail(env, user);
    fail(401, typeof r === "string" ? r : `\uB2C9\uB124\uC784 \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uB9DE\uC9C0 \uC54A\uC544\uC694 (${r}/${LOCK_FAILS})`);
  }
  if (user.banned) fail(403, "\uC774\uC6A9\uC774 \uC815\uC9C0\uB41C \uACC4\uC815\uC774\uC5D0\uC694. \uAE40\uCE58\uBCF5 \uB514\uC2A4\uCF54\uB4DC\uB098 \uD32C \uCE74\uD398\uB85C \uBB38\uC758\uD574 \uC8FC\uC138\uC694");
  await env.DB.prepare("UPDATE users SET fail_count = 0, lock_until = 0, last_login = ? WHERE id = ?").bind(now(), user.id).run();
  await log(env, user.id, "login");
  return json({ token: await newSession(env, user.id, !!b.keep), me: await loadMe(env, user) });
}
__name(login, "login");
async function recover(req, env) {
  const b = await readBody(req), user = await findUser(env, b.nick);
  if (!user) fail(401, "\uB2C9\uB124\uC784 \uB610\uB294 \uBCF5\uAD6C \uCF54\uB4DC\uAC00 \uB9DE\uC9C0 \uC54A\uC544\uC694");
  const locked = lockedMsg(user);
  if (locked) fail(429, locked);
  if (normCode(b.code).length !== 12 || !same(await sha256(normCode(b.code)), user.rec_hash)) {
    const r = await countFail(env, user);
    fail(401, typeof r === "string" ? r : `\uB2C9\uB124\uC784 \uB610\uB294 \uBCF5\uAD6C \uCF54\uB4DC\uAC00 \uB9DE\uC9C0 \uC54A\uC544\uC694 (${r}/${LOCK_FAILS})`);
  }
  const pw = String(b.pw || "");
  if (!allOk(pwChecks(pw, user.nick))) fail(400, "\uC0C8 \uBE44\uBC00\uBC88\uD638: \uC601\uBB38+\uC22B\uC790 8\uAE00\uC790 \uC774\uC0C1, \uB2C9\uB124\uC784\xB7\uD754\uD55C \uBE44\uBC00\uBC88\uD638 X");
  const salt = randB64(16), code = newCode();
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, rec_hash = ?, fail_count = 0, lock_until = 0 WHERE id = ?").bind(await pbkdf2(pw, salt, PBKDF2_ITER), salt, PBKDF2_ITER, await sha256(normCode(code)), user.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id),
    // 다른 곳의 로그인은 모두 끊음
    env.DB.prepare("INSERT INTO activity (user_id, kind, at) VALUES (?, ?, ?)").bind(user.id, "recover", now())
  ]);
  return json({ ok: true, code });
}
__name(recover, "recover");
async function loadMe(env, user) {
  const c = await env.DB.prepare("SELECT * FROM characters WHERE user_id = ?").bind(user.id).first();
  return {
    nick: user.nick,
    admin: !!user.is_admin,
    char: {
      face: c.face,
      body: c.body,
      eyes: c.eyes,
      hat: c.hat,
      intro: c.intro,
      title: c.title,
      x: c.x,
      y: c.y,
      lv: c.lv,
      exp: c.exp,
      gold: c.gold,
      str: c.s_str,
      dex: c.s_dex,
      int: c.s_int,
      luk: c.s_luk,
      points: c.points,
      hp: c.hp,
      equip: JSON.parse(c.equip),
      bag: JSON.parse(c.bag),
      hats: JSON.parse(c.hats),
      pots: JSON.parse(c.pots),
      potAt: c.pot_at
    }
  };
}
__name(loadMe, "loadMe");
async function saveLook(req, env, user) {
  const b = await readBody(req), c = await env.DB.prepare("SELECT hats FROM characters WHERE user_id = ?").bind(user.id).first();
  const face = FACES.includes(b.face) ? b.face : null, body = BODIES.includes(b.body) ? b.body : null, eyes = EYES.includes(b.eyes) ? b.eyes : null;
  const hat = typeof b.hat === "string" && JSON.parse(c.hats).includes(b.hat) ? b.hat : null;
  let intro = null;
  if (typeof b.intro === "string") {
    intro = b.intro.replace(/\s+/g, " ").trim();
    if ([...intro].length > 30) fail(400, "\uD55C \uC904 \uC18C\uAC1C\uB294 30\uAE00\uC790\uAE4C\uC9C0\uC608\uC694");
    const r = scanBad(intro);
    if (r.hard) fail(400, "\uD55C \uC904 \uC18C\uAC1C\uC5D0 \uC4F8 \uC218 \uC5C6\uB294 \uB9D0\uC774 \uC788\uC5B4\uC694");
    intro = r.text;
  }
  await env.DB.prepare("UPDATE characters SET face = COALESCE(?, face), body = COALESCE(?, body), eyes = COALESCE(?, eyes), hat = COALESCE(?, hat), intro = COALESCE(?, intro), updated_at = ? WHERE user_id = ?").bind(face, body, eyes, hat, intro, now(), user.id).run();
  return json({ me: await loadMe(env, user) });
}
__name(saveLook, "saveLook");
async function saveMove(req, env, user) {
  const b = await readBody(req), x = Number(b.x), y = Number(b.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) fail(400, "\uC704\uCE58\uAC00 \uC774\uC0C1\uD574\uC694");
  const cx = Math.max(T / 2, Math.min(MW * T - T / 2, x)), cy = Math.max(T / 2, Math.min(MH * T - T / 2, y));
  await env.DB.prepare("UPDATE characters SET x = ?, y = ?, updated_at = ? WHERE user_id = ?").bind(cx, cy, now(), user.id).run();
  return json({ ok: true });
}
__name(saveMove, "saveMove");
async function addStats(req, env, user) {
  const b = await readBody(req), add = b.add || {}, keys = Object.keys(STATS);
  let sum = 0;
  for (const k of keys) {
    const v = add[k] ?? 0;
    if (!Number.isInteger(v) || v < 0 || v > 400) fail(400, "\uB2A5\uB825\uCE58 \uAC12\uC774 \uC774\uC0C1\uD574\uC694");
    sum += v;
  }
  if (!sum) fail(400, "\uC62C\uB9B4 \uB2A5\uB825\uCE58\uB97C \uACE8\uB77C \uC8FC\uC138\uC694");
  const r = await env.DB.prepare("UPDATE characters SET s_str = s_str + ?, s_dex = s_dex + ?, s_int = s_int + ?, s_luk = s_luk + ?, points = points - ?, updated_at = ? WHERE user_id = ? AND points >= ?").bind(add.str ?? 0, add.dex ?? 0, add.int ?? 0, add.luk ?? 0, sum, now(), user.id, sum).run();
  if (!r.meta.changes) fail(400, "\uB0A8\uC740 \uD3EC\uC778\uD2B8\uAC00 \uBD80\uC871\uD574\uC694");
  return json({ me: await loadMe(env, user) });
}
__name(addStats, "addStats");
async function changePw(req, env, s) {
  const b = await readBody(req), user = s.user;
  const locked = lockedMsg(user);
  if (locked) fail(429, locked);
  if (!await checkPw(user, b.old)) {
    const r = await countFail(env, user);
    fail(401, typeof r === "string" ? r : `\uC9C0\uAE08 \uBE44\uBC00\uBC88\uD638\uAC00 \uB9DE\uC9C0 \uC54A\uC544\uC694 (${r}/${LOCK_FAILS})`);
  }
  const pw = String(b.pw || "");
  if (!allOk(pwChecks(pw, user.nick))) fail(400, "\uC0C8 \uBE44\uBC00\uBC88\uD638: \uC601\uBB38+\uC22B\uC790 8\uAE00\uC790 \uC774\uC0C1, \uB2C9\uB124\uC784\xB7\uD754\uD55C \uBE44\uBC00\uBC88\uD638 X");
  const salt = randB64(16);
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, fail_count = 0 WHERE id = ?").bind(await pbkdf2(pw, salt, PBKDF2_ITER), salt, PBKDF2_ITER, user.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").bind(user.id, s.tokenHash),
    // 이 기기 말고 다른 곳은 로그아웃
    env.DB.prepare("INSERT INTO activity (user_id, kind, at) VALUES (?, ?, ?)").bind(user.id, "password", now())
  ]);
  return json({ ok: true });
}
__name(changePw, "changePw");
async function newRecovery(req, env, user) {
  const b = await readBody(req);
  const locked = lockedMsg(user);
  if (locked) fail(429, locked);
  if (!await checkPw(user, b.pw)) {
    const r = await countFail(env, user);
    fail(401, typeof r === "string" ? r : `\uBE44\uBC00\uBC88\uD638\uAC00 \uB9DE\uC9C0 \uC54A\uC544\uC694 (${r}/${LOCK_FAILS})`);
  }
  const code = newCode();
  await env.DB.prepare("UPDATE users SET rec_hash = ?, fail_count = 0 WHERE id = ?").bind(await sha256(normCode(code)), user.id).run();
  await log(env, user.id, "recovery-code");
  return json({ ok: true, code });
}
__name(newRecovery, "newRecovery");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
