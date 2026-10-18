// Loop principal com passo fixo de 60 Hz
(function (RR) {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  let W = 0, H = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    RR.view = { w: W, h: H, base: H / 720 };
    RR.input.layout();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      RR.ui.pause();
      RR.audio.suspend();
    } else RR.audio.resume();
  });
  // chamados pelo app Android
  RR.onAppPause = () => {
    RR.ui.pause();
    RR.audio.suspend();
  };
  RR.onAppResume = () => RR.audio.resume();
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  RR.ui.init();
  resize();

  const STEP = 1 / 60;
  let last = performance.now();
  let acc = 0;
  let time = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    acc += dt;
    const m = RR.match;
    let steps = 0;
    while (acc >= STEP && steps < 4) {
      acc -= STEP;
      steps++;
      if (m && !RR.paused) {
        m.step();
        time++;
      }
    }
    if (acc > STEP) acc = 0;
    RR.renderAlpha = acc / STEP;
    if (m) {
      RR.render.draw(ctx, m, W, H, time);
      if (!m.demo) RR.input.updateHUD(m.fighters.find((f) => f.isHuman));
    }
    RR.ui.tick(time);
  }
  requestAnimationFrame(loop);
})(window.RR);
