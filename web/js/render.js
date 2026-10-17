// Renderização em Canvas 2D: cenário, personagens, projéteis, efeitos e HUD
(function (RR) {
  const U = RR.U;
  const R = (RR.render = {});
  const TAU = Math.PI * 2;

  // estrelas/nuvens fixas por arena
  const deco = {};
  function getDeco(st) {
    if (deco[st.id]) return deco[st.id];
    const stars = [], clouds = [], peaks = [], peaks2 = [];
    for (let i = 0; i < 70; i++) stars.push({ x: Math.random(), y: Math.random() * 0.7, r: Math.random() * 1.6 + 0.4, p: Math.random() * TAU });
    for (let i = 0; i < 6; i++) clouds.push({ x: Math.random() * 3000 - 1500, y: -700 + Math.random() * 500, s: 0.6 + Math.random() * 0.8 });
    for (let i = 0; i <= 16; i++) peaks.push(0.25 + Math.random() * 0.35);
    for (let i = 0; i <= 12; i++) peaks2.push(0.15 + Math.random() * 0.3);
    return (deco[st.id] = { stars, clouds, peaks, peaks2 });
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  R.roundRect = roundRect;

  function text(ctx, str, x, y, size, color, align, stroke) {
    ctx.font = `900 ${size}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    if (stroke !== false) {
      ctx.lineWidth = Math.max(3, size * 0.14);
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineJoin = 'round';
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }
  R.text = text;

  // ---------------- Fundo ----------------
  function drawBackground(ctx, g, W, H, time) {
    const st = g.stage, th = st.theme, d = getDeco(st);
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, th.sky[0]);
    grd.addColorStop(0.55, th.sky[1]);
    grd.addColorStop(1, th.sky[2]);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    const cx = g.cam.x, cy = g.cam.y;
    // estrelas / brasas
    for (const s of d.stars) {
      const x = ((s.x * W - cx * 0.03) % W + W) % W;
      if (th.lava) {
        const y = (((s.y + 0.3) * H - time * (0.6 + s.r * 0.4)) % H + H) % H;
        ctx.fillStyle = U.rgba('#ff9a3c', 0.35 + 0.35 * Math.sin(time * 0.05 + s.p));
        ctx.fillRect(x, y, s.r * 1.6, s.r * 1.6);
      } else {
        ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.4 * Math.sin(time * 0.03 + s.p)})`;
        ctx.fillRect(x, s.y * H - cy * 0.02, s.r, s.r);
      }
    }
    // montanhas em paralaxe
    const layer = (peaks, color, par, base, amp) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      const n = peaks.length - 1;
      const span = W * 1.6;
      const off = -((cx * par) % (span / n)) - span * 0.2;
      ctx.moveTo(-10, H);
      for (let i = 0; i <= n + 2; i++) {
        const x = off + (i * span) / n;
        const y = H * base - peaks[i % (n + 1)] * H * amp - cy * par * 0.3;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W + 10, H);
      ctx.closePath();
      ctx.fill();
    };
    layer(d.peaks2, th.far, 0.08, 0.78, 0.6);
    layer(d.peaks, th.mid, 0.18, 0.92, 0.55);
    if (th.lava) {
      const ly = H * 0.86 - cy * 0.05;
      const lg = ctx.createLinearGradient(0, ly - 40, 0, H);
      lg.addColorStop(0, 'rgba(255,120,0,0)');
      lg.addColorStop(0.3, 'rgba(255,90,0,0.55)');
      lg.addColorStop(1, 'rgba(255,200,60,0.9)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, ly - 40, W, H - ly + 40);
    }
  }

  function drawStage(ctx, g, time) {
    const st = g.stage, th = st.theme;
    // nuvens no espaço do mundo (atrás do palco)
    if (!th.lava) {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      for (const c of getDeco(st).clouds) {
        const x = c.x + Math.sin(time * 0.002 + c.y) * 60;
        ctx.beginPath();
        ctx.ellipse(x, c.y, 160 * c.s, 40 * c.s, 0, 0, TAU);
        ctx.ellipse(x + 90 * c.s, c.y - 20 * c.s, 100 * c.s, 40 * c.s, 0, 0, TAU);
        ctx.fill();
      }
    }
    for (const s of st.solids) {
      // ilha flutuante
      const gr = ctx.createLinearGradient(0, s.y, 0, s.y + s.h);
      gr.addColorStop(0, th.body);
      gr.addColorStop(1, th.bodyDark);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.w, s.y);
      ctx.lineTo(s.x + s.w - 20, s.y + s.h * 0.45);
      ctx.lineTo(s.x + s.w * 0.72, s.y + s.h * 0.78);
      ctx.lineTo(s.x + s.w * 0.55, s.y + s.h);
      ctx.lineTo(s.x + s.w * 0.4, s.y + s.h * 0.85);
      ctx.lineTo(s.x + s.w * 0.22, s.y + s.h * 0.7);
      ctx.lineTo(s.x + 20, s.y + s.h * 0.45);
      ctx.closePath();
      ctx.fill();
      // blocos
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 3;
      for (let row = 0; row < 3; row++) {
        const y = s.y + 34 + row * 34;
        const inset = 20 + row * 26;
        ctx.beginPath();
        ctx.moveTo(s.x + inset, y);
        ctx.lineTo(s.x + s.w - inset, y);
        ctx.stroke();
        for (let x = s.x + inset + (row % 2) * 40; x < s.x + s.w - inset; x += 80) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 34);
          ctx.stroke();
        }
      }
      // superfície
      ctx.fillStyle = th.topDark;
      ctx.fillRect(s.x, s.y, s.w, 18);
      ctx.fillStyle = th.top;
      ctx.fillRect(s.x, s.y, s.w, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(s.x, s.y, s.w, 3);
      // bordas
      ctx.fillStyle = th.accent;
      ctx.fillRect(s.x - 4, s.y - 2, 10, 14);
      ctx.fillRect(s.x + s.w - 6, s.y - 2, 10, 14);
    }
    for (const p of st.plats) {
      const glow = 0.5 + 0.3 * Math.sin(time * 0.05 + p.x);
      ctx.fillStyle = U.rgba(th.platGlow, 0.25 * glow);
      roundRect(ctx, p.x - 6, p.y - 6, p.w + 12, 26, 10);
      ctx.fill();
      ctx.fillStyle = th.plat;
      roundRect(ctx, p.x, p.y, p.w, 12, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(p.x + 8, p.y + 8, p.w - 16, 4);
    }
  }

  // ---------------- Personagens ----------------
  function limb(ctx, x, y, a, len, w, color) {
    const ex = x + Math.sin(a) * len, ey = y + Math.cos(a) * len;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    return [ex, ey];
  }

  function computePose(f, time) {
    const p = { legF: 0.15, legB: -0.15, armF: 0.4, armB: -0.3, lean: 0, bob: 0, crouch: 0, sx: 1, sy: 1, spin: 0, eyes: 'open', alpha: 1, stars: false };
    const s = f.anim.squash;
    if (s > 1) { p.sy = 1 - (s - 1) * 0.7; p.sx = 1 + (s - 1) * 0.5; }
    else if (s < 1) { p.sy = 1 + (1 - s) * 0.7; p.sx = 1 - (1 - s) * 0.4; }
    switch (f.state) {
      case 'idle':
        p.bob = Math.sin(time * 0.1 + f.slot) * 1.5;
        p.armF = 0.35 + Math.sin(time * 0.1) * 0.06;
        break;
      case 'run': {
        f.anim.run += Math.abs(f.vx) * 0.045;
        const ph = f.anim.run;
        p.legF = Math.sin(ph) * 0.9;
        p.legB = -p.legF;
        p.armF = -Math.sin(ph) * 0.8 + 0.3;
        p.armB = Math.sin(ph) * 0.8;
        p.lean = 0.14;
        p.bob = -Math.abs(Math.sin(ph)) * 3;
        break;
      }
      case 'air':
        p.legF = 0.7;
        p.legB = -0.1;
        p.armF = f.vy < 0 ? 2.4 : 1.2;
        p.armB = f.vy < 0 ? -2.2 : -1.0;
        if (f.jumpT > 90 && f.vy < 0 && f.def.jumps > 0) p.spin = 0;
        break;
      case 'helpless':
        p.armF = 2.9;
        p.armB = -2.9;
        p.legF = 0.3;
        p.alpha = 0.85;
        break;
      case 'landing':
      case 'shield':
      case 'spotdodge':
        p.crouch = 0.22;
        p.armF = 1.3;
        p.armB = 0.6;
        if (f.state === 'spotdodge') p.alpha = 0.5;
        break;
      case 'roll':
        p.spin = (f.stateT / 26) * TAU * (f.mvar.dir * f.facing);
        p.crouch = 0.25;
        p.alpha = f.intangible() ? 0.5 : 1;
        break;
      case 'airdodge':
        p.alpha = f.intangible() ? 0.45 : 1;
        p.armF = 1.0;
        p.legF = 0.8;
        break;
      case 'ledge':
        p.armF = 3.0;
        p.armB = 3.1;
        p.legF = 0.2;
        p.legB = -0.1;
        break;
      case 'hitstun':
        p.armF = 2.5;
        p.armB = -2.4;
        p.legF = 0.9;
        p.legB = -0.7;
        p.eyes = 'x';
        p.spin = f.anim.spin;
        break;
      case 'stunned':
        p.lean = Math.sin(time * 0.3) * 0.25;
        p.armF = 0.1;
        p.armB = -0.1;
        p.eyes = 'x';
        p.stars = true;
        break;
      case 'respawn':
        p.armF = 0.5;
        break;
      case 'attack': {
        const m = f.move, t = f.moveT;
        const wind = t < m.startup;
        const act = !wind && t < m.startup + m.active;
        const k = act ? (t - m.startup) / Math.max(1, m.active - 1) : wind ? 0 : 1;
        const L = (a, b) => (wind ? a : act ? U.lerp(a, b, k) : b);
        switch (m.anim) {
          case 'swing': p.armF = L(-2.4, 1.5); p.lean = act ? 0.2 : 0.05; p.legF = 0.5; p.legB = -0.4; break;
          case 'swing2': p.armF = L(1.6, -1.2); p.armB = 0.8; p.lean = 0.1; p.legF = 0.4; p.legB = -0.4; break;
          case 'up': p.armF = L(0.6, 3.1); p.legF = 0.2; break;
          case 'low': p.crouch = 0.3; p.armF = L(-0.3, 1.7); p.legF = 0.9; p.legB = -0.6; break;
          case 'spin': p.spin = act ? k * TAU : 0; p.armF = 1.6; p.armB = -1.6; p.legF = 0.8; break;
          case 'down': p.armF = L(2.6, 0.0); p.legF = 0.4; p.legB = 0.3; break;
          case 'cast': p.armF = wind ? 2.0 : 1.55; p.armB = 1.3; p.lean = 0.08; break;
          case 'dash': p.lean = 0.45; p.armF = 1.9; p.armB = -1.9; p.legF = 0.9; p.legB = -1.0; break;
          case 'rise': p.armF = 2.95; p.armB = 2.6; p.spin = act ? k * TAU * 1.5 : 0; p.legF = 0.2; break;
          case 'slam': p.armF = wind ? 3.0 : 0.4; p.armB = wind ? -3.0 : -0.4; p.crouch = act ? 0.25 : 0; break;
          case 'big': p.armF = L(-2.9, 1.9); p.lean = act ? 0.3 : -0.1; p.legF = 0.7; p.legB = -0.6; break;
        }
        if (f.hidden) p.alpha = 0;
        break;
      }
    }
    if (f.invuln > 0 && f.state !== 'respawn' && (f.invuln >> 2) % 2 === 0) p.alpha *= 0.45;
    if (f.state === 'respawn') p.alpha = 0.75 + 0.25 * Math.sin(time * 0.2);
    // piscada
    if (p.eyes === 'open' && (time + f.slot * 37) % 180 < 6) p.eyes = 'blink';
    return p;
  }

  function drawModel(ctx, d, p, time, tint) {
    const H = d.h, W = d.w;
    const C = (c) => tint || c;
    const main = C(d.color), sec = C(d.color2), dark = C(d.dark);
    const skin = C('#ffe0c2');
    const cr = p.crouch * H * 0.2;
    const hipY = -H * 0.3 + cr;
    const shY = -H * 0.62 + cr + p.bob;
    let headY = -H * 0.8 + cr + p.bob;
    let headR = H * 0.16;
    let torsoW = W * 0.62;
    const legLen = H * 0.3 - cr * 0.6;
    const armLen = H * 0.27;
    let limbW = W * 0.2;
    if (d.id === 'gorak') {
      headR = H * 0.12;
      headY = -H * 0.76 + cr + p.bob;
      torsoW = W * 0.95;
      limbW = W * 0.26;
    }
    ctx.save();
    ctx.rotate(p.lean);

    // perna e braço de trás
    if (d.id !== 'lumi') limb(ctx, -W * 0.08, hipY, p.legB, legLen, limbW, dark);
    else limb(ctx, -W * 0.08, hipY + legLen * 0.5, p.legB * 0.4, legLen * 0.55, limbW * 0.9, dark);
    const backHand = limb(ctx, -W * 0.12, shY + 6, p.armB, armLen, limbW * 0.85, dark);
    if (d.id === 'gorak') {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(backHand[0], backHand[1], H * 0.085, 0, TAU);
      ctx.fill();
    }

    // cachecol da Zyra (atrás do corpo)
    if (d.id === 'zyra') {
      ctx.strokeStyle = C('#ff4d6d');
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, shY - 2);
      for (let i = 1; i <= 5; i++) ctx.lineTo(-4 - i * 11, shY - 2 + Math.sin(time * 0.25 + i) * 5 + i * 2);
      ctx.stroke();
    }

    // tronco
    if (d.id === 'lumi') {
      // manto
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(-torsoW * 0.45, shY - 4);
      ctx.lineTo(torsoW * 0.45, shY - 4);
      ctx.lineTo(torsoW * 0.75, -4 + cr * 0.3);
      ctx.lineTo(-torsoW * 0.75, -4 + cr * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = sec;
      ctx.fillRect(-torsoW * 0.75, -12 + cr * 0.3, torsoW * 1.5, 7);
    } else {
      ctx.fillStyle = main;
      roundRect(ctx, -torsoW / 2, shY - 6, torsoW, hipY - shY + 14, 10);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-torsoW / 2, hipY - 4, torsoW, 7);
    }
    if (d.id === 'gorak') {
      // ombros de pedra e rachaduras brilhantes
      ctx.fillStyle = C('#8a6440');
      ctx.beginPath();
      ctx.arc(-torsoW * 0.45, shY, H * 0.11, 0, TAU);
      ctx.arc(torsoW * 0.45, shY, H * 0.11, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = C(d.color2);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, shY + 6);
      ctx.lineTo(2, shY + 18);
      ctx.lineTo(-4, shY + 30);
      ctx.moveTo(10, shY + 12);
      ctx.lineTo(16, shY + 24);
      ctx.stroke();
    }

    // perna da frente
    if (d.id !== 'lumi') limb(ctx, W * 0.08, hipY, p.legF, legLen, limbW, main);
    else limb(ctx, W * 0.08, hipY + legLen * 0.5, p.legF * 0.4, legLen * 0.55, limbW * 0.9, dark);

    // cabeça
    ctx.fillStyle = d.id === 'gorak' ? C('#b08860') : skin;
    ctx.beginPath();
    ctx.arc(2, headY, headR, 0, TAU);
    ctx.fill();
    if (d.id === 'kael') {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(-headR * 1.1, headY - headR * 0.1);
      ctx.lineTo(-headR * 1.3, headY - headR * 1.2);
      ctx.lineTo(-headR * 0.4, headY - headR * 0.9);
      ctx.lineTo(-headR * 0.1, headY - headR * 1.7);
      ctx.lineTo(headR * 0.4, headY - headR * 0.95);
      ctx.lineTo(headR * 1.2, headY - headR * 1.25);
      ctx.lineTo(headR * 1.1, headY - headR * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = sec;
      ctx.fillRect(-headR, headY - headR * 0.55, headR * 2.1, 4);
    } else if (d.id === 'zyra') {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(2, headY, headR, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fill();
      ctx.fillStyle = main;
      ctx.fillRect(-headR, headY + headR * 0.15, headR * 2.1, headR * 0.7);
      ctx.fillStyle = C('#ff4d6d');
      ctx.fillRect(-headR, headY - headR * 0.6, headR * 2.1, 5);
    } else if (d.id === 'lumi') {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(2, headY - headR * 0.7, headR * 1.6, headR * 0.35, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(-headR * 0.9, headY - headR * 0.8);
      ctx.lineTo(headR * 1.0, headY - headR * 0.8);
      ctx.quadraticCurveTo(headR * 0.2, headY - headR * 2.2, -headR * 1.4, headY - headR * 2.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = C('#ffd166');
      ctx.beginPath();
      ctx.arc(-headR * 1.4, headY - headR * 2.6, 4, 0, TAU);
      ctx.fill();
    } else if (d.id === 'gorak') {
      ctx.fillStyle = C('#8a6440');
      ctx.beginPath();
      ctx.moveTo(-headR, headY - headR * 0.3);
      ctx.lineTo(-headR * 0.4, headY - headR * 1.3);
      ctx.lineTo(headR * 0.5, headY - headR * 1.1);
      ctx.lineTo(headR * 1.1, headY - headR * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    // olhos
    const ex = headR * 0.45 + 2, ey = headY - headR * 0.05;
    if (p.eyes === 'x') {
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ex - 4, ey - 4); ctx.lineTo(ex + 4, ey + 4);
      ctx.moveTo(ex + 4, ey - 4); ctx.lineTo(ex - 4, ey + 4);
      ctx.stroke();
    } else if (p.eyes === 'blink') {
      ctx.fillStyle = '#111';
      ctx.fillRect(ex - 4, ey, 8, 2);
    } else {
      ctx.fillStyle = d.id === 'gorak' ? C(d.color2) : '#fff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 4, 5.5, 0, 0, TAU);
      ctx.fill();
      if (d.id !== 'gorak') {
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(ex + 1.5, ey, 2.4, 0, TAU);
        ctx.fill();
      }
    }

    // braço da frente + arma
    const sx = W * 0.12, sy = shY + 6;
    const hand = limb(ctx, sx, sy, p.armF, armLen, limbW * 0.9, d.id === 'gorak' ? main : skin);
    const a = p.armF;
    const dx = Math.sin(a), dy = Math.cos(a);
    if (d.id === 'kael') {
      const L = 62;
      ctx.strokeStyle = C('#e8eef5');
      ctx.lineWidth = 7;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(hand[0], hand[1]);
      ctx.lineTo(hand[0] + dx * L, hand[1] + dy * L);
      ctx.stroke();
      ctx.strokeStyle = C(d.fxColor);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(hand[0] + dx * 10, hand[1] + dy * 10);
      ctx.lineTo(hand[0] + dx * L, hand[1] + dy * L);
      ctx.stroke();
      ctx.strokeStyle = C('#5a3a22');
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(hand[0] - dy * 7, hand[1] + dx * 7);
      ctx.lineTo(hand[0] + dy * 7, hand[1] - dx * 7);
      ctx.stroke();
    } else if (d.id === 'zyra') {
      ctx.strokeStyle = C('#dff');
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(hand[0], hand[1]);
      ctx.lineTo(hand[0] + dx * 28, hand[1] + dy * 28);
      ctx.stroke();
    } else if (d.id === 'gorak') {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.arc(hand[0], hand[1], H * 0.095, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.arc(hand[0] + 3, hand[1] + 3, H * 0.05, 0, TAU);
      ctx.fill();
    } else if (d.id === 'lumi') {
      // cajado perpendicular ao braço (aponta para cima com o braço à frente)
      const ux = dy, uy = -dx;
      const tx = hand[0] + ux * 60, ty = hand[1] + uy * 60;
      const bx = hand[0] - ux * 26, by = hand[1] - uy * 26;
      ctx.strokeStyle = C('#7a5a3a');
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.fillStyle = C(U.rgba(d.color2, 0.35));
      ctx.beginPath();
      ctx.arc(tx, ty, 13 + Math.sin(time * 0.15) * 2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = C(d.color2);
      ctx.beginPath();
      ctx.moveTo(tx, ty - 9);
      ctx.lineTo(tx + 6, ty);
      ctx.lineTo(tx, ty + 9);
      ctx.lineTo(tx - 6, ty);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  R.drawModel = drawModel;

  function drawFighter(ctx, f, g, time) {
    if (f.state === 'dead' || f.state === 'out') return;
    const d = f.def;
    ctx.save();
    ctx.translate(f.x, f.y);
    if (f.state === 'respawn') {
      ctx.fillStyle = U.rgba(f.pcolor, 0.35);
      ctx.beginPath();
      ctx.ellipse(0, 6, 70, 16, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = f.pcolor;
      roundRect(ctx, -60, 0, 120, 10, 5);
      ctx.fill();
    }
    const p = computePose(f, time);
    if (p.alpha <= 0) {
      ctx.restore();
      return;
    }
    // sombra no chão
    if (f.grounded) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 0, f.w * 0.6, 6, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = p.alpha;
    if (p.spin) {
      ctx.translate(0, -f.h / 2);
      ctx.rotate(p.spin * f.facing);
      ctx.translate(0, f.h / 2);
    }
    ctx.scale(f.facing * p.sx, p.sy);
    let tint = null;
    if (f.flash > 0 && f.flash % 4 < 2) tint = '#ffffff';
    else if (f.frozen > 0) tint = '#bdf6ff';
    if (f.state === 'attack' && f.move.armor && f.hasArmor() && time % 6 < 3) tint = '#ffcc80';
    drawModel(ctx, d, p, time, tint);
    ctx.restore();

    if (p.stars) {
      for (let i = 0; i < 3; i++) {
        const a = time * 0.12 + (i * TAU) / 3;
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(f.x + Math.cos(a) * 26, f.y - f.h - 12 + Math.sin(a) * 6, 4, 0, TAU);
        ctx.fill();
      }
    }
    // escudo
    if (f.state === 'shield') {
      const r = 22 + (f.shieldHP / 100) * (f.h * 0.42);
      ctx.fillStyle = U.rgba(f.pcolor, 0.32);
      ctx.strokeStyle = U.rgba('#ffffff', 0.7);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y - f.h * 0.5, r, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    // golpe: rastro do ataque
    if (f.state === 'attack' && f.move.hits) {
      const m = f.move, t = f.moveT - m.startup;
      if (t >= 0 && t < m.active + 2) {
        const col = (RR.FX_COLORS[(m.hits[0] && m.hits[0].fx) || 'neutral'] || RR.FX_COLORS.neutral)[1];
        for (const h of m.hits) {
          if (h.t0 != null && t < h.t0) continue;
          if (h.t1 != null && t >= h.t1 + 2) continue;
          const r = f.hitRect(h);
          const a = 1 - Math.max(0, t - m.active + 2) / 3;
          ctx.save();
          ctx.globalAlpha = 0.55 * a;
          ctx.strokeStyle = col;
          ctx.lineWidth = Math.min(r.w, r.h) * 0.22;
          ctx.lineCap = 'round';
          ctx.beginPath();
          const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
          if (m.anim === 'spin' || h.radial) ctx.ellipse(cx, cy, r.w / 2.2, r.h / 2.2, 0, 0, TAU);
          else {
            const s0 = f.facing > 0 ? -Math.PI * 0.55 : Math.PI * 1.55;
            const s1 = f.facing > 0 ? Math.PI * 0.45 : Math.PI * 0.55;
            ctx.ellipse(cx - f.facing * r.w * 0.15, cy, r.w / 2.1, r.h / 2, 0, s0, s1, f.facing < 0);
          }
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    // etiqueta do jogador
    if (p.alpha > 0 && f.state !== 'respawn') {
      const ty = f.y - f.h - (d.id === 'lumi' ? 48 : 26);
      ctx.fillStyle = f.pcolor;
      ctx.beginPath();
      ctx.moveTo(f.x - 7, ty);
      ctx.lineTo(f.x + 7, ty);
      ctx.lineTo(f.x, ty + 9);
      ctx.closePath();
      ctx.fill();
      text(ctx, f.label, f.x, ty - 11, 15, f.pcolor);
    }
  }

  // ---------------- Projéteis ----------------
  function drawProjectile(ctx, p, g, time) {
    ctx.save();
    if (p.type === 'fireball') {
      const r = 17 + Math.sin(time * 0.6) * 2;
      const gr = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r * 1.6);
      gr.addColorStop(0, '#fff6c0');
      gr.addColorStop(0.4, '#ffb23e');
      gr.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 1.6, 0, TAU);
      ctx.fill();
    } else if (p.type === 'shard') {
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = '#c8fbff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(0, -8);
      ctx.lineTo(-14, 0);
      ctx.lineTo(0, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (p.type === 'wave') {
      const k = 1 - p.t / p.life;
      ctx.fillStyle = '#a67c52';
      for (let i = -1; i <= 1; i++) {
        const hh = (40 + i * -8) * (0.6 + 0.4 * Math.sin(p.t * 0.5 + i)) * (0.4 + k * 0.6) + 10;
        ctx.beginPath();
        ctx.moveTo(p.x + i * 16 - 12, p.y);
        ctx.lineTo(p.x + i * 16, p.y - hh);
        ctx.lineTo(p.x + i * 16 + 12, p.y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(p.x - 24, p.y - 4, 48, 4);
    } else if (p.type === 'beam') {
      const r = g.projRect(p);
      const k = p.t / p.life;
      const hh = r.h * (k < 0.85 ? 1 : (1 - k) / 0.15) * (0.9 + 0.1 * Math.sin(time * 0.8));
      const cy = r.y + r.h / 2;
      const gr = ctx.createLinearGradient(0, cy - hh / 2, 0, cy + hh / 2);
      gr.addColorStop(0, 'rgba(143,107,255,0)');
      gr.addColorStop(0.3, 'rgba(159,243,255,0.85)');
      gr.addColorStop(0.5, '#ffffff');
      gr.addColorStop(0.7, 'rgba(159,243,255,0.85)');
      gr.addColorStop(1, 'rgba(143,107,255,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(r.x, cy - hh / 2, r.w, hh);
      const ox = p.dir > 0 ? r.x : r.x + r.w;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(ox, cy, hh * 0.6, 0, TAU);
      ctx.fill();
    } else if (p.type === 'blast') {
      const k = p.t / p.life;
      ctx.strokeStyle = `rgba(255,179,71,${1 - k})`;
      ctx.lineWidth = 18 * (1 - k) + 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 70, (p.w / 2) * (0.4 + k * 0.7), 40 + k * 30, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFx(ctx, g) {
    for (const p of g.fx) {
      const k = p.life / p.max;
      if (p.type === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
        ctx.stroke();
      } else if (p.type === 'dot') {
        ctx.globalAlpha = k;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, TAU);
        ctx.fill();
      } else if (p.type === 'ring') {
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 * k + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1.1 - k), 0, TAU);
        ctx.stroke();
      } else if (p.type === 'text') {
        ctx.globalAlpha = Math.min(1, k * 2);
        text(ctx, p.text, p.x, p.y, 22, p.color);
      } else if (p.type === 'ko') {
        ctx.globalAlpha = Math.min(1, k * 1.4);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ang);
        const len = 1600 * (1 - k * 0.3);
        const wdt = 160 * k;
        const gr = ctx.createLinearGradient(0, 0, len, 0);
        gr.addColorStop(0, '#ffffff');
        gr.addColorStop(0.2, p.color);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(0, -wdt * 0.15);
        ctx.lineTo(len, -wdt);
        ctx.lineTo(len, wdt);
        ctx.lineTo(0, wdt * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------------- HUD ----------------
  function pctColor(p) {
    const stops = [[0, [255, 255, 255]], [50, [255, 209, 102]], [100, [255, 122, 42]], [150, [255, 42, 42]], [250, [140, 0, 0]]];
    for (let i = 1; i < stops.length; i++) {
      if (p <= stops[i][0]) {
        const [a, ca] = stops[i - 1], [b, cb] = stops[i];
        const t = (p - a) / (b - a);
        return `rgb(${ca.map((c, j) => Math.round(c + (cb[j] - c) * t)).join(',')})`;
      }
    }
    return 'rgb(140,0,0)';
  }

  function drawHUD(ctx, g, W, H, time) {
    const n = g.fighters.length;
    const cw = Math.min(176, (W - 150) / n);
    const ch = 58;
    const top = g.mode === 'time' ? 34 : 8;
    const x0 = W / 2 - (cw * n + 8 * (n - 1)) / 2;
    if (g.mode === 'time') {
      const s = Math.max(0, Math.ceil(g.timeLeft / 60));
      const str = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(ctx, W / 2 - 46, 4, 92, 26, 13);
      ctx.fill();
      text(ctx, str, W / 2, 17, 19, s <= 10 ? '#ff5a5a' : '#fff', 'center', false);
    }
    g.fighters.forEach((f, i) => {
      const x = x0 + i * (cw + 8), y = top;
      const out = f.state === 'out';
      ctx.globalAlpha = out ? 0.45 : 1;
      ctx.fillStyle = 'rgba(10,8,30,0.62)';
      roundRect(ctx, x, y, cw, ch, 12);
      ctx.fill();
      ctx.strokeStyle = f.pcolor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // retrato
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + 26, y + 27, 19, 0, TAU);
      ctx.fillStyle = f.def.dark;
      ctx.fill();
      ctx.clip();
      ctx.translate(x + 26, y + 27 + f.def.h * 0.55 * 0.72);
      ctx.scale(0.55, 0.55);
      drawModel(ctx, f.def, { legF: 0, legB: 0, armF: 0.3, armB: -0.3, lean: 0, bob: 0, crouch: 0, sx: 1, sy: 1, eyes: 'open' }, time);
      ctx.restore();
      text(ctx, f.label, x + 26, y + ch - 6, 11, f.pcolor);
      // porcentagem
      let ox = 0, oy = 0;
      if (f.flash > 0) {
        ox = (Math.random() - 0.5) * 6;
        oy = (Math.random() - 0.5) * 6;
      }
      const pc = Math.floor(f.percent);
      if (!out && f.state !== 'dead') {
        text(ctx, pc + '%', x + cw - 10 + ox, y + 24 + oy, Math.min(28, cw * 0.19), pctColor(pc), 'right');
      } else {
        text(ctx, out ? 'FORA' : 'KO', x + cw - 10, y + 24, 18, '#aaa', 'right');
      }
      // vidas ou placar
      if (g.mode === 'stock') {
        for (let s = 0; s < Math.min(f.stocks, 5); s++) {
          ctx.fillStyle = f.def.color;
          ctx.beginPath();
          ctx.arc(x + 54 + s * 13, y + 45, 5, 0, TAU);
          ctx.fill();
        }
      } else {
        const sc = f.kos - f.falls;
        text(ctx, (sc >= 0 ? '+' : '') + sc, x + 60, y + 45, 13, sc >= 0 ? '#7cff6b' : '#ff6b6b', 'left', false);
      }
      // barra de ultimate
      const bw = cw - 58 - 10;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      roundRect(ctx, x + 50, y + ch - 9, bw, 5, 2.5);
      ctx.fill();
      ctx.fillStyle = f.ult >= 100 ? (time % 20 < 10 ? '#ffd166' : '#fff') : f.def.fxColor;
      roundRect(ctx, x + 50, y + ch - 9, Math.max(5, (bw * f.ult) / 100), 5, 2.5);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawOffscreen(ctx, g, W, H, toScreen) {
    for (const f of g.fighters) {
      if (f.state === 'dead' || f.state === 'out') continue;
      const s = toScreen(f.x, f.y - f.h / 2);
      const m = 30;
      if (s.x > -10 && s.x < W + 10 && s.y > -10 && s.y < H + 10) continue;
      const cx = U.clamp(s.x, m + 10, W - m - 10), cy = U.clamp(s.y, m + 70, H - m - 10);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeStyle = f.pcolor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, TAU);
      ctx.fill();
      ctx.stroke();
      const a = Math.atan2(s.y - cy, s.x - cx);
      ctx.fillStyle = f.pcolor;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34);
      ctx.lineTo(cx + Math.cos(a + 0.4) * 25, cy + Math.sin(a + 0.4) * 25);
      ctx.lineTo(cx + Math.cos(a - 0.4) * 25, cy + Math.sin(a - 0.4) * 25);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 21, 0, TAU);
      ctx.clip();
      ctx.translate(cx, cy + f.def.h * 0.3 * 0.5);
      ctx.scale(0.5 * f.facing, 0.5);
      drawModel(ctx, f.def, computePose(f, 0), 0);
      ctx.restore();
    }
  }

  // ---------------- Quadro completo ----------------
  R.draw = function (ctx, g, W, H, time) {
    const base = RR.view.base;
    const scale = base * g.cam.zoom;
    const shx = g.shake ? (Math.random() - 0.5) * g.shake * 2 : 0;
    const shy = g.shake ? (Math.random() - 0.5) * g.shake * 2 : 0;
    const toScreen = (x, y) => ({ x: (x - g.cam.x) * scale + W / 2 + shx, y: (y - g.cam.y) * scale + H / 2 + shy });

    drawBackground(ctx, g, W, H, time);
    ctx.save();
    ctx.translate(W / 2 + shx, H / 2 + shy);
    ctx.scale(scale, scale);
    ctx.translate(-g.cam.x, -g.cam.y);
    drawStage(ctx, g, time);
    for (const p of g.projectiles) if (p.type === 'blast') drawProjectile(ctx, p, g, time);
    // lutador do jogador por cima
    const order = g.fighters.slice().sort((a, b) => (a.isHuman ? 1 : 0) - (b.isHuman ? 1 : 0));
    for (const f of order) drawFighter(ctx, f, g, time);
    for (const p of g.projectiles) if (p.type !== 'blast') drawProjectile(ctx, p, g, time);
    drawFx(ctx, g);
    if (RR.settings.hitboxes) {
      ctx.lineWidth = 2;
      for (const f of g.fighters) {
        if (!f.alive) continue;
        const r = f.hurtRect();
        ctx.strokeStyle = f.intangible() ? '#4dabff' : '#ffff00';
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        if (f.state === 'attack' && f.move.hits) {
          const t = f.moveT - f.move.startup;
          if (t >= 0 && t < f.move.active)
            for (const h of f.move.hits) {
              const hr = f.hitRect(h);
              ctx.strokeStyle = '#ff0000';
              ctx.strokeRect(hr.x, hr.y, hr.w, hr.h);
            }
        }
      }
      for (const p of g.projectiles) {
        const r = g.projRect(p);
        ctx.strokeStyle = '#ff00ff';
        ctx.strokeRect(r.x, r.y, r.w, r.h);
      }
    }
    ctx.restore();

    // cinemática da ultimate
    if (g.cine) {
      const f = g.cine.f;
      const k = 1 - g.cine.t / g.cine.max;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, W, H);
      const bh = Math.min(90, H * 0.18);
      const slide = Math.min(1, k * 4);
      ctx.fillStyle = U.rgba(f.def.color, 0.9);
      ctx.fillRect(0, H * 0.62, W * slide, bh);
      ctx.fillStyle = U.rgba('#000000', 0.35);
      ctx.fillRect(0, H * 0.62 + bh - 8, W * slide, 8);
      text(ctx, f.def.moves.ult.name.toUpperCase() + '!', W * 0.5 + (1 - slide) * -W * 0.4, H * 0.62 + bh / 2, Math.min(52, W * 0.06), '#fff');
      // redesenha o lutador por cima do escurecimento
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(scale, scale);
      ctx.translate(-g.cam.x, -g.cam.y);
      drawFighter(ctx, f, g, time);
      ctx.restore();
    }

    drawOffscreen(ctx, g, W, H, toScreen);

    if (g.flashA > 0) {
      ctx.fillStyle = U.rgba(g.flashC, g.flashA);
      ctx.fillRect(0, 0, W, H);
    }
    if (g.demo) return;
    drawHUD(ctx, g, W, H, time);

    // contagem regressiva e mensagens
    if (g.phase === 'countdown') {
      const n = 3 - Math.floor((g.phaseT - 1) / 60);
      const k = ((g.phaseT - 1) % 60) / 60;
      if (n >= 1) text(ctx, String(n), W / 2, H / 2, Math.min(150, H * 0.3) * (1.4 - k * 0.4), '#ffd166');
    }
    if (g.message) {
      const m = g.message;
      const k = 1 - m.t / m.max;
      const sc = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : 1.1 - Math.min(0.1, (k - 0.15) * 0.3);
      ctx.globalAlpha = m.t < 12 ? m.t / 12 : 1;
      text(ctx, m.text, W / 2, H * 0.45, Math.min(96, W * 0.09) * sc, m.color);
      ctx.globalAlpha = 1;
    }
  };

  // retrato para menus
  R.portrait = function (canvas, def, time) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    const s = (h * 0.72) / def.h;
    ctx.translate(w / 2, h * 0.9);
    ctx.scale(s, s);
    drawModel(ctx, def, { legF: 0.25, legB: -0.25, armF: 1.2, armB: -0.5, lean: 0, bob: Math.sin((time || 0) * 0.08) * 2, crouch: 0, sx: 1, sy: 1, eyes: 'open' }, time || 0);
    ctx.restore();
  };
})(window.RR);
