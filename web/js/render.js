// Renderização em Canvas 2D: cenário, personagens, projéteis, efeitos e HUD
(function (RR) {
  const U = RR.U;
  const R = (RR.render = {});
  const TAU = Math.PI * 2;


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
        p.elbow = act ? 0.05 : 0.35;
        p.glow = act || m === f.def.moves.ult;
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
    if (f.def.sprite) RR.sprites.pose(f, p, time);
    // piscada
    if (p.eyes === 'open' && (time + f.slot * 37) % 180 < 6) p.eyes = 'blink';
    return p;
  }


  R.drawModel = (...a) => RR.art.drawModel(...a);

  // desenha na posição interpolada entre os dois últimos passos da física (movimento mais suave)
  function drawFighter(ctx, f, g, time) {
    const a = RR.renderAlpha == null || RR.paused || g.hitstop > 0 || g.phase !== 'play' ? 1 : RR.renderAlpha;
    const ox = f.x, oy = f.y;
    if (f.px != null && Math.abs(f.x - f.px) < 120 && Math.abs(f.y - f.py) < 120) {
      f.x = f.px + (ox - f.px) * a;
      f.y = f.py + (oy - f.py) * a;
    }
    if (f.def.sprite) RR.sprites.drawTrail(ctx, f);
    try {
      drawFighterAt(ctx, f, g, time);
    } finally {
      f.x = ox;
      f.y = oy;
    }
  }

  function drawFighterAt(ctx, f, g, time) {
    if (f.state === 'dead' || f.state === 'out' || f.hidden) return;
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
    RR.art.drawModel(ctx, d, p, time, tint);
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
    if (f.state === 'shield' && !RR.sprites.hasShieldFrame(d)) {
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
    if (f.state === 'attack' && f.move.hits && !d.sprite) {
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
      const ty = f.y - f.h - 26;
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
      } else if (p.type === 'spriteFx') {
        RR.sprites.drawFx(ctx, p);
      } else if (p.type === 'v') {
        RR.vfx.draw(ctx, p);
      } else if (p.type === 'impact') {
        RR.art.drawImpact(ctx, p.x, p.y, p.r, p.life / p.max, p.color);
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
      if (!RR.sprites.drawPortrait(ctx, f.def, x + 26, y + 27, 19)) {
        ctx.translate(x + 26, y + 27 + f.def.h * 0.55 * 0.72);
        ctx.scale(0.55, 0.55);
        RR.art.drawModel(ctx, f.def, { legF: 0, legB: 0, armF: 0.3, armB: -0.3, lean: 0, bob: 0, crouch: 0, sx: 1, sy: 1, eyes: 'open' }, time);
      }
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
      RR.art.drawModel(ctx, f.def, computePose(f, 0), 0);
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

    RR.art.drawBackground(ctx, g, W, H, time);
    ctx.save();
    ctx.translate(W / 2 + shx, H / 2 + shy);
    ctx.scale(scale, scale);
    ctx.translate(-g.cam.x, -g.cam.y);
    RR.art.drawStage(ctx, g, time);
    for (const p of g.projectiles) if (p.type === 'blast') RR.art.drawProjectile(ctx, p, g, time);
    // lutador do jogador por cima
    const order = g.fighters.slice().sort((a, b) => (a.isHuman ? 1 : 0) - (b.isHuman ? 1 : 0));
    for (const f of order) drawFighter(ctx, f, g, time);
    for (const p of g.projectiles) if (p.type !== 'blast') RR.art.drawProjectile(ctx, p, g, time);
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
    if (g.phase === 'ending' && g.winner && g.endT < 170) {
      const k = Math.min(1, (170 - g.endT) / 30);
      const w = toScreen(g.winner.x, g.winner.y - g.winner.h * 0.6);
      const rad = ctx.createRadialGradient(w.x, w.y, H * 0.18, w.x, w.y, H * 0.75);
      rad.addColorStop(0, 'rgba(0,0,0,0)');
      rad.addColorStop(1, `rgba(0,0,0,${0.6 * k})`);
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, W, H);
    }
    if (g.message) {
      const m = g.message;
      const k = 1 - m.t / m.max;
      const sc = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : 1.1 - Math.min(0.1, (k - 0.15) * 0.3);
      ctx.globalAlpha = m.t < 12 ? m.t / 12 : 1;
      const my = g.phase === 'ending' && g.winner && g.endT < 160 ? H * 0.84 : H * 0.45;
      text(ctx, m.text, W / 2, my, Math.min(96, W * 0.09) * sc * (my > H * 0.5 ? 0.7 : 1), m.color);
      ctx.globalAlpha = 1;
    }
  };

  // retrato para menus
  R.portrait = function (canvas, def, time, frame) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    const s = (h * 0.72) / def.h;
    ctx.translate(w / 2, h * 0.9);
    ctx.scale(s, s);
    RR.art.drawModel(ctx, def, { legF: 0.25, legB: -0.25, armF: 1.2, armB: -0.5, lean: 0, bob: Math.sin((time || 0) * 0.08) * 2, crouch: 0, sx: 1, sy: 1, eyes: 'open', frame }, time || 0);
    ctx.restore();
  };
})(window.RR);
