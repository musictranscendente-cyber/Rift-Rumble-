// Arte em estilo cartoon: contorno grosso, sombreamento em tons (cel shading),
// personagens com articulações e cenários em camadas com paralaxe.
(function (RR) {
  const A = (RR.art = {});
  const TAU = Math.PI * 2;
  const OL = '#1b1230'; // cor do contorno
  const O = 3.5; // espessura do contorno (unidades do mundo)

  // ---------------- Cores ----------------
  const rgb = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const mix = (h, t, k) => {
    const a = rgb(h), b = rgb(t);
    return '#' + a.map((c, i) => Math.round(c + (b[i] - c) * k).toString(16).padStart(2, '0')).join('');
  };
  const dk = (h, k) => mix(h, '#000000', k);
  const lt = (h, k) => mix(h, '#ffffff', k);
  const rgba = (h, a) => {
    const [r, g, b] = rgb(h);
    return `rgba(${r},${g},${b},${a})`;
  };
  A.mix = mix;
  A.dk = dk;
  A.lt = lt;

  // números pseudoaleatórios fixos (o cenário não muda a cada quadro)
  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  // ---------------- Primitivas com contorno ----------------
  function outline(ctx, fill, w) {
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.lineWidth = w || O;
    ctx.strokeStyle = OL;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // preenche com sombra na parte de trás/de baixo e luz na frente/em cima
  function cel(ctx, path, base, k, hl) {
    ctx.save();
    path();
    ctx.clip();
    ctx.fillStyle = dk(base, 0.3);
    ctx.fillRect(-2000, -2000, 4000, 4000);
    ctx.translate(k, -k * 0.6);
    path();
    ctx.fillStyle = base;
    ctx.fill();
    if (hl) {
      ctx.fillStyle = rgba(lt(base, 0.6), 0.55);
      ctx.beginPath();
      ctx.ellipse(hl[0], hl[1], hl[2], hl[3], hl[4] || 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    path();
    outline(ctx, null);
  }

  // membro com cotovelo/joelho: retorna a ponta
  function limb(ctx, x, y, a, bend, l1, l2, w, col) {
    const kx = x + Math.sin(a) * l1, ky = y + Math.cos(a) * l1;
    const a2 = a + bend;
    const ex = kx + Math.sin(a2) * l2, ey = ky + Math.cos(a2) * l2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = OL;
    ctx.lineWidth = w + O * 2;
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.stroke();
    // brilho fino no lado da frente
    ctx.strokeStyle = rgba(lt(col, 0.5), 0.35);
    ctx.lineWidth = w * 0.25;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y);
    ctx.lineTo(kx + w * 0.2, ky);
    ctx.stroke();
    return { kx, ky, ex, ey, a2 };
  }

  function ball(ctx, x, y, r, col) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    outline(ctx, col);
    ctx.fillStyle = rgba(lt(col, 0.6), 0.5);
    ctx.beginPath();
    ctx.arc(x + r * 0.25, y - r * 0.3, r * 0.35, 0, TAU);
    ctx.fill();
  }

  function boot(ctx, L, r, col) {
    ctx.beginPath();
    ctx.ellipse(L.ex + r * 0.45, L.ey + r * 0.1, r * 1.35, r * 0.85, 0, 0, TAU);
    outline(ctx, col);
  }

  function eye(ctx, x, y, s, p, iris) {
    if (p.eyes === 'x') {
      ctx.strokeStyle = OL;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - s, y - s);
      ctx.lineTo(x + s, y + s);
      ctx.moveTo(x + s, y - s);
      ctx.lineTo(x - s, y + s);
      ctx.stroke();
      return;
    }
    if (p.eyes === 'blink') {
      ctx.strokeStyle = OL;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - s, y + 1);
      ctx.quadraticCurveTo(x, y + s * 0.6, x + s, y + 1);
      ctx.stroke();
      return;
    }
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.85, s * 1.15, 0, 0, TAU);
    outline(ctx, '#ffffff', 2.5);
    ctx.fillStyle = iris || '#2a1a4a';
    ctx.beginPath();
    ctx.ellipse(x + s * 0.25, y + s * 0.1, s * 0.5, s * 0.72, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + s * 0.4, y - s * 0.25, s * 0.22, 0, TAU);
    ctx.fill();
  }

  function brow(ctx, x, y, s, angry) {
    ctx.strokeStyle = OL;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - s, y - (angry ? s * 0.5 : 0));
    ctx.lineTo(x + s, y + (angry ? s * 0.3 : 0));
    ctx.stroke();
  }

  function starShape(ctx, x, y, r, col) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    outline(ctx, col, 2);
  }
  A.starShape = starShape;

  // desenha o personagem com os pés em (0,0), olhando para +x
  // todos os lutadores usam sprites
  A.drawModel = function (ctx, d, p, time, tint) {
    if (d.sprite) RR.sprites.draw(ctx, d, p, time || 0, tint);
  };

  // ================= CENÁRIOS =================
  const bgCache = {};
  function deco(st) {
    if (bgCache[st.id]) return bgCache[st.id];
    const r = rng(st.id.length * 977 + 13);
    const o = { stars: [], far: [], mid: [], islands: [], clouds: [], smoke: [] };
    for (let i = 0; i < 80; i++) o.stars.push({ x: r(), y: r() * 0.65, s: r() * 1.8 + 0.5, p: r() * TAU });
    for (let i = 0; i <= 14; i++) o.far.push(0.35 + r() * 0.45);
    for (let i = 0; i <= 10; i++) o.mid.push(0.2 + r() * 0.5);
    for (let i = 0; i < 4; i++) o.islands.push({ x: i / 4 + r() * 0.12, y: 0.32 + r() * 0.25, s: 0.6 + r() * 0.6 });
    for (let i = 0; i < 7; i++) o.clouds.push({ x: r(), y: 0.12 + r() * 0.45, s: 0.6 + r() * 0.9, sp: 0.05 + r() * 0.1 });
    for (let i = 0; i < 9; i++) o.smoke.push({ x: r(), p: r(), s: 0.6 + r() * 0.8 });
    return (bgCache[st.id] = o);
  }

  function ridge(ctx, pts, W, H, base, amp, offX, fill, line) {
    const n = pts.length - 1;
    const span = W * 1.5;
    const step = span / n;
    const off = -(((offX % span) + span) % span);
    ctx.beginPath();
    ctx.moveTo(-10, H + 10);
    for (let k = 0; k <= n * 2 + 1; k++) {
      const x = off + k * step;
      if (x > W + step * 2) break;
      ctx.lineTo(x, H * base - pts[k % (n + 1)] * H * amp);
    }
    ctx.lineTo(W + 10, H + 10);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (line) {
      ctx.strokeStyle = line;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  function puff(ctx, x, y, s, fill, line) {
    ctx.beginPath();
    ctx.arc(x, y, 30 * s, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(x + 32 * s, y - 22 * s, 32 * s, Math.PI, Math.PI * 1.9);
    ctx.arc(x + 75 * s, y - 12 * s, 26 * s, Math.PI * 1.2, Math.PI * 0.1);
    ctx.arc(x + 95 * s, y + 6 * s, 22 * s, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (line) {
      ctx.strokeStyle = line;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  A.drawBackground = function (ctx, g, W, H, time) {
    const st = g.stage, th = st.theme, dc = deco(st);
    const cx = g.cam.x * (RR.view ? RR.view.base : 1);
    const cy = g.cam.y * (RR.view ? RR.view.base : 1);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, th.sky[0]);
    sky.addColorStop(0.55, th.sky[1]);
    sky.addColorStop(1, th.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    if (st.bg) return drawImageSky(ctx, g, W, H, st.bg);
    if (th.split) return drawSplitSky(ctx, g, W, H, time, dc);
    if (!th.lava) {
      for (const s of dc.stars) {
        ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.45 * Math.sin(time * 0.04 + s.p)})`;
        ctx.fillRect(((s.x * W - cx * 0.02) % W + W) % W, s.y * H * 0.8, s.s, s.s);
      }
      // lua
      const mx = W * 0.78 - cx * 0.01, my = H * 0.24;
      const mr = H * 0.11;
      ctx.fillStyle = 'rgba(255,230,250,0.12)';
      ctx.beginPath();
      ctx.arc(mx, my, mr * 1.7, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, TAU);
      ctx.fillStyle = '#fff1f8';
      ctx.fill();
      ctx.strokeStyle = 'rgba(27,18,48,0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,170,220,0.5)';
      for (const [ox, oy, rr] of [[-0.3, -0.2, 0.2], [0.25, 0.15, 0.14], [-0.05, 0.4, 0.1]]) {
        ctx.beginPath();
        ctx.arc(mx + ox * mr, my + oy * mr, rr * mr, 0, TAU);
        ctx.fill();
      }
      ridge(ctx, dc.far, W, H, 0.78, 0.38, cx * 0.04, '#4a3a8e', 'rgba(27,18,48,0.45)');
      for (const c of dc.clouds) {
        const x = (((c.x * W * 1.4 - cx * 0.07 + time * c.sp) % (W * 1.4)) + W * 1.4) % (W * 1.4) - W * 0.2;
        puff(ctx, x, c.y * H - cy * 0.02, c.s * (H / 400), 'rgba(255,214,240,0.22)', null);
      }
      // ilhas flutuantes ao longe
      for (const is of dc.islands) {
        const s = is.s * (H / 420) * 0.5;
        const x = ((((is.x * W * 1.6 - cx * 0.12) % (W * 1.6)) + W * 1.6) % (W * 1.6)) - W * 0.3;
        const y = is.y * H - cy * 0.05 + Math.sin(time * 0.02 + is.x * 9) * 4;
        ctx.beginPath();
        ctx.moveTo(x - 60 * s, y);
        ctx.lineTo(x + 60 * s, y);
        ctx.lineTo(x + 30 * s, y + 30 * s);
        ctx.lineTo(x, y + 60 * s);
        ctx.lineTo(x - 28 * s, y + 32 * s);
        ctx.closePath();
        ctx.fillStyle = '#41337f';
        ctx.fill();
        ctx.strokeStyle = 'rgba(27,18,48,0.35)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = '#4f6a8e';
        ctx.fillRect(x - 60 * s, y - 4 * s, 120 * s, 6 * s);
        ctx.fillStyle = '#41337f';
        ctx.fillRect(x + 18 * s, y - 34 * s, 10 * s, 30 * s);
        ctx.fillStyle = 'rgba(159,243,255,0.25)';
        ctx.fillRect(x - 40 * s, y + 4 * s, 4 * s, 70 * s);
      }
      ridge(ctx, dc.mid, W, H, 0.98, 0.32, cx * 0.2, '#2f2568', 'rgba(27,18,48,0.7)');
      const fog = ctx.createLinearGradient(0, H * 0.7, 0, H);
      fog.addColorStop(0, 'rgba(192,86,154,0)');
      fog.addColorStop(1, 'rgba(192,86,154,0.35)');
      ctx.fillStyle = fog;
      ctx.fillRect(0, H * 0.7, W, H * 0.3);
    } else {
      // vulcão ao fundo
      const vx = W * 0.62 - cx * 0.05, vy = H * 0.86;
      const glow = ctx.createRadialGradient(vx, H * 0.38, 10, vx, H * 0.38, H * 0.5);
      glow.addColorStop(0, 'rgba(255,140,40,0.55)');
      glow.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      for (const s of dc.smoke) {
        const k = (s.p + time * 0.0015) % 1;
        ctx.fillStyle = `rgba(40,12,10,${0.5 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(vx + (s.x - 0.5) * 80 + k * 90, H * 0.4 - k * H * 0.45, (20 + k * 70) * s.s * (H / 400), 0, TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(vx - H * 0.75, vy);
      ctx.lineTo(vx - H * 0.12, H * 0.4);
      ctx.lineTo(vx - H * 0.05, H * 0.43);
      ctx.lineTo(vx + H * 0.06, H * 0.41);
      ctx.lineTo(vx + H * 0.13, H * 0.4);
      ctx.lineTo(vx + H * 0.8, vy);
      ctx.closePath();
      ctx.fillStyle = '#3a110a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,5,5,0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
      // rios de lava
      ctx.strokeStyle = '#ff7a1a';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      for (const [a, b] of [[-0.04, -0.2], [0.05, 0.25], [0.0, 0.05]]) {
        ctx.beginPath();
        ctx.moveTo(vx + a * H, H * 0.42);
        ctx.quadraticCurveTo(vx + (a + b * 0.5) * H, H * 0.58, vx + (a + b) * H, H * 0.78);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.ellipse(vx + 0.005 * H, H * 0.41, H * 0.09, H * 0.02, 0, 0, TAU);
      ctx.fill();
      ridge(ctx, dc.far, W, H, 0.9, 0.3, cx * 0.12, '#2a0d08', 'rgba(10,3,3,0.85)');
      for (const s of dc.stars) {
        const y = (((s.y + 0.3) * H - time * (0.5 + s.s * 0.4)) % H + H) % H;
        ctx.fillStyle = rgba('#ffa040', 0.4 + 0.4 * Math.sin(time * 0.05 + s.p));
        ctx.fillRect(((s.x * W - cx * 0.03) % W + W) % W, y, s.s * 1.6, s.s * 1.6);
      }
      // mar de lava
      const ly = H * 0.88 - cy * 0.03;
      const lg = ctx.createLinearGradient(0, ly, 0, H);
      lg.addColorStop(0, '#ff8a1a');
      lg.addColorStop(1, '#ffd166');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, ly + Math.sin(x * 0.03 + time * 0.06) * 4);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#7a1f05';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  // fundo pintado cobrindo a tela, com leve paralaxe
  function drawImageSky(ctx, g, W, H, bg) {
    const im = RR.sprites.image(bg.src);
    if (!RR.sprites.ready(im)) return;
    const s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * 1.05;
    const base = RR.view ? RR.view.base : 1;
    const ox = -g.cam.x * base * (bg.parallax || 0.04);
    const oy = -(g.cam.y + 150) * base * (bg.parallax || 0.04);
    ctx.drawImage(im, (W - im.naturalWidth * s) / 2 + ox, (H - im.naturalHeight * s) / 2 + oy, im.naturalWidth * s, im.naturalHeight * s);
    // escurece o fundo para os lutadores se destacarem
    ctx.fillStyle = 'rgba(10,3,24,0.4)';
    ctx.fillRect(0, 0, W, H);
  }

  // céu metade dia (esquerda) e metade noite estrelada (direita), dividido no centro da arena
  function drawSplitSky(ctx, g, W, H, time, dc) {
    const base = RR.view ? RR.view.base * g.cam.zoom : 1;
    const sx = (0 - g.cam.x) * base + W / 2; // x na tela do centro da arena
    const day = ctx.createLinearGradient(0, 0, 0, H);
    day.addColorStop(0, '#2f7fe0');
    day.addColorStop(0.6, '#8fd0ff');
    day.addColorStop(1, '#e6f6ff');
    ctx.fillStyle = day;
    ctx.fillRect(0, 0, Math.max(0, sx), H);
    const night = ctx.createLinearGradient(0, 0, 0, H);
    night.addColorStop(0, '#0d0a2e');
    night.addColorStop(0.6, '#2a1a6e');
    night.addColorStop(1, '#6a3ab8');
    ctx.fillStyle = night;
    ctx.fillRect(Math.max(0, sx), 0, W, H);
    const cx = g.cam.x * (RR.view ? RR.view.base : 1);
    for (const c of dc.clouds) {
      const x = (((c.x * W - cx * 0.05 + time * c.sp) % W) + W) % W;
      if (x + 100 < sx) puff(ctx, x, c.y * H + H * 0.3, c.s * (H / 380), 'rgba(255,255,255,0.55)', null);
    }
    for (const s of dc.stars) {
      const x = ((s.x * W - cx * 0.02) % W + W) % W;
      if (x > sx) {
        ctx.fillStyle = `rgba(255,230,255,${0.4 + 0.5 * Math.sin(time * 0.05 + s.p)})`;
        ctx.fillRect(x, s.y * H, s.s * 1.3, s.s * 1.3);
      }
    }
    // costura de luz entre os dois lados
    const seam = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0);
    seam.addColorStop(0, 'rgba(159,216,255,0)');
    seam.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    seam.addColorStop(1, 'rgba(255,95,210,0)');
    ctx.fillStyle = seam;
    ctx.fillRect(sx - 30, 0, 60, H);
  }

  // ---------------- Palco (coordenadas do mundo) ----------------
  A.drawStage = function (ctx, g, time) {
    const st = g.stage, th = st.theme;
    if (st.image) {
      const im = RR.sprites.image(st.image.src);
      if (RR.sprites.ready(im)) ctx.drawImage(im, st.image.x, st.image.y, st.image.w, st.image.h);
      return;
    }

  };

  // ---------------- Projéteis ----------------
  A.drawProjectile = function (ctx, p, g, time) {
    if (p.type === 'orb') return RR.sprites.drawOrb(ctx, p, time);
    if (p.type === 'spirit') return RR.vfx.drawSpirit(ctx, p, time);
    if (p.type === 'arrow') return p.invisible ? null : RR.vfx.drawArrow(ctx, p, time);
    ctx.save();
    if (p.type === 'fireball') {
      const r = 16 + Math.sin(time * 0.7) * 1.5;
      const dir = p.vx >= 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(p.x + dir * r, p.y);
      ctx.quadraticCurveTo(p.x + dir * r, p.y - r, p.x, p.y - r);
      ctx.lineTo(p.x - dir * r * 2.2, p.y - r * 0.9 + Math.sin(time * 0.9) * 3);
      ctx.lineTo(p.x - dir * r * 1.2, p.y - r * 0.2);
      ctx.lineTo(p.x - dir * r * 2.6, p.y + r * 0.3 + Math.sin(time * 1.1) * 3);
      ctx.lineTo(p.x - dir * r * 1.1, p.y + r * 0.6);
      ctx.lineTo(p.x - dir * r * 1.8, p.y + r + Math.sin(time * 0.8) * 3);
      ctx.lineTo(p.x, p.y + r);
      ctx.quadraticCurveTo(p.x + dir * r, p.y + r, p.x + dir * r, p.y);
      ctx.closePath();
      outline(ctx, '#ff7a1a', 3);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(p.x + dir * 3, p.y, r * 0.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff6d0';
      ctx.beginPath();
      ctx.arc(p.x + dir * 5, p.y - 3, r * 0.28, 0, TAU);
      ctx.fill();
    } else if (p.type === 'shard') {
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(0, -9);
      ctx.lineTo(-15, 0);
      ctx.lineTo(0, 9);
      ctx.closePath();
      outline(ctx, '#bdf6ff', 3);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(14, -1);
      ctx.lineTo(0, -5);
      ctx.lineTo(-6, -1);
      ctx.fill();
    } else if (p.type === 'wave') {
      const k = 1 - p.t / p.life;
      for (let i = -1; i <= 1; i++) {
        const hh = (42 - Math.abs(i) * 12) * (0.6 + 0.4 * Math.sin(p.t * 0.5 + i)) * (0.4 + k * 0.6) + 10;
        ctx.beginPath();
        ctx.moveTo(p.x + i * 16 - 13, p.y);
        ctx.lineTo(p.x + i * 16 - 2, p.y - hh);
        ctx.lineTo(p.x + i * 16 + 5, p.y - hh * 0.8);
        ctx.lineTo(p.x + i * 16 + 13, p.y);
        ctx.closePath();
        outline(ctx, i === 0 ? '#b88a5c' : '#a67c52', 3);
      }
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(p.x - 26, p.y - 3, 52, 3);
    } else if (p.type === 'beam') {
      const r = g.projRect(p);
      const k = p.t / p.life;
      const hh = r.h * (k < 0.85 ? 1 : (1 - k) / 0.15) * (0.9 + 0.1 * Math.sin(time * 0.8));
      const cy = r.y + r.h / 2;
      ctx.fillStyle = 'rgba(143,107,255,0.35)';
      ctx.fillRect(r.x, cy - hh * 0.65, r.w, hh * 1.3);
      ctx.beginPath();
      ctx.rect(r.x, cy - hh / 2, r.w, hh);
      outline(ctx, '#9ff3ff', 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(r.x, cy - hh * 0.2, r.w, hh * 0.4);
      const ox = p.dir > 0 ? r.x : r.x + r.w;
      ctx.beginPath();
      ctx.arc(ox, cy, hh * 0.7, 0, TAU);
      outline(ctx, '#ffffff', 4);
    } else if (p.type === 'blast') {
      const k = p.t / p.life;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 70, (p.w / 2) * (0.4 + k * 0.7), 40 + k * 30, 0, 0, TAU);
      ctx.lineWidth = 22 * (1 - k) + 4;
      ctx.strokeStyle = OL;
      ctx.stroke();
      ctx.lineWidth = 16 * (1 - k) + 2;
      ctx.strokeStyle = '#ffb347';
      ctx.stroke();
    }
    ctx.restore();
  };

  // estrela de impacto (efeito de golpe)
  A.drawImpact = function (ctx, x, y, r, k, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(k * 0.6);
    const R = r * (1.2 - k * 0.5);
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const rr = i % 2 ? R * 0.42 : R;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.globalAlpha = Math.min(1, k * 2);
    outline(ctx, color, 4);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  };
})(window.RR);
