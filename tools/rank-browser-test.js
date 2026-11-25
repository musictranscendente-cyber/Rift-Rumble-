// Teste da Ranqueada no navegador com uma nuvem simulada (mesmas regras do supabase/ranking.sql).
// Uso: NODE_PATH=$(npm root -g) node tools/rank-browser-test.js [pasta-das-capturas]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || '.';
const CLOUD = 'https://test.supabase.co';
let ok = 0, fail = 0;
const t = (name, cond, info) => { if (cond) { ok++; console.log('ok  ', name); } else { fail++; console.log('FALHOU', name, info !== undefined ? JSON.stringify(info) : ''); } };

// ---------- nuvem simulada ----------
const db = new Map(); // user_id -> linha
let clock = Date.now(); // relógio do servidor (o teste avança)
let offline = false;
const others = [
  { user_id: 'u-real-1', name: 'RealAna', fav: 'lunara', season: 1, points: 1500, max_league: 3, streak: 0, wins: 50, losses: 30, trophies: 1, prev_points: 0 },
  { user_id: 'u-real-2', name: 'RealBeto', fav: 'bront', season: 1, points: 30, max_league: 0, streak: 0, wins: 1, losses: 2, trophies: 0, prev_points: 0 },
];
for (const r of others) db.set(r.user_id, Object.assign({ updated_at: clock - 3600e3 }, r));
const guard = (op, old, nw) => {
  if (op === 'INSERT') { if (nw.points > 40) return 'linha nova: no maximo 40 pontos'; nw.trophies = 0; nw.prev_points = 0; }
  else {
    if (nw.season < old.season) return 'temporada nao volta';
    const passou = (clock - old.updated_at) / 1000;
    if (nw.season === old.season) {
      if (nw.points > old.points) {
        if (passou < 20) return 'muito rapido';
        if (nw.points > old.points + 40 * Math.max(1, Math.floor(passou / 40))) return 'subiu pontos demais';
      }
      if (nw.trophies !== old.trophies) return 'trofeu so na virada';
      nw.prev_points = old.prev_points;
    } else {
      if (nw.points > Math.floor(old.points / 2) + 40) return 'virada: pontos demais';
      if (nw.trophies > old.trophies + 1 || nw.trophies < old.trophies) return 'virada: trofeu invalido';
    }
  }
  nw.updated_at = clock;
  return null;
};
let rejected = 0;
async function handle(route) {
  const req = route.request();
  const u = new URL(req.url());
  const json = (code, body) => route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(body) });
  if (offline) return route.abort('internetdisconnected');
  if (u.pathname === '/auth/v1/signup' || u.pathname === '/auth/v1/token') {
    return json(200, { access_token: 'tok-me', refresh_token: 'ref-me', expires_in: 3600, user: { id: 'u-me' } });
  }
  if (u.pathname === '/rest/v1/ranked_players') {
    const auth = req.headers()['authorization'] || '';
    const uidEq = (u.searchParams.get('user_id') || '').replace('eq.', '');
    if (req.method() === 'GET') {
      let rows = [...db.values()];
      if (uidEq) rows = rows.filter((r) => r.user_id === uidEq);
      return json(200, rows.sort((a, b) => b.points - a.points));
    }
    if (auth !== 'Bearer tok-me') return json(401, { message: 'not logged' });
    const body = JSON.parse(req.postData());
    if (req.method() === 'POST') {
      if (body.user_id !== 'u-me') return json(403, { message: 'RLS' });
      if (db.has('u-me')) return json(409, { message: 'duplicate key' });
      const err = guard('INSERT', null, body);
      if (err) { rejected++; return json(400, { message: err }); }
      db.set('u-me', body);
      return json(201, [body]);
    }
    if (req.method() === 'PATCH') {
      if (uidEq !== 'u-me') return json(200, []);
      const old = db.get('u-me');
      if (!old) return json(200, []);
      const nw = Object.assign({}, old, body);
      const err = guard('UPDATE', old, nw);
      if (err) { rejected++; return json(400, { message: err }); }
      db.set('u-me', nw);
      return json(200, [nw]);
    }
  }
  return json(404, {});
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 900, height: 420 }, deviceScaleFactor: 1.5 });
  await ctx.addInitScript((url) => {
    window.RR = window.RR || {};
    RR.RANK_CLOUD = { url, anonKey: 'anon-test' };
    if (!localStorage.getItem('rr_help')) localStorage.setItem('rr_help', '9');
  }, CLOUD);
  await ctx.route(CLOUD + '/**', handle);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const file = 'file://' + path.join(__dirname, '..', 'web', 'index.html');
  await page.goto(file);
  await page.waitForTimeout(1500);
  // relógio da ranqueada: meio da temporada 1
  const T0 = Date.UTC(2026, 10, 20, 12);
  await page.evaluate((T0) => { RR.rank.clock = () => T0 + (window.__adv || 0); }, T0);

  // 1. sem conta: vê o ranking, mas precisa entrar para jogar
  await page.click('#openRanked');
  await page.waitForTimeout(800);
  t('sem conta: botão de jogar pede para entrar', await page.$eval('#rkPlay', (b) => b.disabled));
  t('ranking mostra 100 linhas', (await page.$$('#rkRows .rk-row')).length === 100);
  t('jogador real aparece na lista', await page.$eval('#rkRows', (e) => e.textContent.includes('RealAna')));
  const pos0 = await page.evaluate(() => RR.rank.lastBoard.myPos);
  t('com 0 pontos fica bem abaixo do Top 100', pos0 > 1300, pos0);
  t('sua linha fixa embaixo da lista', await page.$eval('#rkMine', (e) => e.style.display !== 'none' && e.textContent.includes('#')));
  await page.screenshot({ path: out + '/rk-1-ranking.png' });

  // 2. criar conta
  await page.click('#rkAcc .btn');
  await page.fill('#lgEmail', 'teste@exemplo.com');
  await page.fill('#lgPass', 'segredo123');
  await page.fill('#lgName', 'TesteBR');
  await page.click('#lgUp');
  await page.waitForTimeout(1200);
  t('logado após criar conta', await page.evaluate(() => RR.rank.isLogged()));
  t('linha criada na nuvem com INSERT', db.has('u-me') && db.get('u-me').name === 'TesteBR' && db.get('u-me').points === 0, db.get('u-me'));
  t('botão de jogar liberado', !(await page.$eval('#rkPlay', (b) => b.disabled)));

  // 3. partida ranqueada: procura -> encontrado -> VS -> luta
  clock += 60e3;
  await page.click('#rkPlay');
  await page.waitForTimeout(300);
  t('tela procurando adversário', await page.$eval('#mmTitle', (e) => /SEARCHING|PROCURANDO/.test(e.textContent)));
  await page.screenshot({ path: out + '/rk-2-procurando.png' });
  await page.waitForFunction(() => document.querySelector('#screen-mm').classList.contains('vs'), null, { timeout: 8000 });
  await page.screenshot({ path: out + '/rk-3-vs.png' });
  await page.waitForFunction(() => RR.match && RR.match.ranked && RR.ui.current() === 'game', null, { timeout: 8000 });
  const label = await page.evaluate(() => RR.match.fighters[1].label);
  const oppName = await page.evaluate(() => RR.match.ranked.opp.name);
  t('nome do adversário no lugar de CPU1', label === oppName.slice(0, 12) && label !== 'CPU1', label);
  t('marca de partida em andamento', await page.evaluate(() => !!localStorage.getItem('rr_rk_live') && localStorage.getItem('rr_rk_live') !== 'null'));
  t('sem botão reiniciar na ranqueada', await page.$eval('#restart', (b) => b.classList.contains('hidden')));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: out + '/rk-4-luta.png' });
  // vitória
  await page.evaluate(() => { const m = RR.match; m.fighters[1].stocks = 0; m.fighters[1].kos = 0; m.endMatch(); });
  await page.waitForFunction(() => RR.ui.current() === 'results', null, { timeout: 9000 });
  await page.waitForTimeout(500);
  const st1 = await page.evaluate(() => RR.rank.state());
  t('vitória: +20 ou mais', st1.points >= 20 && st1.wins === 1, st1);
  t('tela final mostra os pontos ganhos', await page.$eval('#resProg .rk-res', (e) => /\+\d+/.test(e.textContent)));
  t('botões Próxima partida e Ranking', await page.$eval('#rkAgain', (b) => getComputedStyle(b).display !== 'none') && await page.$eval('#rkBoard', (b) => getComputedStyle(b).display !== 'none'));
  await page.screenshot({ path: out + '/rk-5-resultado.png' });
  await page.waitForTimeout(500);
  t('nuvem recebeu a vitória (UPDATE)', db.get('u-me').points === st1.points, db.get('u-me').points);

  // 4. segunda vitória logo em seguida: o banco recusa (menos de 20 s) -> fica pendente no aparelho
  await page.evaluate(() => { RR.ui.startRanked({ opp: { name: 'Teste', fav: 'vex', points: 0, league: 0 }, ai: { level: 0, ultStart: 0 } }); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const m = RR.match; m.fighters[1].stocks = 0; m.endMatch(); });
  await page.waitForFunction(() => RR.ui.current() === 'results', null, { timeout: 9000 });
  await page.waitForTimeout(600);
  const st2 = await page.evaluate(() => RR.rank.state());
  t('envio recusado pelo banco fica pendente', st2.pending === true && db.get('u-me').points < st2.points && rejected >= 1, { local: st2.points, cloud: db.get('u-me').points });
  // 5. sem internet ao abrir o ranking: continua pendente, sem erro
  offline = true;
  await page.click('#rkBoard');
  await page.waitForTimeout(800);
  t('sem internet: continua pendente', (await page.evaluate(() => RR.rank.state().pending)) === true);
  // 6. volta a internet e passa o tempo: reenvia ao abrir o ranking
  offline = false;
  clock += 60e3;
  await page.click('#screen-ranked [data-back]');
  await page.click('#openRanked');
  await page.waitForTimeout(1000);
  t('reenvio depois: nuvem igual ao aparelho', db.get('u-me').points === st2.points && !(await page.evaluate(() => RR.rank.state().pending)), db.get('u-me').points);
  t('sua linha aparece destacada', await page.$$eval('.rk-row.me', (r) => r.length >= 1));

  // 7. desistir pelo menu de pausa = derrota
  clock += 60e3;
  await page.evaluate(() => { RR.ui.startRanked({ opp: { name: 'Teste', fav: 'vex', points: 0, league: 0 }, ai: { level: 0, ultStart: 0 } }); });
  await page.waitForTimeout(400);
  const beforeQuit = await page.evaluate(() => RR.rank.state().points);
  await page.evaluate(() => RR.ui.pause());
  await page.click('#quit');
  await page.waitForTimeout(500);
  const afterQuit = await page.evaluate(() => RR.rank.state());
  t('desistência conta derrota (-12)', afterQuit.points === beforeQuit - 12 && afterQuit.losses === 1, afterQuit);
  t('aviso de desistência só fecha no OK', await page.evaluate(() => RR.ui.current() === 'notice'));
  await page.click('#ntOk');

  // 8. partida abandonada (app fechado no meio)
  await page.evaluate(() => localStorage.setItem('rr_rk_live', JSON.stringify({ oppPoints: 100, at: Date.now() })));
  const beforeAb = afterQuit.points;
  await page.reload();
  await page.waitForTimeout(1800);
  const ab = await page.evaluate(() => RR.rank.state());
  t('abandono conta derrota ao abrir de novo', ab.points === Math.max(0, beforeAb - 12) && ab.losses === 2, ab);
  await page.waitForTimeout(600);
  t('abandono também chega na nuvem (UPDATE, não INSERT)', db.get('u-me').losses === 2 && db.get('u-me').points === ab.points, db.get('u-me'));
  t('aviso de abandono na tela', await page.evaluate(() => RR.ui.current() === 'notice' && document.querySelector('#ntTitle').textContent.length > 0));
  await page.screenshot({ path: out + '/rk-6-abandono.png' });
  await page.click('#ntOk');

  // 9. virada de temporada (relógio pula para dezembro)
  clock += 60e3;
  const prev = await page.evaluate(() => RR.rank.state());
  const coins0 = await page.evaluate(() => RR.progress.coins());
  await page.evaluate((T1) => { RR.rank.clock = () => T1; }, Date.UTC(2026, 11, 3, 12));
  await page.evaluate(() => RR.rank.open());
  await page.waitForTimeout(1200);
  const ro = await page.evaluate(() => RR.rank.state());
  t('virada: pontos pela metade e temporada nova', ro.season === 2 && ro.points === Math.floor(prev.points / 2) && ro.prevPoints === prev.points, ro);
  t('virada: prêmio da maior liga em moedas', (await page.evaluate(() => RR.progress.coins())) - coins0 === [50, 120, 250, 400, 600, 1000][prev.maxLeague]);
  t('virada: janela de prêmio só fecha no OK', await page.evaluate(() => RR.ui.current() === 'notice'));
  await page.screenshot({ path: out + '/rk-7-temporada.png' });
  await page.click('#ntOk');
  await page.waitForTimeout(600);
  t('nuvem aceitou a virada', db.get('u-me').season === 2 && db.get('u-me').points === ro.points && db.get('u-me').prev_points === prev.points, db.get('u-me'));
  // trapaça: tentar mandar pontos demais direto para o banco é recusado
  const cheat = await page.evaluate(async () => { const s = RR.rank.state(); s.points += 500; return true; });
  clock += 60e3;
  await page.evaluate(() => RR.rank.open());
  await page.waitForTimeout(900);
  t('trapaça (+500 de uma vez) recusada pelo banco', db.get('u-me').points === ro.points && cheat, db.get('u-me').points);
  await page.screenshot({ path: out + '/rk-8-ranking-logado.png' });

  // 10. celular em pé
  await page.setViewportSize({ width: 420, height: 860 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: out + '/rk-9-em-pe.png' });

  t('nenhum erro no navegador', errors.length === 0, errors);
  console.log(`\n${ok} verificações passaram, ${fail} falharam`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
