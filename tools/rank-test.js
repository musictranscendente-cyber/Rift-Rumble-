// Testes automáticos da Ranqueada (regras puras de web/js/rank-core.js). Uso: node tools/rank-test.js
const K = require('../web/js/rank-core.js');
let ok = 0, fail = 0;
const t = (name, cond, info) => {
  if (cond) ok++;
  else {
    fail++;
    console.log('FALHOU:', name, info !== undefined ? JSON.stringify(info) : '');
  }
};
const D = (y, m, d, h = 12) => Date.UTC(y, m - 1, d, h);

// ---------- pontos ----------
let r = K.applyResult({ points: 100 }, 'win', 100);
t('vitória simples +20', r.delta === 20, r);
r = K.applyResult({ points: 100 }, 'win', 300);
t('bônus por adversário mais forte: +10 a cada 200 (máx 10)', r.delta === 30, r);
r = K.applyResult({ points: 100 }, 'win', 160);
t('bônus +3 com 60 pontos a mais', r.delta === 23, r);
r = K.applyResult({ points: 100 }, 'win', 2000);
t('bônus limitado a +10', r.delta === 30, r);
r = K.applyResult({ points: 100 }, 'win', 50);
t('sem bônus contra adversário mais fraco', r.delta === 20, r);
let st = { points: 0 };
st = K.applyResult(st, 'win', 0).st;
st = K.applyResult(st, 'win', 0).st;
r = K.applyResult(st, 'win', 0);
t('3ª vitória seguida dá +5', r.delta === 25 && r.st.streak === 3, r);
r = K.applyResult(r.st, 'loss', 0);
t('derrota zera a sequência e tira 12', r.delta === -12 && r.st.streak === 0 && r.st.losses === 1, r);
r = K.applyResult({ points: 5 }, 'loss', 0);
t('pontos nunca ficam negativos', r.st.points === 0, r);
r = K.applyResult({ points: 50 }, 'draw', 0);
t('empate +3 sem mexer na sequência', r.delta === 3, r);

// ---------- ligas e proteção ----------
t('ligas nos pisos certos', [0, 299, 300, 699, 700, 1200, 1800, 2499, 2500, 9999].map(K.leagueOf).join() === '0,0,1,1,2,3,4,4,5,5');
r = K.applyResult({ points: 290, maxLeague: 0 }, 'win', 290);
t('subir de liga avisa leagueUp', r.leagueUp && r.st.maxLeague === 1 && r.st.points === 310, r);
r = K.applyResult(r.st, 'loss', 0);
t('proteção: não cai abaixo do piso da liga alcançada', r.st.points === 300 && r.breakdown.protected, r);
r = K.applyResult({ points: 305, maxLeague: 1 }, 'loss', 0);
t('proteção segura no piso (305-12 -> 300)', r.st.points === 300, r);
r = K.applyResult({ points: 900, maxLeague: 2 }, 'loss', 0);
t('acima do piso perde 12 normal', r.st.points === 888, r);

// ---------- temporadas ----------
t('temporada 1 = novembro/2026', K.seasonOf(D(2026, 11, 15)) === 1);
t('temporada 2 = dezembro/2026', K.seasonOf(D(2026, 12, 1, 0)) === 2);
t('temporada 14 = dezembro/2027', K.seasonOf(D(2027, 12, 31, 23)) === 14);
t('virada exatamente à meia-noite UTC', K.seasonOf(Date.UTC(2026, 11, 1, 0, 0, 0) - 1) === 1 && K.seasonOf(Date.UTC(2026, 11, 1)) === 2);
t('dias restantes', K.daysLeft(D(2026, 11, 25, 0)) === 6, K.daysLeft(D(2026, 11, 25, 0)));
let ro = K.rollover({ season: 1, points: 1900, maxLeague: 4, trophies: 0 }, 2, 37);
t('virada: metade dos pontos', ro.st.points === 950 && ro.st.prevPoints === 1900, ro);
t('virada: prêmio pela maior liga', ro.reward.coins === 600 && ro.reward.gems === 10, ro.reward);
t('virada: sem troféu fora do Top 10', ro.st.trophies === 0 && !ro.top10);
t('virada: nova temporada zera sequência e placar', ro.st.streak === 0 && ro.st.wins === 0 && ro.st.season === 2);
ro = K.rollover({ season: 1, points: 2900, maxLeague: 5, trophies: 2 }, 2, 4);
t('virada: Top 10 ganha troféu e bônus', ro.top10 && ro.st.trophies === 3 && ro.reward.coins === 1500 && ro.reward.gems === 35, ro);

// ---------- bots ----------
t('100 bots com nomes únicos', K.BOTS.length === 100 && new Set(K.BOT_NAMES).size === 100);
const now = D(2026, 11, 20, 15);
const a = K.botScores(now), b = K.botScores(now);
t('bots determinísticos (mesmo instante = mesma tabela)', JSON.stringify(a) === JSON.stringify(b));
const end = K.botScores(K.seasonEnd(1) - 1000).sort((x, y) => y.points - x.points);
t('fim da temporada: 1º perto de 2.800', Math.abs(end[0].points - 2800) <= 60, end[0].points);
t('fim da temporada: 100º perto de 700', Math.abs(end[99].points - 700) <= 60, end[99].points);
const st1 = K.botScores(K.seasonStart(1) + 3600000).sort((x, y) => y.points - x.points);
t('começo da temporada: cerca de metade da meta', st1[0].points > 1200 && st1[0].points < 1600, st1[0].points);
const s1 = K.botScores(D(2026, 11, 28)).sort((x, y) => y.points - x.points).map((x) => x.name).slice(0, 10);
const s2 = K.botScores(D(2026, 12, 28)).sort((x, y) => y.points - x.points).map((x) => x.name).slice(0, 10);
t('ordem muda de uma temporada para outra', s1.join() !== s2.join());
const h1 = K.botScores(D(2026, 11, 20, 10)), h2 = K.botScores(D(2026, 11, 20, 11));
const moved = h1.filter((x, i) => x.points !== h2[i].points).length;
t('pontos dos bots oscilam de hora em hora', moved > 50, moved);
const maxJump = Math.max(...h1.map((x, i) => Math.abs(x.points - h2[i].points)));
t('oscilação por hora pequena', maxJump < 60, maxJump);
t('alguns bots têm troféus', a.filter((x) => x.trophies > 0).length >= 5 && a.filter((x) => x.trophies > 0).length <= 40);
t('cada bot tem personagem favorito válido', a.every((x) => ['solkar', 'lunara', 'bront', 'astrael', 'noxara', 'vex'].includes(x.fav)));

// ---------- multidão e posição ----------
const bd0 = K.board(now, [], { id: 'me', name: 'Eu', points: 0 });
t('com 0 pontos fica bem abaixo do 100º (~#1.400+)', bd0.myPos > 1300, bd0.myPos);
t('multidão cresce por dia com teto', K.crowdSize(D(2026, 11, 2)) < K.crowdSize(D(2026, 11, 30)) && K.crowdSize(D(2040, 1, 1)) === K.CROWD_MAX);
t('acima do corte não há multidão acima', K.crowdAbove(5000, 700, 1400) === 0);
t('fórmula da multidão', K.crowdAbove(350, 700, 1400) === Math.round(1400 * Math.pow(0.5, 2.5)));
const bdTop = K.board(now, [], { id: 'me', name: 'Eu', points: 99999 });
t('com muitos pontos fica em 1º', bdTop.myPos === 1 && bdTop.top[0].me);
const reals = [{ id: 'r1', name: 'Real1', points: 99998 }, { id: 'r2', name: 'Real2', points: 10 }];
const bdR = K.board(now, reals, { id: 'me', name: 'Eu', points: 99997 });
t('jogadores reais entram na tabela e na posição', bdR.myPos === 2 && bdR.top[0].name === 'Real1', bdR.myPos);
t('Top 100 mostra no máximo 100', bdR.top.length === 100);
const many = Array.from({ length: 50 }, (_, i) => ({ id: 'x' + i, name: 'R' + i, points: 100 }));
t('bots saem aos poucos com muitos jogadores reais', K.board(now, many, null).rows.filter((x) => x.bot).length === 70);
const fp = K.finalPosition(1, 3000, [3100]);
t('posição final da temporada conta bots + reais', fp === 2, fp);

// ---------- adversário e IA ----------
const far = K.pickOpponent(now, { points: 40 }, 1400, 'x1');
t('longe do Top 100: adversário da multidão com pontos parecidos', far.crowd && Math.abs(far.points - 40) <= 80 && far.name.length > 2, far);
const near = K.pickOpponent(now, { points: 1500 }, 60, 'x2');
const six = K.botScores(now).sort((x, y) => Math.abs(x.points - 1500) - Math.abs(y.points - 1500)).slice(0, 6).map((x) => x.name);
t('perto do Top 100: um dos 6 bots mais próximos', !near.crowd && six.includes(near.name), near);
t('mesma semente = mesmo adversário', JSON.stringify(K.pickOpponent(now, { points: 40 }, 1400, 'z')) === JSON.stringify(K.pickOpponent(now, { points: 40 }, 1400, 'z')));
t('IA fácil nas ligas baixas', K.aiFor(0, 1).level === 0);
t('IA difícil nas ligas altas', K.aiFor(5, 1).level === 2 && K.aiFor(5, 1).ultStart === 50);
t('nível do jogador deixa a IA mais forte', K.aiFor(0, 8).level === 1);

console.log(`\n${ok} testes passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
