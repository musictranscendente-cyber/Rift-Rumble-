// Personagens: atributos, skills e golpes
// Hitbox: cx (para frente), cy (a partir dos pés, negativo = para cima), w, h,
// dmg (dano %), kb (knockback base), gr (crescimento por 100%), ang (graus; 0 = frente, 90 = cima)
(function (RR) {
  const C = (RR.chars = {});
  const hb = (cx, cy, w, h, dmg, kb, gr, ang, extra) =>
    Object.assign({ cx, cy, w, h, dmg, kb, gr, ang }, extra || {});

  // Golpes básicos comuns, ajustados por arquétipo
  function basics(o) {
    const r = o.reach, p = o.pow, s = o.spd, H = o.h, fx = o.fx;
    return {
      jab1: {
        startup: 3 + s, active: 3, recovery: 8 + s, chain: 'jab2', step: 2, sfx: 'swing', anim: 'swing',
        hits: [hb(r * 0.5 + 12, -H * 0.55, r, 38, 3 * p, 3, 2, 25, { fx })],
      },
      jab2: {
        startup: 3 + s, active: 3, recovery: 9 + s, chain: 'jab3', step: 2, sfx: 'swing', anim: 'swing2',
        hits: [hb(r * 0.5 + 12, -H * 0.5, r, 38, 3 * p, 3, 2, 25, { fx })],
      },
      jab3: {
        startup: 6 + s, active: 4, recovery: 18 + s, step: 5, sfx: 'swing', anim: 'swing',
        hits: [hb(r * 0.6 + 14, -H * 0.5, r * 1.25, 50, 6 * p, 8, 12, 38, { fx })],
      },
      upA: {
        startup: 5 + s, active: 6, recovery: 13 + s, sfx: 'swing', anim: 'up', air: true, lc: true, landLag: 6,
        hits: [hb(8, -H - 16, r + 30, 60, 7 * p, 7, 14, 88, { fx })],
      },
      downG: {
        startup: 5 + s, active: 4, recovery: 13 + s, sfx: 'swing', anim: 'low',
        hits: [hb(r * 0.6 + 10, -12, r * 1.2, 26, 6 * p, 6, 11, 22, { fx })],
      },
      nair: {
        startup: 4 + s, active: 9, recovery: 10, sfx: 'swing', anim: 'spin', air: true, lc: true, landLag: 6,
        hits: [hb(0, -H * 0.5, o.w + r * 1.3, H + 16, 7 * p, 6, 11, 45, { fx, radial: true })],
      },
      dair: {
        startup: 9 + s, active: 5, recovery: 14, sfx: 'swing', anim: 'down', air: true, lc: true, landLag: 10,
        hits: [hb(0, 14, r + 14, 42, 9 * p, 6, 9, -75, { fx })],
      },
    };
  }

  // ---------------- KAEL: equilibrado, fogo ----------------
  C.kael = {
    id: 'kael', name: 'Kael', title: 'Espadachim Flamejante', arche: 'Equilibrado',
    color: '#ff5a36', color2: '#ffd166', dark: '#7a1f10', fxColor: '#ff8c2a',
    alts: [{ color: '#3d7bff', color2: '#bfe3ff', dark: '#1a2f7a' }, { color: '#2fbf71', color2: '#e0ffd0', dark: '#145a33' }, { color: '#e8e8f0', color2: '#ffd166', dark: '#55556a' }],
    w: 50, h: 92, weight: 100, walk: 6.2, air: 5.0, airAccel: 0.55, jump: 17, djump: 15.5, jumps: 2,
    grav: 0.85, fall: 13, ff: 19,
    stats: { Velocidade: 3, Força: 3, Peso: 3, Alcance: 3 },
    skills: [
      { key: 'A', name: 'Lâmina Ígnea', desc: 'Combo de 3 golpes de espada.' },
      { key: 'B', name: 'Bola de Fogo', desc: 'Projétil de fogo em linha reta.' },
      { key: '↑B', name: 'Ascensão Flamejante', desc: 'Salto giratório que acerta duas vezes.' },
      { key: 'ULT', name: 'Inferno', desc: 'Corte gigante de fogo com impacto enorme.' },
    ],
    ai: { pref: 70, range: 95, specialRange: 560, ultRange: 330 },
    moves: Object.assign(basics({ reach: 64, pow: 1, spd: 0, h: 92, w: 50, fx: 'fire' }), {
      special: {
        name: 'Bola de Fogo', startup: 12, active: 1, recovery: 18, cooldown: 45, air: true, sfx: 'fire', anim: 'cast',
        onFrame(f, g, t) {
          if (t === 12)
            g.spawnProjectile(f, {
              type: 'fireball', x: f.x + f.facing * 42, y: f.y - f.h * 0.55, vx: f.facing * 11.5,
              w: 34, h: 28, life: 75, fx: 'fire', hit: hb(0, 0, 0, 0, 7, 5, 7, 30, { fx: 'fire' }),
            });
        },
      },
      recovery: {
        name: 'Ascensão Flamejante', startup: 4, active: 22, recovery: 10, helpless: true, air: true, lc: true,
        landLag: 12, grav: 0.55, sfx: 'fire', anim: 'rise',
        onFrame(f, g, t) {
          if (t === 4) {
            f.vy = -19;
            f.vx = f.inp.mx * 3.5;
          }
          if (t > 4 && t < 26 && t % 3 === 0) g.burst(f.x, f.y - f.h * 0.5, 'fire', 2);
        },
        hits: [
          hb(12, -50, 86, 104, 5, 6, 6, 80, { fx: 'fire', t1: 10 }),
          hb(12, -60, 96, 110, 6, 8, 10, 75, { fx: 'fire', t0: 12, group: 1 }),
        ],
      },
      ult: {
        name: 'Inferno', startup: 14, active: 8, recovery: 30, air: true, grav: 0.15, noDrift: true,
        intang: [1, 14], sfx: 'fire', anim: 'big',
        onFrame(f, g, t) {
          if (t === 1) {
            f.vx = 0;
            f.vy = Math.min(f.vy, 0) * 0.3;
          }
          if (t === 14) {
            g.shake = 22;
            g.flashScreen('#ff7a2a', 0.45);
            g.burst(f.x + f.facing * 170, f.y - 60, 'fire', 45, 14);
            RR.audio.play('heavyhit');
          }
        },
        hits: [hb(175, -60, 370, 240, 25, 4, 20, 40, { fx: 'fire' })],
      },
    }),
  };

  // ---------------- ZYRA: rápida, vento ----------------
  C.zyra = {
    id: 'zyra', name: 'Zyra', title: 'Ninja do Vento', arche: 'Rápida',
    color: '#21d4a8', color2: '#c8fff0', dark: '#0b5c49', fxColor: '#7dfce0',
    alts: [{ color: '#ffb000', color2: '#fff1c2', dark: '#7a4a00' }, { color: '#ff5fa2', color2: '#ffe0f0', dark: '#7a1f4a' }, { color: '#4a4a5a', color2: '#d0d0e0', dark: '#1a1a24' }],
    w: 44, h: 84, weight: 82, walk: 7.8, air: 6.2, airAccel: 0.75, jump: 18, djump: 16.5, jumps: 3,
    grav: 0.95, fall: 14, ff: 20,
    stats: { Velocidade: 5, Força: 2, Peso: 1, Alcance: 2 },
    skills: [
      { key: 'A', name: 'Lâminas Gêmeas', desc: 'Combo rápido de adagas. Pulo triplo.' },
      { key: 'B', name: 'Corte do Vento', desc: 'Avanço veloz que atravessa o inimigo.' },
      { key: '↑B', name: 'Tornado', desc: 'Sobe girando e prende quem estiver perto.' },
      { key: 'ULT', name: 'Tempestade de Lâminas', desc: 'Investida invencível com vários cortes.' },
    ],
    ai: { pref: 55, range: 80, specialRange: 300, ultRange: 380 },
    moves: Object.assign(basics({ reach: 52, pow: 0.85, spd: -1, h: 84, w: 44, fx: 'wind' }), {
      special: {
        name: 'Corte do Vento', startup: 6, active: 12, recovery: 14, cooldown: 35, air: true, oncePerAir: true,
        grav: 0, noDrift: true, sfx: 'dash', anim: 'dash',
        onFrame(f, g, t) {
          if (t === 6) f.vx = f.facing * 17;
          if (t >= 6 && t < 18) {
            f.vy = 0;
            if (t % 2 === 0) g.burst(f.x - f.facing * 20, f.y - f.h * 0.5, 'wind', 1);
          }
          if (t === 18) f.vx *= 0.3;
        },
        hits: [hb(22, -42, 72, 62, 8, 7, 12, 35, { fx: 'wind' })],
      },
      recovery: {
        name: 'Tornado', startup: 3, active: 26, recovery: 8, helpless: true, air: true, lc: true, landLag: 12,
        grav: 0, noDrift: true, sfx: 'wind', anim: 'spin',
        onFrame(f, g, t) {
          if (t >= 3 && t < 29) {
            f.vy = -12.5 + (t - 3) * 0.25;
            f.vx = f.inp.mx * 5.5;
            if (t % 3 === 0) g.burst(f.x, f.y - 10, 'wind', 2);
          }
        },
        hits: [
          hb(0, -45, 92, 112, 1.5, 4, 2, 85, { fx: 'wind', multi: 5, radial: true, t1: 22 }),
          hb(0, -50, 100, 118, 4, 8, 11, 80, { fx: 'wind', t0: 22, group: 1 }),
        ],
      },
      ult: {
        name: 'Tempestade de Lâminas', startup: 10, active: 36, recovery: 20, air: true, grav: 0, noDrift: true,
        intang: [1, 46], sfx: 'dash', anim: 'dash',
        onFrame(f, g, t) {
          if (t === 10) f.vx = f.facing * 14;
          if (t > 1 && t < 46) f.vy = 0;
          if (t === 30) f.vx = 0;
          if (t > 10 && t < 46 && t % 2 === 0)
            g.burst(f.x + U_rand(-60, 60), f.y - f.h * 0.5 + U_rand(-40, 40), 'wind', 1);
          if (t === 38) {
            g.shake = 18;
            g.flashScreen('#7dfce0', 0.35);
            RR.audio.play('heavyhit');
          }
        },
        hits: [
          hb(10, -42, 150, 110, 2, 2, 0, 15, { fx: 'wind', multi: 4, t1: 26 }),
          hb(0, -48, 230, 170, 12, 4, 19, 42, { fx: 'wind', t0: 28, group: 1, radial: true }),
        ],
      },
    }),
  };

  // ---------------- GORAK: pesado, pedra ----------------
  C.gorak = {
    id: 'gorak', name: 'Gorak', title: 'Golem de Pedra', arche: 'Pesado',
    color: '#a67c52', color2: '#ffb347', dark: '#4a3422', fxColor: '#c79a6b',
    alts: [{ color: '#7a8a99', color2: '#7df9ff', dark: '#2e3740' }, { color: '#5f8a4a', color2: '#d4ff6b', dark: '#2a4020' }, { color: '#c9c3b8', color2: '#ff5a5a', dark: '#5a554c' }],
    w: 64, h: 104, weight: 125, walk: 4.6, air: 4.1, airAccel: 0.45, jump: 15.8, djump: 14.2, jumps: 2,
    grav: 0.95, fall: 15, ff: 21,
    stats: { Velocidade: 1, Força: 5, Peso: 5, Alcance: 3 },
    skills: [
      { key: 'A', name: 'Punhos de Rocha', desc: 'Socos lentos e muito fortes.' },
      { key: 'B', name: 'Tremor', desc: 'Soca o chão e cria ondas de pedra. Resiste a golpes.' },
      { key: '↑B', name: 'Salto Rochoso', desc: 'Pulo blindado com golpe forte.' },
      { key: 'ULT', name: 'Meteoro', desc: 'Salta alto e cai causando um terremoto.' },
    ],
    ai: { pref: 75, range: 105, specialRange: 420, ultRange: 300 },
    moves: Object.assign(basics({ reach: 66, pow: 1.35, spd: 3, h: 104, w: 64, fx: 'rock' }), {
      special: {
        name: 'Tremor', startup: 18, active: 4, recovery: 22, cooldown: 70, air: true, armor: [1, 18],
        sfx: 'rock', anim: 'slam',
        onFrame(f, g, t) {
          if (!f.grounded && t === 17) {
            f.moveT = 16; // segura até tocar o chão
            f.vy = 18;
          }
          if (t === 18) {
            g.shake = 10;
            g.burst(f.x, f.y, 'rock', 14);
            for (const dir of [-1, 1])
              g.spawnProjectile(f, {
                type: 'wave', x: f.x + dir * 50, y: f.y, vx: dir * 9, w: 44, h: 54, life: 48, fx: 'rock',
                ground: true, hit: hb(0, 0, 0, 0, 10, 8, 12, 72, { fx: 'rock' }),
              });
          }
        },
        hits: [hb(0, -24, 130, 52, 8, 7, 10, 75, { fx: 'rock' })],
      },
      recovery: {
        name: 'Salto Rochoso', startup: 6, active: 16, recovery: 12, helpless: true, air: true, lc: true,
        landLag: 14, armor: [1, 12], sfx: 'rock', anim: 'rise',
        onFrame(f, g, t) {
          if (t === 6) {
            f.vy = -21;
            f.vx = f.inp.mx * 3 + f.facing;
          }
        },
        hits: [hb(10, -64, 92, 112, 11, 8, 13, 80, { fx: 'rock', t1: 8 })],
      },
      ult: {
        name: 'Meteoro', startup: 8, active: 70, recovery: 26, air: true, armor: [1, 90], noDrift: true,
        sfx: 'rock', anim: 'slam',
        onFrame(f, g, t) {
          if (t === 8) {
            f.vy = -24;
            f.vx = f.facing * 4;
          }
          if (t >= 30 && !f.mvar.slam) f.vy = 24;
          if (t > 12 && f.grounded && !f.mvar.slam) {
            f.mvar.slam = true;
            f.vx = 0;
            g.shake = 30;
            g.flashScreen('#ffb347', 0.4);
            g.burst(f.x, f.y, 'rock', 40, 14);
            RR.audio.play('heavyhit');
            g.spawnProjectile(f, {
              type: 'blast', x: f.x, y: f.y - 70, w: 560, h: 190, life: 8, fx: 'rock', pierce: true, radial: true,
              hit: hb(0, 0, 0, 0, 24, 7, 20, 68, { fx: 'rock' }),
            });
            f.moveT = f.move.startup + f.move.active;
          }
          if (t === f.move.startup + f.move.active - 1 && !f.mvar.slam) f.mvar.fail = true;
        },
        hits: [hb(0, -52, 100, 112, 10, 9, 10, 60, { fx: 'rock', t0: 22 })],
      },
    }),
  };

  // ---------------- LUMI: à distância, gelo ----------------
  C.lumi = {
    id: 'lumi', name: 'Lumi', title: 'Maga do Gelo', arche: 'À distância',
    color: '#8f6bff', color2: '#9ff3ff', dark: '#3b2a7a', fxColor: '#9ff3ff',
    alts: [{ color: '#ff5fa2', color2: '#ffe0f0', dark: '#7a1f4a' }, { color: '#2fa4ff', color2: '#ffffff', dark: '#103a6a' }, { color: '#333344', color2: '#b7ff6b', dark: '#15151f' }],
    w: 46, h: 88, weight: 88, walk: 5.5, air: 5.4, airAccel: 0.6, jump: 16, djump: 15, jumps: 2,
    grav: 0.72, fall: 10.5, ff: 16,
    stats: { Velocidade: 3, Força: 2, Peso: 2, Alcance: 5 },
    skills: [
      { key: 'A', name: 'Cajado Cristal', desc: 'Golpes de cajado com bom alcance.' },
      { key: 'B', name: 'Estilhaço de Gelo', desc: 'Três cristais que congelam por um instante.' },
      { key: '↑B', name: 'Teleporte', desc: 'Some e reaparece na direção escolhida.' },
      { key: 'ULT', name: 'Raio Prismático', desc: 'Raio enorme que atravessa a arena.' },
    ],
    ai: { pref: 260, range: 100, specialRange: 650, ultRange: 900 },
    moves: Object.assign(basics({ reach: 74, pow: 0.9, spd: 1, h: 88, w: 46, fx: 'ice' }), {
      special: {
        name: 'Estilhaço de Gelo', startup: 10, active: 1, recovery: 20, cooldown: 50, air: true, sfx: 'ice', anim: 'cast',
        onFrame(f, g, t) {
          if (t === 10)
            for (const a of [-12, 0, 12]) {
              const r = (a * Math.PI) / 180;
              g.spawnProjectile(f, {
                type: 'shard', x: f.x + f.facing * 40, y: f.y - f.h * 0.6,
                vx: Math.cos(r) * 13 * f.facing, vy: Math.sin(r) * 13, w: 26, h: 18, life: 55, fx: 'ice',
                hit: hb(0, 0, 0, 0, 4, 4, 5, 20, { fx: 'ice', freeze: 8 }),
              });
            }
        },
      },
      recovery: {
        name: 'Teleporte', startup: 12, active: 2, recovery: 14, helpless: true, air: true, lc: true, landLag: 10,
        grav: 0, noDrift: true, intang: [1, 15], anim: 'cast',
        onFrame(f, g, t) {
          if (t === 1) {
            let dx = f.inp.mx, dy = f.inp.my;
            const len = Math.hypot(dx, dy);
            if (len < 0.3) { dx = 0; dy = -1; } else { dx /= len; dy /= len; }
            f.mvar.dx = dx;
            f.mvar.dy = dy;
            f.vx = 0;
            f.vy = 0;
            f.hidden = true;
            g.burst(f.x, f.y - f.h / 2, 'ice', 12);
            RR.audio.play('teleport');
          }
          if (t < 12) { f.vx = 0; f.vy = 0; }
          if (t === 12) {
            g.teleport(f, f.mvar.dx * 280, f.mvar.dy * 280);
            f.hidden = false;
            f.vx = f.mvar.dx * 4;
            f.vy = f.mvar.dy * 4;
            g.burst(f.x, f.y - f.h / 2, 'ice', 12);
          }
        },
        hits: [hb(0, -44, 120, 116, 6, 7, 8, 70, { fx: 'ice', radial: true })],
      },
      ult: {
        name: 'Raio Prismático', startup: 30, active: 48, recovery: 22, air: true, grav: 0.1, noDrift: true,
        intang: [1, 30], sfx: 'ult', anim: 'cast',
        onFrame(f, g, t) {
          if (t === 1) { f.vx = 0; f.vy = 0; }
          if (t < 30 && t % 2 === 0) g.burst(f.x + f.facing * 40, f.y - f.h * 0.6, 'ice', 1);
          if (t === 30) {
            g.flashScreen('#c7f7ff', 0.4);
            g.shake = 14;
            g.spawnProjectile(f, {
              type: 'beam', x: f.x, y: f.y, w: 1100, h: 86, life: 48, fx: 'ice', pierce: true, attached: true,
              hit: hb(0, 0, 0, 0, 2.5, 3, 1, 8, { fx: 'ice', multi: 5 }),
              final: hb(0, 0, 0, 0, 12, 5, 19, 32, { fx: 'ice' }),
            });
          }
        },
      },
    }),
  };

  // ---------------- VEX: gêmeos (Gêmeos), luz e sombra — arte em sprites ----------------
  C.vex = {
    id: 'vex', name: 'Vex', title: 'Gêmeos de Luz e Sombra', arche: 'Gêmeos', sign: '♊',
    sprite: 'vex',
    color: '#4dabff', color2: '#ff5fd2', dark: '#1d1440', fxColor: '#9fd8ff',
    alts: [{ color: '#ff5fd2', color2: '#4dabff', dark: '#2a0f33' }],
    w: 46, h: 80, weight: 86, walk: 7, air: 5.8, airAccel: 0.7, jump: 17.5, djump: 16, jumps: 2,
    grav: 0.85, fall: 13, ff: 19,
    stats: { Velocidade: 4, Força: 3, Peso: 2, Alcance: 3 },
    skills: [
      { key: 'A', name: 'Combo Gêmeo', desc: 'Três golpes; no 2º e 3º os dois gêmeos atacam juntos.' },
      { key: 'B', name: 'Orbe Dual', desc: 'Alterna: orbe de luz (rápido) e orbe de sombra (forte).' },
      { key: '↑B', name: 'Espiral Gêmea', desc: 'Os gêmeos sobem girando e puxam quem estiver perto.' },
      { key: 'ULT', name: 'Dragões Gêmeos', desc: 'Dois dragões espirituais varrem a área ao redor.' },
    ],
    ai: { pref: 80, range: 90, specialRange: 560, ultRange: 260 },
    moves: Object.assign(basics({ reach: 60, pow: 0.95, spd: -1, h: 80, w: 46, fx: 'twin' }), {
      special: {
        name: 'Orbe Dual', startup: 12, active: 1, recovery: 18, cooldown: 40, air: true, sfx: 'ice',
        onStart(f) {
          f.twinDark = !f.twinDark;
        },
        onFrame(f, g, t) {
          if (t !== 12) return;
          const dark = f.twinDark;
          g.spawnProjectile(f, {
            type: 'orb', sprite: dark ? 'orbB' : 'orbA', scale: dark ? 0.6 : 0.52,
            x: f.x + f.facing * 46, y: f.y - f.h * 0.5, vx: f.facing * (dark ? 9 : 12.5),
            w: dark ? 46 : 38, h: dark ? 46 : 38, life: dark ? 80 : 70, fx: dark ? 'shadow' : 'light',
            hit: dark ? hb(0, 0, 0, 0, 9, 6, 9, 35, { fx: 'shadow' }) : hb(0, 0, 0, 0, 6, 4, 6, 25, { fx: 'light' }),
          });
        },
      },
      recovery: {
        name: 'Espiral Gêmea', startup: 4, active: 24, recovery: 10, helpless: true, air: true, lc: true, landLag: 12,
        grav: 0, noDrift: true, sfx: 'wind',
        onFrame(f, g, t) {
          if (t >= 4 && t < 28) {
            f.vy = -13 + (t - 4) * 0.28;
            f.vx = f.inp.mx * 4.8;
            if (t % 3 === 0) g.burst(f.x, f.y - 20, t % 6 ? 'light' : 'shadow', 2);
          }
        },
        hits: [
          hb(0, -40, 96, 110, 2, 4, 2, 85, { fx: 'twin', multi: 5, radial: true, t1: 20 }),
          hb(0, -46, 104, 116, 5, 8, 11, 80, { fx: 'twin', t0: 20, group: 1 }),
        ],
      },
      ult: {
        name: 'Dragões Gêmeos', startup: 16, active: 40, recovery: 22, air: true, grav: 0.1, noDrift: true,
        intang: [1, 34], sfx: 'ult',
        onFrame(f, g, t) {
          if (t === 1) {
            f.vx = 0;
            f.vy = 0;
          }
          if (t === 16) {
            g.shake = 16;
            g.flashScreen('#c9a6ff', 0.4);
          }
          if (t > 16 && t < 56 && t % 3 === 0) g.burst(f.x + U_rand(-200, 200), f.y - U_rand(20, 200), t % 2 ? 'light' : 'shadow', 2, 8);
          if (t === 50) {
            g.shake = 22;
            RR.audio.play('heavyhit');
          }
        },
        hits: [
          hb(0, -90, 520, 260, 2.5, 3, 1, 70, { fx: 'twin', multi: 6, radial: true, t1: 32 }),
          hb(0, -90, 560, 280, 13, 5, 19, 45, { fx: 'twin', t0: 34, group: 1, radial: true }),
        ],
      },
    }),
  };

  // ---------------- NOXARA: assassina (Escorpião), veneno — arte em sprites ----------------
  const POISON = { n: 3, dmg: 1, every: 40 };
  C.noxara = {
    id: 'noxara', name: 'Noxara', title: 'Assassina do Escorpião', arche: 'Assassina', sign: '♏',
    sprite: 'noxara',
    color: '#d24dff', color2: '#ff5fd2', dark: '#2a0f33', fxColor: '#e07bff',
    alts: [{ color: '#ff5fd2', color2: '#d24dff', dark: '#33102a' }],
    w: 54, h: 74, weight: 82, walk: 7.8, air: 6.1, airAccel: 0.78, jump: 17.5, djump: 16.5, jumps: 2,
    grav: 0.9, fall: 13.5, ff: 20,
    stats: { Velocidade: 5, Força: 3, Peso: 2, Alcance: 4 },
    skills: [
      { key: 'A', name: 'Combo Ferrão', desc: 'Três golpes rápidos com as garras e a cauda.' },
      { key: 'B', name: 'Lâmina Venenosa', desc: 'Lâmina de energia magenta que envenena (dano extra aos poucos).' },
      { key: '↑B', name: 'Espiral do Escorpião', desc: 'Gira a cauda e se impulsiona para cima.' },
      { key: 'ULT', name: 'Eclipse Venenoso', desc: 'Invoca um escorpião gigante de energia que ataca à frente.' },
    ],
    ai: { pref: 85, range: 100, specialRange: 520, ultRange: 380 },
    moves: Object.assign(basics({ reach: 76, pow: 0.95, spd: -1, h: 74, w: 54, fx: 'shadow' }), {
      special: {
        name: 'Lâmina Venenosa', startup: 10, active: 1, recovery: 16, cooldown: 38, air: true, sfx: 'dash',
        onFrame(f, g, t) {
          if (t === 10)
            g.spawnProjectile(f, {
              type: 'orb', anim: ['blade1', 'blade2'], scale: 0.78, hitFx: 'impact',
              x: f.x + f.facing * 44, y: f.y - f.h * 0.5, vx: f.facing * 13,
              w: 50, h: 28, life: 62, fx: 'shadow',
              hit: hb(0, 0, 0, 0, 5, 4, 5, 20, { fx: 'shadow', poison: POISON }),
            });
        },
      },
      recovery: {
        name: 'Espiral do Escorpião', startup: 4, active: 22, recovery: 10, helpless: true, air: true, lc: true, landLag: 12,
        grav: 0, noDrift: true, sfx: 'wind',
        onFrame(f, g, t) {
          if (t >= 4 && t < 26) {
            f.vy = -14 + (t - 4) * 0.3;
            f.vx = f.inp.mx * 4.5;
            if (t % 3 === 0) g.burst(f.x, f.y - 20, 'shadow', 2);
          }
        },
        hits: [
          hb(0, -40, 92, 104, 2, 4, 2, 85, { fx: 'shadow', multi: 5, radial: true, t1: 18 }),
          hb(0, -44, 100, 110, 6, 8, 11, 78, { fx: 'shadow', t0: 18, group: 1 }),
        ],
      },
      ult: {
        name: 'Eclipse Venenoso', startup: 18, active: 36, recovery: 22, air: true, grav: 0.1, noDrift: true,
        intang: [1, 30], sfx: 'ult',
        onFrame(f, g, t) {
          if (t === 1) {
            f.vx = 0;
            f.vy = 0;
          }
          if (t === 18) {
            g.shake = 16;
            g.flashScreen('#d24dff', 0.4);
          }
          if (t > 18 && t < 54 && t % 3 === 0) g.burst(f.x + f.facing * U_rand(40, 360), f.y - U_rand(20, 200), 'shadow', 2, 8);
          if (t === 46) {
            g.shake = 22;
            RR.audio.play('heavyhit');
          }
        },
        hits: [
          hb(150, -90, 440, 240, 2.5, 3, 1, 60, { fx: 'shadow', multi: 6, t1: 28 }),
          hb(170, -90, 480, 260, 12, 5, 19, 40, { fx: 'shadow', t0: 28, group: 1, poison: { n: 5, dmg: 1.5, every: 30 } }),
        ],
      },
    }),
  };

  // ---------------- ASTRAEL: arqueiro estelar (Sagitário) — arte em sprites ----------------
  C.astrael = {
    id: 'astrael', name: 'Astrael', title: 'Arqueiro Estelar', arche: 'Arqueiro', sign: '♐',
    sprite: 'astrael',
    color: '#4dc3ff', color2: '#ffd166', dark: '#16245c', fxColor: '#7fe3ff',
    alts: [{ color: '#ffd166', color2: '#4dc3ff', dark: '#3a2a10' }],
    w: 48, h: 78, weight: 85, walk: 7, air: 5.9, airAccel: 0.68, jump: 17.5, djump: 16, jumps: 2,
    grav: 0.85, fall: 13, ff: 19,
    stats: { Velocidade: 4, Força: 3, Peso: 2, Alcance: 5 },
    skills: [
      { key: 'A', name: 'Combo Celeste', desc: 'Três disparos rápidos de curta distância com o arco.' },
      { key: 'B', name: 'Flecha Cometa', desc: 'Flecha de energia azul que atravessa a arena e todos no caminho.' },
      { key: '↑B', name: 'Ascensão Estelar', desc: 'Explosão de energia que o impulsiona para cima.' },
      { key: 'ULT', name: 'Chuva de Constelações', desc: 'Flechas cósmicas caem do céu sobre a área à frente.' },
    ],
    ai: { pref: 220, range: 110, specialRange: 900, ultRange: 500 },
    moves: Object.assign(basics({ reach: 92, pow: 0.9, spd: -1, h: 78, w: 48, fx: 'light' }), {
      special: {
        name: 'Flecha Cometa', startup: 14, active: 1, recovery: 18, cooldown: 55, air: true, sfx: 'dash',
        onFrame(f, g, t) {
          if (t === 14)
            g.spawnProjectile(f, {
              type: 'orb', sprite: 'comet', scale: 0.8, pierce: true,
              x: f.x + f.facing * 60, y: f.y - f.h * 0.5, vx: f.facing * 19,
              w: 80, h: 30, life: 80, fx: 'light',
              hit: hb(0, 0, 0, 0, 8, 6, 9, 25, { fx: 'light' }),
            });
        },
      },
      recovery: {
        name: 'Ascensão Estelar', startup: 5, active: 18, recovery: 10, helpless: true, air: true, lc: true, landLag: 12,
        grav: 0.4, noDrift: true, sfx: 'teleport',
        onFrame(f, g, t) {
          if (t === 5) {
            f.vy = -20;
            f.vx = f.inp.mx * 4;
            g.burst(f.x, f.y, 'light', 14, 9);
            g.ring(f.x, f.y, '#7fe3ff', 70);
          }
          if (t > 5 && t < 23 && t % 3 === 0) g.burst(f.x, f.y, 'light', 2);
        },
        hits: [hb(0, -30, 110, 110, 9, 8, 12, 82, { fx: 'light', t1: 6, radial: true })],
      },
      ult: {
        name: 'Chuva de Constelações', startup: 16, active: 44, recovery: 20, air: true, grav: 0.1, noDrift: true,
        intang: [1, 30], sfx: 'ult',
        onFrame(f, g, t) {
          if (t === 1) {
            f.vx = 0;
            f.vy = 0;
          }
          if (t === 16) g.flashScreen('#9fe8ff', 0.35);
          // flechas caindo do céu em ondas sobre a área à frente
          if (t >= 16 && t < 56 && t % 4 === 0) {
            const k = (t - 16) / 40;
            const last = t === 52;
            g.spawnProjectile(f, {
              type: 'orb', sprite: 'volley', scale: last ? 1.05 : 0.75, pierce: true,
              x: f.x + f.facing * (60 + U_rand(0, 420)), y: f.y - 520 - U_rand(0, 80),
              vx: f.facing * 5, vy: 22, w: last ? 120 : 70, h: 70, life: 40, fx: 'light',
              hit: last ? hb(0, 0, 0, 0, 12, 5, 19, 55, { fx: 'light' }) : hb(0, 0, 0, 0, 3, 3, 1, 70 - k * 20, { fx: 'light' }),
            });
          }
          if (t === 52) g.shake = 18;
        },
      },
    }),
  };

  function U_rand(a, b) {
    return a + Math.random() * (b - a);
  }

  C.list = ['vex', 'noxara', 'astrael', 'kael', 'zyra', 'gorak', 'lumi'];
})(window.RR);
