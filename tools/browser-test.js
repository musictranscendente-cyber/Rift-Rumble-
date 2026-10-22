// Teste no navegador: abre o jogo com toque emulado, navega nos menus, joga e tira capturas.
// Uso: NODE_PATH=$(npm root -g) node tools/browser-test.js <pasta-de-saida>
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || '.';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 800, height: 380 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // jogador que já voltou (na primeira visita o jogo entra direto numa luta)
  await ctx.addInitScript(() => localStorage.setItem('rr_help', '2'));
  await page.goto('file://' + path.join(__dirname, '..', 'web', 'index.html'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '/1-title.png' });
  await page.tap('[data-go=select]');
  await page.waitForTimeout(400);
  await page.tap('.char-card[data-id=bront]');
  await page.tap('#optBots button[data-v="3"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/2-select.png' });
  await page.tap('#toStage');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/3-stage.png' });
  await page.tap('#startFight');
  await page.waitForTimeout(3500);
  // joga um pouco: anda, pula, ataca
  const kb = page.keyboard;
  await kb.down('KeyD'); await page.waitForTimeout(500); await kb.up('KeyD');
  for (let i = 0; i < 6; i++) { await kb.press('KeyJ'); await page.waitForTimeout(90); }
  await kb.press('Space'); await page.waitForTimeout(200); await kb.press('KeyK');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out + '/4-fight.png' });
  // força a ultimate
  await page.evaluate(() => { RR.match.fighters[0].ult = 100; });
  await kb.press('KeyU');
  await page.waitForTimeout(450);
  await page.screenshot({ path: out + '/5-ult.png' });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: out + '/6-fight2.png' });
  // acelera até o fim: humano vira bot
  await page.evaluate(() => {
    const m = RR.match; m.fighters[0].ctrl = new RR.AIController(2);
    for (let i = 0; i < 60 * 60 * 10 && m.phase !== 'done'; i++) m.step();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out + '/7-results.png' });
  const st = await page.evaluate(() => ({ phase: RR.match.phase, screen: RR.ui.current() }));
  console.log('estado final', st);
  console.log('erros', errors.length ? errors : 'nenhum');
  await browser.close();
})();
