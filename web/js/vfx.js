// Efeitos visuais por elemento e por golpe: cortes em arco, respingos, pedras, chamas, estrelas,
// e as peças grandes dos especiais e ultimates (dragões, ferrão, leão de fogo, pilares de cristal...).
// Só aparência: o dano continua nas hitboxes de characters.js.
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

  // ---------------- Golpes ----------------
  // corte em arco preso ao lutador: ângulos no espaço local (0 = frente, positivo = para baixo)
  function arc(g, f, o) {
    return add(g, Object.assign({ k: 'arc', f, dir: f.facing, elem: f.move.hits ? f.move.hits[0].fx : 'neutral', life: 11 }, o));
  }

  // extra de cada elemento ao longo do corte (na ponta do arco)
  function arcBits(g, f, o, n) {
    const e = o.elem;
    for (let i = 0; i < n; i++) {
      const a = o.a0 + (o.a1 - o.a0) * (0.4 + Math.random() * 0.6);
      const x = f.x + f.facing * (o.ox + Math.cos(a) * o.r), y = f.y + o.oy + Math.sin(a) * o.r;
      const tx = -Math.sin(a) * Math.sign(o.a1 - o.a0), ty = Math.cos(a) * Math.sign(o.a1 - o.a0);
      if (e === 'fire') P.flame(g, x, y, f.facing * tx * 3, ty * 3 - 1, rnd(8, 14));
      else if (e === 'water') P.drop(g, x, y, f.facing * tx * 5, ty * 5 - 2, rnd(3, 5));
      else if (e === 'light') P.star(g, x, y, f.facing * tx * 3, ty * 3, rnd(5, 8));
      else if (e === 'twin') P.star(g, x, y, f.facing * tx * 3, ty * 3, rnd(5, 8), i % 2 ? '#4dabff' : '#ff5fd2');
      else if (e === 'shadow') P.smoke(g, x, y, f.facing * tx, ty, 10, '#a12bd6', 0.35);
      else if (e === 'rock') P.chunk(g, x, y, f.facing * tx * 4, ty * 4 - 3, rnd(4, 7));
    }
  }

  // soco pesado de pedra: sem arco, um cone de poeira e lascas para a frente
  function punch(g, f, o) {
    const x = f.x + f.facing * o.ox, y = f.y + o.oy;
    add(g, { k: 'cone', f, ox: o.ox, oy: o.oy, dir: f.facing, len: o.len, w: o.w, life: 10 });
    for (let i = 0; i < o.n; i++) P.chunk(g, x, y, f.facing * rnd(3, 9), rnd(-6, 1), rnd(4, 8), Math.random() < 0.3 ? '#5dff6a' : null);
    P.smoke(g, x, y, f.facing * 2, -0.5, 18, '#d8c3a5');
  }

  function basicFx(g, f, id, m) {
    const H = f.h, e = m.hits[0].fx, r = Math.max(60, m.hits[0].w * 0.75);
    const big = id === 'jab3';
    if (e === 'rock' && (id === 'jab1' || id === 'jab2' || id === 'jab3' || id === 'downG')) {
      punch(g, f, { ox: m.hits[0].cx, oy: m.hits[0].cy, len: m.hits[0].w * (big ? 1.2 : 0.9), w: big ? 70 : 44, n: big ? 8 : 4 });
      if (big || id === 'downG') {
        P.shock(g, f.x + f.facing * m.hits[0].cx, f.y, big ? 90 : 60, '#d9a066');
        add(g, { k: 'crack', x: f.x + f.facing * m.hits[0].cx, y: f.y, r: big ? 70 : 46, seed: Math.random() * 1000, life: 40 });
      }
      return;
    }
    let o;
    switch (id) {
      case 'jab1': o = { ox: 4, oy: -H * 0.55, r, a0: -1.1, a1: 0.7, w: 16 }; break;
      case 'jab2': o = { ox: 4, oy: -H * 0.5, r, a0: 0.9, a1: -1.2, w: 16 }; break;
      case 'jab3': o = { ox: 0, oy: -H * 0.55, r: r * 1.15, a0: -1.9, a1: 1.0, w: 26, life: 14 }; break;
      case 'upA': o = { ox: 0, oy: -H * 0.55, r: r * 0.9, a0: -0.2, a1: -3.0, w: 20, life: 13 }; break;
      case 'downG': o = { ox: 8, oy: -10, r: r * 0.9, a0: 0.5, a1: -0.25, w: 14, flat: 0.45 }; break;
      case 'nair': o = { ox: 0, oy: -H * 0.5, r: r * 0.85, a0: -1.6, a1: -1.6 + TAU * 0.95, w: 16, life: 14 }; break;
      case 'dair': o = { ox: 0, oy: -H * 0.35, r: r * 0.9, a0: 0.1, a1: 2.9, w: 20, life: 13 }; break;
      default: return;
    }
    o.elem = e;
    arc(g, f, o);
    arcBits(g, f, o, big ? 8 : 4);
    if (big && e === 'water') P.shock(g, f.x + f.facing * r * 0.9, f.y, 70, '#8fdcff');
    if (big && e === 'fire') for (let i = 0; i < 6; i++) P.flame(g, f.x + f.facing * rnd(30, r * 1.3), f.y - rnd(10, H), f.facing * rnd(1, 4), rnd(-3, -1), rnd(14, 22));
    if (id === 'downG') for (let i = 0; i < 3; i++) P.smoke(g, f.x + f.facing * rnd(20, r), f.y - 4, f.facing * rnd(0.5, 2), -0.3, 14, 'rgba(255,255,255,0.9)', 0.35);
  }

  // efeitos próprios de especiais, subidas e ultimates (t = quadro do golpe)
  const MOVES = {
    vex: {
      special(g, f, t) {
        if (t === 12) add(g, { k: 'yin', x: f.x + f.facing * 46, y: f.y - f.h * 0.5, r: 30, rot: 0, life: 12 });
      },
      recovery(g, f, t) {
        if (t === 4) add(g, { k: 'helix', f, cols: ['#4dabff', '#ff5fd2'], r: 46, h: 120, life: 24 });
        if (t > 4 && t < 28 && t % 3 === 0) P.star(g, f.x + rnd(-30, 30), f.y + rnd(-10, 20), 0, 1, rnd(5, 8), t % 2 ? '#4dabff' : '#ff5fd2');
      },
      ult(g, f, t) {
        if (t === 2) add(g, { k: 'sigil', f, cols: ['#4dabff', '#ff5fd2'], r: 120, life: 70 });
        if (t === 14) {
          add(g, { k: 'dragon', f, col: '#4dabff', col2: '#dff4ff', ph: 0, life: 42 });
          add(g, { k: 'dragon', f, col: '#ff5fd2', col2: '#ffe0f6', ph: Math.PI, life: 42 });
        }
      },
    },
    noxara: {
      recovery(g, f, t) {
        if (t === 4) add(g, { k: 'helix', f, cols: ['#d24dff'], r: 40, h: 110, sting: true, life: 22 });
      },
      ult(g, f, t) {
        if (t === 1) add(g, { k: 'eclipse', x: f.x + f.facing * 220, y: f.y - 250, r: 56, life: 76 });
        if (t === 10) add(g, { k: 'stinger', x: f.x + f.facing * 40, y: f.y, dir: f.facing, reach: 330, life: 44 });
        if (t === 46) {
          const x = f.x + f.facing * 300;
          P.shock(g, x, f.y, 110, '#d24dff', 22);
          for (let i = 0; i < 10; i++) P.smoke(g, x + rnd(-80, 80), f.y - rnd(0, 60), rnd(-2, 2), rnd(-1.5, -0.3), rnd(26, 40), '#7cff4d', 0.35);
        }
      },
    },
    astrael: {
      special(g, f, t) {
        if (t === 14) add(g, { k: 'flare', x: f.x + f.facing * 60, y: f.y - f.h * 0.5, r: 60, col: '#9fe8ff', life: 12 });
      },
      recovery(g, f, t) {
        if (t === 5) {
          add(g, { k: 'flare', x: f.x, y: f.y - 10, r: 90, col: '#9fe8ff', life: 16 });
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU;
            P.star(g, f.x, f.y - 10, Math.cos(a) * 7, Math.sin(a) * 7, rnd(7, 11), i % 3 ? '#ffffff' : '#ffd166');
          }
        }
        if (t > 5 && t < 23 && t % 2 === 0) P.star(g, f.x + rnd(-12, 12), f.y + 6, 0, 2, rnd(5, 8), '#9fe8ff');
      },
      ult(g, f, t) {
        if (t === 1) add(g, { k: 'constel', x: f.x + f.facing * 270, y: f.y - 430, w: 460, dir: f.facing, seed: Math.random() * 1000, life: 64 });
      },
    },
    solkar: {
      special(g, f, t) {
        if (t === 16) for (let i = 0; i < 8; i++) P.flame(g, f.x + f.facing * rnd(40, 80), f.y - f.h * 0.5 + rnd(-20, 20), f.facing * rnd(2, 6), rnd(-2, 1), rnd(12, 20));
      },
      recovery(g, f, t) {
        if (t === 6) add(g, { k: 'firePillar', f, life: 22 });
        if (t > 6 && t < 26 && t % 2 === 0) P.flame(g, f.x + rnd(-20, 20), f.y + rnd(-10, 20), 0, rnd(1, 3), rnd(12, 18));
      },
      ult(g, f, t) {
        if (t === 1) add(g, { k: 'sun', x: f.x - f.facing * 30, y: f.y - 220, r: 54, life: 76 });
        if (t === 16) add(g, { k: 'lion', x0: f.x + f.facing * 40, y: f.y, dir: f.facing, dist: 420, life: 36 });
      },
    },
    lunara: {
      special(g, f, t) {
        if (t === 40) add(g, { k: 'splash', x: f.x + f.facing * 90, y: f.y - f.h * 0.55, r: 70, life: 18 });
      },
      recovery(g, f, t) {
        if (t === 6) add(g, { k: 'column', f, life: 22 });
        if (t > 6 && t < 26 && t % 2 === 0) P.drop(g, f.x + rnd(-24, 24), f.y + 10, rnd(-3, 3), rnd(-2, 2), rnd(3, 6));
      },
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
        if (t > 5 && t < 22) add(g, { k: 'streak', x: f.x, y: f.y - f.h * 0.5, vx: -f.vx * 0.2, vy: -f.vy * 0.2, len: 40, life: 8 });
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

  // chamado a cada quadro de golpe (fighter.updAttack)
  V.move = function (f, g, t) {
    const m = f.move;
    const own = MOVES[f.def.id] && MOVES[f.def.id][f.moveId];
    if (own) own(g, f, t);
    else if (t === m.startup && m.hits && !m.hits[0].multi) basicFx(g, f, f.moveId, m);
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

  function crescent(ctx, r, a0, a1, w, flat) {
    const N = 18;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = a0 + (a1 - a0) * u;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * (flat || 1));
    }
    for (let i = N; i >= 0; i--) {
      const u = i / N, a = a0 + (a1 - a0) * u;
      const rr = r - w * Math.sin(u * Math.PI * 0.5) * (1 - 0.35 * u * u * u);
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * (flat || 1));
    }
    ctx.closePath();
  }

  function drawArc(ctx, p, k) {
    const [fx, fy] = fpos(p.f);
    const s = 1 - k;
    const head = Math.min(1, s * 2.6), tail = Math.max(0, s * 2.6 - 1.1) / 1.5;
    if (head <= tail) return;
    const a0 = p.a0 + (p.a1 - p.a0) * tail, a1 = p.a0 + (p.a1 - p.a0) * head;
    ctx.save();
    ctx.translate(fx + p.dir * p.ox, fy + p.oy);
    ctx.scale(p.dir, 1);
    const fade = Math.min(1, k * 2.2);
    const layers = (pal, r, w) => {
      ctx.globalAlpha = 0.35 * fade;
      crescent(ctx, r + 6, a0, a1, w + 12, p.flat);
      ctx.fillStyle = pal[0];
      ctx.fill();
      ctx.globalAlpha = 0.9 * fade;
      crescent(ctx, r, a0, a1, w, p.flat);
      ctx.fillStyle = pal[1];
      ctx.fill();
      ctx.globalAlpha = fade;
      crescent(ctx, r - 1, a0, a1, w * 0.38, p.flat);
      ctx.fillStyle = pal[2];
      ctx.fill();
    };
    if (p.elem === 'twin') {
      layers(PAL.light, p.r, p.w);
      ctx.rotate(0.18 * Math.sign(p.a1 - p.a0));
      layers(PAL.shadow, p.r - p.w * 0.9, p.w * 0.8);
    } else if (p.elem === 'shadow') {
      // garras: três cortes finos paralelos
      for (let i = 0; i < 3; i++) layers(PAL.shadow, p.r - i * (p.w * 0.75), p.w * 0.45);
    } else layers(PAL[p.elem] || PAL.neutral, p.r, p.w);
    ctx.restore();
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
    arc: drawArc,
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
    cone(ctx, p, k) {
      const [fx, fy] = fpos(p.f);
      const s = 1 - k;
      ctx.save();
      ctx.translate(fx + p.dir * (p.ox - p.len * 0.3), fy + p.oy);
      ctx.scale(p.dir, 1);
      ctx.globalAlpha = k * 0.85;
      const L = p.len * (0.5 + s * 0.8);
      const gr = ctx.createLinearGradient(0, 0, L, 0);
      gr.addColorStop(0, 'rgba(255,240,208,0.9)');
      gr.addColorStop(1, 'rgba(217,160,102,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(L, -p.w * (0.4 + s * 0.6));
      ctx.lineTo(L, p.w * (0.4 + s * 0.6));
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fill();
      // linhas de velocidade
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(L * 0.2 * s, i * p.w * 0.18);
        ctx.lineTo(L * (0.5 + s * 0.5), i * p.w * 0.3);
        ctx.stroke();
      }
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
    streak(ctx, p, k) {
      ctx.globalAlpha = k * 0.8;
      ctx.strokeStyle = '#fff0d0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * p.len * 0.3, p.y + p.vy * p.len * 0.3);
      ctx.stroke();
    },
    helix(ctx, p, k) {
      const [fx, fy] = fpos(p.f);
      const s = 1 - k, t = s * 10;
      ctx.save();
      ctx.translate(fx, fy - p.h * 0.45);
      ctx.globalAlpha = Math.min(1, k * 3);
      ctx.lineCap = 'round';
      p.cols.forEach((c, j) => {
        const ph = j * Math.PI;
        for (const [w, col] of [[10, c], [3, '#ffffff']]) {
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.beginPath();
          for (let i = 0; i <= 20; i++) {
            const u = i / 20, y = p.h * 0.6 - u * p.h * 1.1;
            ctx.lineTo(Math.sin(t + u * 7 + ph) * p.r * (0.6 + u * 0.4), y);
          }
          ctx.stroke();
        }
        if (p.sting) {
          // ponta do ferrão no alto da espiral
          const x = Math.sin(t + 7 + ph) * p.r, y = -p.h * 0.5;
          ctx.fillStyle = '#ffe6fb';
          ctx.beginPath();
          ctx.moveTo(x, y - 18);
          ctx.lineTo(x - 7, y);
          ctx.lineTo(x + 7, y);
          ctx.closePath();
          ctx.fill();
        }
      });
      ctx.restore();
    },
    column(ctx, p, k) {
      const [fx, fy] = fpos(p.f);
      const t = (1 - k) * 20;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 2.5) * 0.85;
      const top = fy + 4, bot = fy + 260, w = 30;
      const gr = ctx.createLinearGradient(0, top, 0, bot);
      gr.addColorStop(0, '#d6f4ff');
      gr.addColorStop(0.3, '#6fd3ff');
      gr.addColorStop(1, 'rgba(30,123,255,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const y = top + (i / 12) * (bot - top);
        ctx.lineTo(fx - w * (0.7 + i / 18) + Math.sin(t + i) * 5, y);
      }
      for (let i = 12; i >= 0; i--) {
        const y = top + (i / 12) * (bot - top);
        ctx.lineTo(fx + w * (0.7 + i / 18) + Math.sin(t + i + 2) * 5, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) ctx.lineTo(fx + Math.sin(t * 1.3 + i * 0.8) * 10, top + (i / 12) * 180);
      ctx.stroke();
      ctx.restore();
    },
    firePillar(ctx, p, k) {
      const [fx, fy] = fpos(p.f);
      const t = (1 - k) * 20;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 2.5);
      for (const [w, c] of [[44, 'rgba(255,90,0,0.55)'], [28, 'rgba(255,176,0,0.8)'], [12, 'rgba(255,243,196,0.95)']]) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(fx - w, fy + 20);
        for (let i = 0; i <= 8; i++) ctx.lineTo(fx - w * (1 - i / 10) + Math.sin(t + i * 1.7) * 6, fy + 20 - i * 26);
        ctx.lineTo(fx, fy - 210 + Math.sin(t) * 10);
        for (let i = 8; i >= 0; i--) ctx.lineTo(fx + w * (1 - i / 10) + Math.sin(t + i * 1.3 + 1) * 6, fy + 20 - i * 26);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },
    sigil(ctx, p, k) {
      const [fx, fy] = fpos(p.f);
      const s = 1 - k;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.scale(1, 0.3);
      ctx.globalAlpha = Math.min(1, k * 3, s * 6) * 0.9;
      ctx.lineWidth = 6;
      for (let j = 0; j < 2; j++) {
        ctx.strokeStyle = p.cols[j];
        ctx.beginPath();
        ctx.arc(0, 0, p.r * (0.7 + j * 0.3), s * 6 * (j ? -1 : 1), s * 6 * (j ? -1 : 1) + Math.PI * 1.6);
        ctx.stroke();
      }
      ctx.restore();
    },
    dragon(ctx, p, k) {
      // dragão espiritual: corpo em fita que gira em volta do Vex e se abre para os lados
      const [fx, fy] = fpos(p.f);
      const s = 1 - k;
      const pos = (u) => {
        const a = p.ph + u * TAU * 1.7;
        const R = 50 + u * 280;
        return [fx + Math.cos(a) * R, fy - 70 + Math.sin(a) * R * 0.45 - u * 30];
      };
      const N = 22, len = 0.32;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 4, s * 8);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = N; i >= 0; i--) {
        const u = Math.max(0, s - (i / N) * len);
        const [x, y] = pos(u);
        glow(ctx, x, y, 34 * (1 - (i / N) * 0.7), p.col, i % 3 === 0 ? '#ffffff' : p.col2);
      }
      ctx.globalCompositeOperation = 'source-over';
      // cabeça
      const [hx, hy] = pos(s), [bx, by] = pos(Math.max(0, s - 0.02));
      const ang = Math.atan2(hy - by, hx - bx);
      ctx.translate(hx, hy);
      ctx.rotate(ang);
      const hg = ctx.createLinearGradient(-14, 0, 42, 0);
      hg.addColorStop(0, p.col);
      hg.addColorStop(1, p.col2);
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.moveTo(42, 0);
      ctx.lineTo(10, -22);
      ctx.lineTo(-14, -18);
      ctx.lineTo(-14, 18);
      ctx.lineTo(10, 22);
      ctx.closePath();
      ctx.fill();
      // chifres e olho
      ctx.fillStyle = p.col2;
      ctx.beginPath();
      ctx.moveTo(-6, -18);
      ctx.lineTo(-30, -34);
      ctx.lineTo(-2, -10);
      ctx.moveTo(-6, 18);
      ctx.lineTo(-30, 34);
      ctx.lineTo(-2, 10);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(12, -8, 6, 3, 0.3, 0, TAU);
      ctx.fill();
      ctx.restore();
    },
    eclipse(ctx, p, k) {
      const s = 1 - k;
      const a = Math.min(1, s * 5, k * 4);
      ctx.save();
      ctx.globalAlpha = a;
      const gr = ctx.createRadialGradient(p.x, p.y, p.r * 0.8, p.x, p.y, p.r * 2.2);
      gr.addColorStop(0, 'rgba(210,77,255,0.9)');
      gr.addColorStop(1, 'rgba(210,77,255,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 2.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#12051f';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ff5fd2';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    },
    stinger(ctx, p, k) {
      // cauda gigante: sobe do chão, enrola e crava o ferrão à frente
      const s = 1 - k;
      const rise = Math.min(1, s / 0.45);
      const strike = s < 0.7 ? 0 : Math.min(1, (s - 0.7) / 0.12);
      const back = s > 0.9 ? (s - 0.9) / 0.1 : 0;
      const N = 14;
      const pts = [];
      // curva em gancho: cada gomo vira um pouco mais para a frente; no bote ela se estica
      const T = rise * 2.5 - strike * 0.7, L = 24 * rise + strike * 12;
      pts.push([p.x, p.y]);
      for (let i = 1; i <= N; i++) {
        const th = (i / N) * T;
        const [x, y] = pts[i - 1];
        pts.push([x + p.dir * Math.sin(th) * L, y - Math.cos(th) * L]);
      }
      ctx.save();
      ctx.globalAlpha = 1 - back;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i <= N; i++) glow(ctx, pts[i][0], pts[i][1], 46 - i * 1.6, 'rgba(210,77,255,0.55)', 'rgba(255,95,210,0.7)');
      ctx.globalCompositeOperation = 'source-over';
      // gomos da carapaça: placas curvas que acompanham a cauda
      for (let i = 1; i <= N; i++) {
        const [x, y] = pts[i], [px0, py0] = pts[i - 1];
        const a = Math.atan2(y - py0, x - px0), r = 24 - i * 1.1;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        const pg = ctx.createLinearGradient(0, -r, 0, r);
        pg.addColorStop(0, '#ff9be8');
        pg.addColorStop(0.5, '#a12bd6');
        pg.addColorStop(1, '#3a0f5c');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.9, r, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      const [tx, ty] = pts[N], [px, py] = pts[N - 1];
      const ang = Math.atan2(ty - py, tx - px);
      ctx.translate(tx, ty);
      ctx.rotate(ang);
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 14, 0, 40, 'rgba(124,255,77,0.6)');
      ctx.globalCompositeOperation = 'source-over';
      const tg = ctx.createLinearGradient(-6, 0, 48, 0);
      tg.addColorStop(0, '#d24dff');
      tg.addColorStop(1, '#ffffff');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(48, 0);
      ctx.quadraticCurveTo(10, -6, -6, -16);
      ctx.lineTo(-6, 16);
      ctx.quadraticCurveTo(10, 6, 48, 0);
      ctx.fill();
      ctx.restore();
    },
    constel(ctx, p, k) {
      const s = 1 - k;
      const r = rngOf(p.seed);
      const pts = [];
      for (let i = 0; i < 9; i++) pts.push([p.x + (r() - 0.5) * p.w, p.y + (r() - 0.5) * 140]);
      ctx.save();
      ctx.globalAlpha = Math.min(1, s * 4, k * 3);
      const n = Math.min(pts.length, Math.floor(s * 30));
      ctx.strokeStyle = 'rgba(159,232,255,0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i % 3 ? '#ffffff' : '#ffd166';
        star4(ctx, pts[i][0], pts[i][1], 12 + Math.sin(s * 20 + i) * 4, s * 3);
        ctx.fill();
      }
      ctx.restore();
    },
    sun(ctx, p, k) {
      const s = 1 - k;
      const y = p.y + (1 - Math.min(1, s * 3)) * 120;
      ctx.save();
      ctx.globalAlpha = Math.min(1, s * 4, k * 4);
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(p.x, y);
      glow(ctx, 0, 0, p.r * 2.4, 'rgba(255,140,42,0.45)', 'rgba(255,243,196,0.9)');
      ctx.rotate(s * 2);
      for (let i = 0; i < 12; i++) {
        ctx.rotate(TAU / 12);
        const rg = ctx.createLinearGradient(p.r * 0.8, 0, p.r * 2, 0);
        rg.addColorStop(0, 'rgba(255,209,102,0.8)');
        rg.addColorStop(1, 'rgba(255,90,0,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(p.r * 0.8, -10);
        ctx.lineTo(p.r * 2, 0);
        ctx.lineTo(p.r * 0.8, 10);
        ctx.fill();
      }
      glow(ctx, 0, 0, p.r, '#ffd166', '#ffffff');
      ctx.restore();
    },
    lion(ctx, p, k) {
      // leão de energia solar: juba de chamas, rosto de luz e coroa, avançando pelo chão
      const s = 1 - k;
      const e = 1 - Math.pow(1 - Math.min(1, s / 0.75), 2);
      const x = p.x0 + p.dir * p.dist * e, y = p.y - 90;
      const R = 50 + Math.min(1, s * 4) * 22;
      ctx.save();
      ctx.globalAlpha = Math.min(1, s * 6, k * 4);
      // rastro de chamas no chão
      const gr = ctx.createLinearGradient(p.x0, 0, x, 0);
      gr.addColorStop(0, 'rgba(255,90,0,0)');
      gr.addColorStop(1, 'rgba(255,176,0,0.8)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(p.x0, p.y);
      for (let i = 0; i <= 10; i++) ctx.lineTo(p.x0 + (x - p.x0) * (i / 10), p.y - 30 - (i / 10) * 60 - Math.abs(Math.sin(s * 25 + i)) * 20);
      ctx.lineTo(x, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.translate(x, y);
      ctx.scale(p.dir, 1);
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, 0, R * 2.3, 'rgba(255,90,0,0.5)', 'rgba(255,209,102,0.8)');
      // juba: línguas de fogo para trás e para os lados
      for (let i = 0; i < 14; i++) {
        const a = Math.PI * 0.5 + (i / 13) * Math.PI + Math.sin(s * 20 + i) * 0.08;
        const L = R * (1.5 + Math.abs(Math.sin(s * 18 + i * 1.7)) * 0.6);
        const fg = ctx.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L);
        fg.addColorStop(0, 'rgba(255,243,196,0.9)');
        fg.addColorStop(0.5, 'rgba(255,140,42,0.7)');
        fg.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.25) * R * 0.6, Math.sin(a - 0.25) * R * 0.6);
        ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L);
        ctx.lineTo(Math.cos(a + 0.25) * R * 0.6, Math.sin(a + 0.25) * R * 0.6);
        ctx.fill();
      }
      // focinho
      glow(ctx, R * 0.25, R * 0.15, R * 0.95, 'rgba(255,209,102,0.85)', '#ffffff');
      glow(ctx, R * 0.7, R * 0.3, R * 0.45, 'rgba(255,209,102,0.7)', '#fff3c4');
      ctx.globalCompositeOperation = 'source-over';
      // olhos brancos em fenda
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(R * 0.15, -R * 0.12);
      ctx.lineTo(R * 0.55, -R * 0.22);
      ctx.lineTo(R * 0.5, -R * 0.06);
      ctx.closePath();
      ctx.fill();
      // boca rugindo
      ctx.fillStyle = 'rgba(122,42,16,0.8)';
      ctx.beginPath();
      ctx.ellipse(R * 0.62, R * 0.52, R * 0.18, R * 0.08 + Math.abs(Math.sin(s * 14)) * R * 0.08, 0.2, 0, TAU);
      ctx.fill();
      // coroa dourada
      const cg = ctx.createLinearGradient(0, -R * 1.2, 0, -R * 0.6);
      cg.addColorStop(0, '#fff6c0');
      cg.addColorStop(1, '#ffb000');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(-R * 0.35, -R * 0.62);
      ctx.lineTo(-R * 0.28, -R * 1.02);
      ctx.lineTo(-R * 0.06, -R * 0.76);
      ctx.lineTo(R * 0.12, -R * 1.14);
      ctx.lineTo(R * 0.28, -R * 0.76);
      ctx.lineTo(R * 0.48, -R * 0.98);
      ctx.lineTo(R * 0.46, -R * 0.6);
      ctx.closePath();
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
