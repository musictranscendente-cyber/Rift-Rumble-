// Gera os ícones do app (PNG) desenhando o Kael com o próprio código do jogo.
// Uso: NODE_PATH=$(npm root -g) node tools/make-icon.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(root, 'web', 'index.html'));
  await page.waitForTimeout(500);
  for (const [dpi, size] of Object.entries(Object.assign({ store: 512 }, sizes))) {
    const data = await page.evaluate((S) => {
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const ctx = c.getContext('2d');
      const k = S / 512;
      ctx.scale(k, k);
      RR.render.roundRect(ctx, 16, 16, 480, 480, 110);
      ctx.save();
      ctx.clip();
      const g = ctx.createRadialGradient(256, 300, 20, 256, 256, 360);
      g.addColorStop(0, '#ffb23e');
      g.addColorStop(0.35, '#c0569a');
      g.addColorStop(1, '#140f3a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 10;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(256 + Math.cos(a) * 150, 290 + Math.sin(a) * 150);
        ctx.lineTo(256 + Math.cos(a) * 340, 290 + Math.sin(a) * 340);
        ctx.stroke();
      }
      ctx.translate(250, 440);
      ctx.scale(3.4, 3.4);
      RR.render.drawModel(ctx, RR.chars.kael, { legF: 0.6, legB: -0.5, armF: 2.6, armB: -1.2, lean: 0.1, bob: 0, crouch: 0, sx: 1, sy: 1, eyes: 'open' }, 0);
      ctx.restore();
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#ffd166';
      RR.render.roundRect(ctx, 23, 23, 466, 466, 104);
      ctx.stroke();
      return c.toDataURL('image/png').split(',')[1];
    }, size);
    const out = dpi === 'store' ? path.join(root, 'android', 'icon-512.png') : path.join(root, 'android', 'res', 'mipmap-' + dpi, 'ic_launcher.png');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data, 'base64'));
  }
  await browser.close();
  console.log('ícones gerados');
})();
