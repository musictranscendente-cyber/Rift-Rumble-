// Simulação headless da lógica do jogo (sem renderização) para testes e balanceamento.
// Uso: node tools/sim.js [partidas]
const fs = require('fs');
const path = require('path');
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
global.navigator = {};
const dir = path.join(__dirname, '..', 'web', 'js');
for (const f of ['util.js', 'characters.js', 'stages.js', 'fighter.js', 'ai.js', 'game.js']) {
  eval(fs.readFileSync(path.join(dir, f), 'utf8'));
}
const RR = window.RR;
RR.audio = { play() {}, music() {} };
RR.input = { human: null };

// 1) Teste de KO: qual % é preciso para um golpe derrubar do centro da arena
function koPercent(attId, moveId, defId) {
  for (let p = 0; p <= 300; p += 5) {
    const m = new RR.Match({ mode: 'stock', stocks: 3, stageId: 'ruinas', players: [{ charId: attId, type: 'cpu', level: 0 }, { charId: defId, type: 'cpu', level: 0 }] });
    m.phase = 'play';
    const [a, b] = m.fighters;
    a.x = -40; a.y = 0; a.facing = 1; b.x = 20; b.y = 0; b.percent = p;
    const mv = RR.chars[attId].moves[moveId];
    const h = mv.hits ? mv.hits[mv.hits.length - 1] : mv.__ph;
    m.applyHit(a, b, h, 1);
    b.ctrl = { poll: () => RR.U.blankInput() };
    for (let i = 0; i < 400; i++) {
      b.update(m);
      m.checkBlast(b);
      if (b.state === 'dead' || b.state === 'out') return p;
    }
  }
  return '>300';
}
const tests = [['kael', 'jab3'], ['kael', 'upA'], ['kael', 'ult'], ['zyra', 'jab3'], ['zyra', 'ult'], ['gorak', 'jab3'], ['gorak', 'upA'], ['gorak', 'recovery'], ['lumi', 'jab3'], ['kael', 'special'.replace('special', 'nair')], ['kael', 'dair']];
console.log('--- % necessária para KO (alvo Kael, centro da arena) ---');
for (const [c, mv] of tests) console.log(c.padEnd(6), mv.padEnd(9), koPercent(c, mv, 'kael'));
console.log('gorak ult blast', (() => { const h = { dmg: 24, kb: 7, gr: 20, ang: 68, cx: 0, cy: 0, w: 0, h: 0 }; RR.chars.gorak.moves.__t = { hits: [h] }; return koPercent('gorak', '__t', 'kael'); })());
console.log('lumi beam final', (() => { RR.chars.lumi.moves.__t = { hits: [{ dmg: 12, kb: 5, gr: 19, ang: 32, cx: 0, cy: 0, w: 0, h: 0 }] }; return koPercent('lumi', '__t', 'kael'); })());

// 2) Partidas completas entre bots
const N = +process.argv[2] || 12;
const stats = { frames: [], kos: 0, sds: 0, errors: 0, timeouts: 0, koPct: [], wins: {} };
for (let n = 0; n < N; n++) {
  const ids = RR.chars.list;
  const nb = 2 + (n % 3);
  const players = [];
  for (let i = 0; i < nb; i++) players.push({ charId: ids[(n + i) % 4], type: 'cpu', level: n % 3 });
  const m = new RR.Match({ mode: 'stock', stocks: 3, stageId: RR.stages.list[n % 2], players });
  RR.ui = { showResults() {} };
  const origKo = m.ko.bind(m);
  m.ko = (f) => { stats.koPct.push(f.percent); if (f.lastHitBy && m.frame - f.lastHitFrame < 480) stats.kos++; else stats.sds++; origKo(f); };
  let i = 0;
  try {
    for (; i < 60 * 60 * 8 && m.phase !== 'done'; i++) m.step();
  } catch (e) { stats.errors++; console.log('ERRO', e.stack); }
  if (m.phase !== 'done') stats.timeouts++;
  stats.frames.push(m.frame);
  const w = m.ranking()[0].def.id;
  stats.wins[w] = (stats.wins[w] || 0) + 1;
}
const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(0);
console.log('--- Partidas bot x bot ---');
console.log('partidas', N, 'duração média (s)', (avg(stats.frames) / 60).toFixed(0), 'erros', stats.errors, 'timeouts', stats.timeouts);
console.log('KOs por golpe', stats.kos, 'autodestruições', stats.sds, '% média no KO', avg(stats.koPct));
console.log('vitórias', stats.wins);
