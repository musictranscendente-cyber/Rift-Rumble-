// Efeitos visuais de código: impacto de cada elemento (chamas, respingos, pedras, estrela, corte em X),
// rastros de projéteis e o que completa os vídeos dos golpes (chão rachando, escuridão do eclipse,
// dragões que cruzam a arena, flecha cometa...). Só aparência: o dano continua em characters.js.
(function (RR) {
  const V = (RR.vfx = {});
  const TAU = Math.PI * 2;
  const U = RR.U;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // brilho (fora), meio, núcleo
  const PAL = {
    fire: ['#ff5a00', '#ffb000', '#fff3c4'],
    water: ['#1e7bff', '#6fd3ff', '#ffffff'],
    rock: ['#7a4a22', '#d9a066', '#fff0d0'],
    light: ['#2f8bff', '#9fe8ff', '#ffffff'],
    shadow: ['#8f3bff', '#ff5fd2', '#ffe6fb'],
    neutral: ['#ffb000', '#fff3b0', '#ffffff'],
  };
  PAL.twin = PAL.light;
  const CRYSTAL = ['#1f9e4a', '#5dff6a', '#d9ffe0'];

  function add(g, o) {
    if (g.fx.length >= 420) return null;
    o.type = 'v';
    o.max = o.life;
    g.fx.push(o);
    return o;
  }

  // ---------------- Partículas básicas ----------------
  const P = {
    chunk(g, x, y, vx, vy, size, col) {
      return add(g, { k: 'chunk', x, y, vx, vy, g: 0.6, rot: rnd(0, TAU), vr: rnd(-0.3, 0.3), size, col: col || U.pick(['#a67c52', '#8a6240', '#c79a6a']), life: rnd(26, 40), floorY: y + 400 });
    },
    drop(g, x, y, vx, vy, size) {
      return add(g, { k: 'drop', x, y, vx, vy, g: 0.42, size, life: rnd(22, 34) });
    },
    flame(g, x, y, vx, vy, size) {
      return add(g, { k: 'flame', x, y, vx, vy, g: -0.12, drag: 0.94, size, life: rnd(16, 26) });
    },
    star(g, x, y, vx, vy, size, col) {
      return add(g, { k: 'star', x, y, vx, vy, drag: 0.9, size, col: col || '#ffffff', spin: rnd(0, TAU), life: rnd(18, 30) });
    },
    smoke(g, x, y, vx, vy, size, col, a) {
      return add(g, { k: 'smoke', x, y, vx, vy, drag: 0.93, size, col, a: a || 0.45, life: rnd(24, 40) });
    },
    shock(g, x, y, r, col, life) {
      return add(g, { k: 'shock', x, y, r, col, life: life || 18 });
    },
  };
  V.P = P;

  // ---------------- Impacto de cada elemento ----------------
  V.hit = function (g, x, y, elem, dmg, kb, dir) {
    const pw = Math.min(1, (dmg + kb * 0.4) / 18);
    add(g, { k: 'pop', x, y, r: 16 + pw * 34, col: (PAL[elem] || PAL.neutral)[1], life: 7 });
    switch (elem) {
      case 'fire':
        for (let i = 0; i < 4 + pw * 8; i++) P.flame(g, x + rnd(-10, 10), y + rnd(-10, 10), dir * rnd(1, 5) + rnd(-2, 2), rnd(-4, 0), rnd(10, 18) + pw * 10);
        for (let i = 0; i < 6; i++) add(g, { k: 'ember', x, y, vx: dir * rnd(2, 9), vy: rnd(-8, 1), g: 0.2, life: rnd(16, 28) });
        break;
      case 'water':
        add(g, { k: 'splash', x, y, r: 26 + pw * 40, life: 16 });
        for (let i = 0; i < 6 + pw * 10; i++) {
          const a = -Math.PI / 2 + rnd(-1.1, 1.1);
          const s = rnd(4, 10) + pw * 4;
          P.drop(g, x, y, Math.cos(a) * s + dir * 2, Math.sin(a) * s, rnd(3, 6));
        }
        break;
      case 'rock':
        for (let i = 0; i < 4 + pw * 7; i++) P.chunk(g, x, y, dir * rnd(1, 8) + rnd(-3, 3), rnd(-10, -3), rnd(5, 10) + pw * 6, Math.random() < 0.25 ? '#5dff6a' : null);
        for (let i = 0; i < 3; i++) P.smoke(g, x + rnd(-14, 14), y + rnd(-6, 6), rnd(-1.5, 1.5), rnd(-1, 0), 18 + pw * 16, '#d8c3a5');
        break;
      case 'light':
        add(g, { k: 'flare', x, y, r: 30 + pw * 50, col: '#9fe8ff', life: 12 });
        for (let i = 0; i < 4 + pw * 4; i++) P.star(g, x, y, rnd(-6, 6), rnd(-6, 6), rnd(6, 11), U.pick(['#ffffff', '#9fe8ff', '#ffd166']));
        break;
      case 'shadow':
        add(g, { k: 'slashX', x, y, r: 26 + pw * 30, rot: rnd(-0.4, 0.4), life: 14 });
        for (let i = 0; i < 3; i++) P.smoke(g, x + rnd(-12, 12), y + rnd(-12, 12), rnd(-1, 1), rnd(-1.2, 0), 16 + pw * 12, '#7a1fa8', 0.5);
        break;
      case 'twin':
        add(g, { k: 'yin', x, y, r: 22 + pw * 30, rot: rnd(0, TAU), life: 16 });
        for (let i = 0; i < 4; i++) P.star(g, x, y, rnd(-6, 6), rnd(-6, 6), rnd(6, 10), i % 2 ? '#4dabff' : '#ff5fd2');
        break;
      default:
        g.fx.push({ type: 'impact', x, y, life: 10, max: 10, r: 14 + Math.min(40, kb), color: '#ffd166' });
    }
  };

  // rastro dos projéteis
  V.trail = function (g, p) {
    const e = p.fx;
    if (p.ground) {
      // Ruptura Sísmica: rochas e cristais brotam do chão por onde a onda passa
      if (p.t % 3 === 0) add(g, { k: 'spike', x: p.x + rnd(-8, 8), y: p.y, h: rnd(40, 70), w: rnd(20, 30), crystal: p.t % 6 === 0, lean: rnd(-0.25, 0.25), life: 24 });
      if (p.t % 4 === 0) P.chunk(g, p.x, p.y - 6, p.dir * rnd(0, 3), rnd(-7, -3), rnd(4, 8));
      return;
    }
    const bx = p.x - p.vx * 0.8, by = p.y - p.vy * 0.8;
    if (e === 'fire') {
      if (p.t % 2 === 0) P.flame(g, bx, by + rnd(-8, 8), -p.vx * 0.1, rnd(-1, 0), rnd(10, 16));
    } else if (e === 'water') {
      if (p.t % 3 === 0) P.drop(g, bx, by + rnd(-10, 10), -p.vx * 0.15, rnd(-2, 1), rnd(3, 5));
    } else if (e === 'light') {
      if (p.t % 2 === 0) P.star(g, bx, by + rnd(-10, 10), -p.vx * 0.05, rnd(-1, 1), rnd(5, 9), U.pick(['#ffffff', '#9fe8ff']));
    } else if (e === 'shadow') {
      if (p.t % 2 === 0) P.smoke(g, bx, by + rnd(-6, 6), 0, rnd(-0.6, 0), 12, '#a12bd6', 0.4);
    } else if (p.t % 3 === 0) g.burst(bx, by, e, 1, 2);
  };

  // efeitos de código que completam o vídeo de cada golpe (t = quadro do golpe). O golpe em si
  // (cortes, chamas, ondas) já vem desenhado no vídeo; aqui só o que o vídeo não tem: chão rachando,
  // escuridão, lampejos de teleporte, a marca de onde o meteoro cai...
  const MOVES = {
    vex: {
      special(g, f, t) {
        // lampejo onde some e onde reaparece
        if (t === 6 || t === 13) {
          add(g, { k: 'yin', x: f.x, y: f.y - f.h * 0.5, r: 44, rot: 0, life: 14 });
          for (let i = 0; i < 6; i++) P.star(g, f.x, f.y - f.h * 0.5, rnd(-6, 6), rnd(-6, 6), rnd(6, 10), i % 2 ? '#4dabff' : '#ff5fd2');
        }
      },
    },
    noxara: {
      ult(g, f, t) {
        if (t === 1) add(g, { k: 'dark', life: 88 });
        if (t === 66) {
          P.shock(g, f.x, f.y, 110, '#d24dff', 22);
          for (let i = 0; i < 8; i++) P.smoke(g, f.x + rnd(-70, 70), f.y - rnd(0, 60), rnd(-2, 2), rnd(-1.5, -0.3), rnd(24, 36), '#a12bd6', 0.35);
        }
      },
    },
    astrael: {
      special(g, f, t) {
        // carga: estrelas sendo puxadas para a ponta da flecha
        const c = f.mvar.c || 0;
        if (t === 9 && c > 0 && c % 3 === 0) {
          const a = rnd(0, TAU), x = f.x + f.facing * 50, y = f.y - f.h * 0.5;
          P.star(g, x + Math.cos(a) * 60, y + Math.sin(a) * 60, -Math.cos(a) * 5, -Math.sin(a) * 5, rnd(5, 8) + c / 10, c >= 57 ? '#ffd166' : '#9fe8ff');
        }
      },
    },
    solkar: {
      special(g, f, t) {
        if (t === 14) g.shake = 8;
      },
      ult(g, f, t) {
        if (t === 1) P.shock(g, f.x, f.y, 90, '#ffb000');
        if (t === 26) add(g, { k: 'target', f, x: f.x, y: g.stage.solids[0].y, life: 30 });
      },
    },
    lunara: {
      ult(g, f, t) {
        if (t === 86) for (let i = 0; i < 24; i++) P.drop(g, f.x + rnd(-240, 240), f.y - rnd(0, 40), rnd(-3, 3), rnd(-14, -6), rnd(4, 8));
      },
    },
    bront: {
      special(g, f, t) {
        if (t === 22) {
          P.shock(g, f.x + f.facing * 50, f.y, 90, '#d9a066');
          add(g, { k: 'crack', x: f.x + f.facing * 50, y: f.y, r: 80, seed: Math.random() * 1000, life: 50 });
          for (let i = 0; i < 8; i++) P.chunk(g, f.x + f.facing * 50, f.y - 6, rnd(-6, 6), rnd(-11, -4), rnd(5, 10), Math.random() < 0.3 ? '#5dff6a' : null);
        }
      },
      recovery(g, f, t) {
        if (t === 5) {
          P.shock(g, f.x, f.y, 70, '#d9a066');
          for (let i = 0; i < 6; i++) P.smoke(g, f.x + rnd(-30, 30), f.y - 4, rnd(-3, 3), -0.4, rnd(18, 26), '#d8c3a5');
        }
      },
      ult(g, f, t) {
        if (t === 58) {
          P.shock(g, f.x, f.y, 260, '#5dff6a', 26);
          add(g, { k: 'crack', x: f.x, y: f.y, r: 200, seed: Math.random() * 1000, life: 70 });
          // pilares de pedra e cristal brotam em sequência para os dois lados
          for (let i = 0; i < 8; i++)
            for (const s of [-1, 1])
              add(g, { k: 'spike', x: f.x + s * (70 + i * 58), y: f.y, h: 150 - i * 8 + rnd(-15, 15), w: 44, crystal: i % 2 === 0, lean: s * rnd(0.05, 0.25), delay: i * 2, life: 40 });
        }
      },
    },
  };

  // silhueta que fica no lugar onde a Noxara passou
  V.ghost = function (g, f, x, y, dir) {
    add(g, { k: 'ghost', f, x, y, dir, life: 14 });
    for (let i = 0; i < 4; i++) P.smoke(g, x + rnd(-20, 20), y - rnd(10, 60), rnd(-1, 1), rnd(-1, 0), 16, '#7a1fa8', 0.45);
  };

  // impacto do Sol do Solkar
  V.sunImpact = function (g, f) {
    P.shock(g, f.x, f.y, 260, '#ffb000', 26);
    add(g, { k: 'flare', x: f.x, y: f.y - 30, r: 160, col: '#ffd166', life: 18 });
    add(g, { k: 'crack', x: f.x, y: f.y, r: 180, seed: Math.random() * 1000, life: 60 });
    for (let i = 0; i < 26; i++) P.flame(g, f.x + rnd(-200, 200), f.y - rnd(0, 40), rnd(-3, 3), rnd(-5, -1), rnd(16, 28));
  };

  // dragão que atravessa a arena (projétil do ultimate do Vex)
  V.drawSpirit = function (ctx, p, time) {
    const N = 16;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (p.life - p.t) / 12);
    ctx.globalCompositeOperation = 'lighter';
    const pt = (i) => [p.x - p.dir * i * 20, p.y + Math.sin(time * 0.25 - i * 0.55) * 18 * Math.min(1, i / 3)];
    for (let i = N; i >= 1; i--) {
      const [x, y] = pt(i);
      glow(ctx, x, y, 40 * (1 - (i / N) * 0.7), p.col, i % 3 === 0 ? '#ffffff' : p.col2);
    }
    ctx.globalCompositeOperation = 'source-over';
    const [hx, hy] = pt(0);
    ctx.translate(hx, hy);
    ctx.scale(p.dir, 1);
    const hg = ctx.createLinearGradient(-20, 0, 50, 0);
    hg.addColorStop(0, p.col);
    hg.addColorStop(1, p.col2);
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(52, 6);
    ctx.lineTo(14, -24);
    ctx.lineTo(-18, -20);
    ctx.lineTo(-18, 20);
    ctx.lineTo(14, 26);
    ctx.closePath();
    ctx.fill();
    // boca aberta, chifres e olho
    ctx.fillStyle = 'rgba(27,18,48,0.6)';
    ctx.beginPath();
    ctx.moveTo(52, 6);
    ctx.lineTo(18, 4);
    ctx.lineTo(40, 16);
    ctx.fill();
    ctx.fillStyle = p.col2;
    ctx.beginPath();
    ctx.moveTo(-8, -20);
    ctx.lineTo(-40, -42);
    ctx.lineTo(-2, -12);
    ctx.moveTo(-8, 20);
    ctx.lineTo(-36, 40);
    ctx.lineTo(-2, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(16, -8, 7, 3.5, 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  // Flecha Cometa: haste de luz com rastro; carregada fica maior e dourada
  V.drawArrow = function (ctx, p, time) {
    const k = p.charge || 0, L = p.len || 60;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.dir, 1);
    ctx.globalCompositeOperation = 'lighter';
    const tg = ctx.createLinearGradient(-L * 1.6, 0, 0, 0);
    tg.addColorStop(0, 'rgba(47,139,255,0)');
    tg.addColorStop(1, k > 0.95 ? 'rgba(255,209,102,0.9)' : 'rgba(159,232,255,0.9)');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(0, -6 - k * 10);
    ctx.lineTo(-L * 1.6, 0);
    ctx.lineTo(0, 6 + k * 10);
    ctx.fill();
    glow(ctx, 0, 0, 18 + k * 30, k > 0.95 ? 'rgba(255,176,0,0.6)' : 'rgba(79,171,255,0.6)');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(14 + k * 10, 0);
    ctx.lineTo(-6, -6 - k * 4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 6 + k * 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-L, -1.5, L, 3);
    ctx.restore();
  };

  // chamado a cada quadro de golpe (fighter.updAttack)
  V.move = function (f, g, t) {
    const own = MOVES[f.def.id] && MOVES[f.def.id][f.moveId];
    if (own) own(g, f, t);
  };

  // ---------------- Atualização ----------------
  V.update = function (p) {
    if (p.delay > 0) {
      p.delay--;
      p.life++;
      return;
    }
    if (p.vx != null) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.drag) {
        p.vx *= p.drag;
        p.vy *= p.drag;
      }
      if (p.g) p.vy += p.g;
    }
    if (p.vr) p.rot += p.vr;
  };

  // ---------------- Desenho ----------------
  // ponto do lutador na hora do desenho (posição suave)
  function fpos(f) {
    const a = RR.renderAlpha == null || RR.paused ? 1 : RR.renderAlpha;
    if (f.px == null || Math.abs(f.x - f.px) > 120) return [f.x, f.y];
    return [f.px + (f.x - f.px) * a, f.py + (f.y - f.py) * a];
  }

  function star4(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = rot + (i / 8) * TAU, rr = i % 2 ? r * 0.28 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  // bola de energia: núcleo claro que se apaga na cor (somada à cena, brilha por cima)
  function glow(ctx, x, y, r, col, core) {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, core || '#ffffff');
    gr.addColorStop(0.35, col);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  function rngOf(seed) {
    let s = (seed * 9301 + 49297) % 233280;
    return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  }

  function spikePath(ctx, w, h, lean) {
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w * 0.18 + lean * h, -h);
    ctx.lineTo(w * 0.12 + lean * h, -h * 0.92);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
  }

  const DRAW = {
    dark(ctx, p, k) {
      // escurece a cena inteira (desenhado no mundo: um retângulo bem grande)
      ctx.globalAlpha = Math.min(1, k * 4, (1 - k) * 6) * 0.45;
      ctx.fillStyle = '#12051f';
      ctx.fillRect(-4000, -4000, 8000, 8000);
    },
    ghost(ctx, p, k) {
      ctx.save();
      ctx.globalAlpha = k * 0.7;
      ctx.translate(p.x, p.y);
      ctx.scale(p.dir, 1);
      const gr = ctx.createLinearGradient(0, -80, 0, 0);
      gr.addColorStop(0, 'rgba(255,95,210,0.9)');
      gr.addColorStop(1, 'rgba(143,59,255,0.2)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.ellipse(0, -36, 22, 38, 0.2, 0, TAU);
      ctx.fill();
      // risco do corte
      ctx.strokeStyle = '#ffe6fb';
      ctx.lineWidth = 5 * k + 1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-30, -90);
      ctx.lineTo(80, 10);
      ctx.stroke();
      ctx.restore();
    },
    target(ctx, p, k) {
      // marca no chão onde o sol vai cair
      const [fx] = fpos(p.f);
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 3) * 0.8;
      ctx.strokeStyle = '#ffb000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(fx, p.y - 2, 90 * (0.6 + k * 0.4), 18, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    },
    chunk(ctx, p, k) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, k * 3);
      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.4);
      ctx.lineTo(-s * 0.2, -s);
      ctx.lineTo(s, -s * 0.5);
      ctx.lineTo(s * 0.7, s * 0.7);
      ctx.lineTo(-s * 0.6, s * 0.8);
      ctx.closePath();
      ctx.fillStyle = p.col;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2a1a10';
      ctx.stroke();
      ctx.restore();
    },
    drop(ctx, p, k) {
      const a = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      ctx.globalAlpha = Math.min(1, k * 2.5);
      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(s * 2.4, 0);
      ctx.quadraticCurveTo(0, -s * 1.1, -s, 0);
      ctx.quadraticCurveTo(0, s * 1.1, s * 2.4, 0);
      ctx.fillStyle = '#6fd3ff';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-s * 0.1, -s * 0.3, s * 0.35, 0, TAU);
      ctx.fill();
      ctx.restore();
    },
    flame(ctx, p, k) {
      const s = p.size * (0.6 + Math.sin(k * Math.PI) * 0.6);
      ctx.globalAlpha = Math.min(1, k * 2);
      const cols = k > 0.6 ? ['#ff5a00', '#ffd166'] : k > 0.3 ? ['#ff3b1a', '#ff9a2a'] : ['#7a2a10', '#ff5a1a'];
      ctx.fillStyle = cols[0];
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s * 1.6);
      ctx.quadraticCurveTo(p.x + s, p.y - s * 0.2, p.x, p.y + s * 0.6);
      ctx.quadraticCurveTo(p.x - s, p.y - s * 0.2, p.x, p.y - s * 1.6);
      ctx.fill();
      ctx.fillStyle = cols[1];
      ctx.beginPath();
      ctx.arc(p.x, p.y, s * 0.42, 0, TAU);
      ctx.fill();
    },
    ember(ctx, p, k) {
      ctx.globalAlpha = k;
      ctx.fillStyle = k > 0.5 ? '#ffd166' : '#ff6a1a';
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    },
    star(ctx, p, k) {
      ctx.globalAlpha = Math.min(1, k * 2);
      star4(ctx, p.x, p.y, p.size * (0.5 + 0.5 * Math.abs(Math.sin(k * 9 + p.spin))), p.spin + k);
      ctx.fillStyle = p.col;
      ctx.fill();
    },
    smoke(ctx, p, k) {
      ctx.globalAlpha = p.a * k;
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.4 - k * 0.6), 0, TAU);
      ctx.fill();
    },
    pop(ctx, p, k) {
      ctx.globalAlpha = k;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1.2 - k * 0.6), 0, TAU);
      ctx.fill();
      ctx.lineWidth = 4 * k;
      ctx.strokeStyle = p.col;
      ctx.stroke();
    },
    shock(ctx, p, k) {
      ctx.globalAlpha = k;
      ctx.strokeStyle = p.col;
      ctx.lineWidth = 8 * k + 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 2, p.r * (1.15 - k), p.r * 0.22 * (1.15 - k), 0, 0, TAU);
      ctx.stroke();
    },
    crack(ctx, p, k) {
      const r = rngOf(p.seed);
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.strokeStyle = '#2a1a10';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1;
        let x = p.x, y = p.y;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const n = 3 + Math.floor(r() * 2);
        for (let j = 0; j < n; j++) {
          x += side * (p.r / n) * (0.6 + r() * 0.8);
          y = p.y + (r() - 0.5) * 6;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(93,255,106,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x - p.r * 0.5, p.y);
      ctx.lineTo(p.x + p.r * 0.5, p.y);
      ctx.stroke();
    },
    splash(ctx, p, k) {
      const s = 1 - k;
      ctx.globalAlpha = k;
      ctx.strokeStyle = '#8fdcff';
      ctx.lineWidth = 5 * k + 1;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r * (0.3 + s), p.r * 0.45 * (0.3 + s), 0, 0, TAU);
      ctx.stroke();
      // coroa de água
      ctx.fillStyle = '#d6f4ff';
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI + (i / 6) * Math.PI;
        const x = p.x + Math.cos(a) * p.r * (0.3 + s * 0.8), y = p.y + Math.sin(a) * p.r * 0.6 * (0.3 + s);
        ctx.beginPath();
        ctx.arc(x, y, 5 * k + 2, 0, TAU);
        ctx.fill();
      }
    },
    flare(ctx, p, k) {
      ctx.globalAlpha = k;
      ctx.fillStyle = p.col;
      star4(ctx, p.x, p.y, p.r * (1.3 - k * 0.5), 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      star4(ctx, p.x, p.y, p.r * 0.6 * (1.3 - k * 0.5), Math.PI / 4);
      ctx.fill();
    },
    slashX(ctx, p, k) {
      const s = Math.min(1, (1 - k) * 3);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.lineCap = 'round';
      for (const [w, c] of [[9, '#8f3bff'], [4, '#ffe6fb']]) {
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(-p.r, -p.r);
        ctx.lineTo(-p.r + 2 * p.r * s, -p.r + 2 * p.r * s);
        ctx.moveTo(p.r, -p.r);
        ctx.lineTo(p.r - 2 * p.r * s, -p.r + 2 * p.r * s);
        ctx.stroke();
      }
      ctx.restore();
    },
    yin(ctx, p, k) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot + (1 - k) * 4);
      ctx.globalAlpha = k;
      const r = p.r * (1.3 - k * 0.5);
      ctx.lineWidth = 7 * k + 2;
      ctx.strokeStyle = '#4dabff';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = '#ff5fd2';
      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI, TAU);
      ctx.stroke();
      ctx.fillStyle = '#4dabff';
      ctx.beginPath();
      ctx.arc(r * 0.45, 0, r * 0.22, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ff5fd2';
      ctx.beginPath();
      ctx.arc(-r * 0.45, 0, r * 0.22, 0, TAU);
      ctx.fill();
      ctx.restore();
    },
    spike(ctx, p, k) {
      const s = 1 - k;
      const grow = Math.min(1, s * 6), sink = k < 0.25 ? k / 0.25 : 1;
      const h = p.h * grow * sink;
      if (h < 2) return;
      ctx.save();
      ctx.translate(p.x, p.y + 4);
      const pal = p.crystal ? CRYSTAL : ['#5a3a20', '#a67c52', '#d9b48a'];
      if (p.crystal) {
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, p.lean * h * 0.6, -h * 0.6, h * 0.6, 'rgba(93,255,106,0.35)');
        ctx.globalCompositeOperation = 'source-over';
      }
      spikePath(ctx, p.w, h, p.lean);
      const sg = ctx.createLinearGradient(0, -h, 0, 0);
      sg.addColorStop(0, pal[2]);
      sg.addColorStop(0.4, pal[1]);
      sg.addColorStop(1, pal[0]);
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = p.crystal ? '#0d4a22' : '#3a2410';
      ctx.lineJoin = 'round';
      ctx.stroke();
      // face iluminada
      ctx.beginPath();
      ctx.moveTo(-p.w * 0.1, 0);
      ctx.lineTo(-p.w * 0.18 + p.lean * h, -h);
      ctx.lineTo(p.w * 0.12 + p.lean * h, -h * 0.92);
      ctx.lineTo(p.w * 0.3, 0);
      ctx.closePath();
      ctx.fillStyle = pal[2];
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.restore();
    },
  };

  V.draw = function (ctx, p) {
    if (p.delay > 0) return;
    const d = DRAW[p.k];
    if (d) d(ctx, p, p.life / p.max);
  };
})(window.RR);
