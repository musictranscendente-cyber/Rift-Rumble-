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

  // ---------------- SOLKAR: rei leão (Leão), fogo solar — arte em sprites ----------------
  C.solkar = {
    id: 'solkar', name: 'Solkar', title: 'Rei Leão Solar', arche: 'Rei Guerreiro', sign: '♌',
    sprite: 'solkar',
    color: '#ffb000', color2: '#ff5a1a', dark: '#5a2a08', fxColor: '#ffd166',
    alts: [{ color: '#ff5a1a', color2: '#ffb000', dark: '#3a1404' }],
    w: 62, h: 82, weight: 106, walk: 5.8, air: 4.9, airAccel: 0.55, jump: 16.5, djump: 15, jumps: 2,
    grav: 0.92, fall: 14.5, ff: 20.5,
    stats: { Velocidade: 3, Força: 5, Peso: 4, Alcance: 4 },
    skills: [
      { key: 'A', name: 'Garras Solares', desc: 'Combo de três golpes com as garras flamejantes.' },
      { key: 'B', name: 'Rugido Solar', desc: 'Onda concentrada de energia; segure perto para mais força.' },
      { key: '↑B', name: 'Ascensão do Leão', desc: 'Lança-se para cima envolvido por chamas, com armadura.' },
      { key: 'ULT', name: 'Coroa da Estrela', desc: 'Um leão colossal de energia solar avança sobre os adversários.' },
    ],
    ai: { pref: 90, range: 110, specialRange: 600, ultRange: 420 },
    moves: Object.assign(basics({ reach: 90, pow: 1.1, spd: 1, h: 82, w: 62, fx: 'fire' }), {
      special: {
        name: 'Rugido Solar', startup: 16, active: 1, recovery: 20, cooldown: 50, air: true, armor: [1, 16], sfx: 'fire',
        onFrame(f, g, t) {
          if (t === 16) {
            g.shake = 6;
            g.spawnProjectile(f, {
              type: 'orb', anim: ['roar', 'roarBig'], scale: 0.62, hitFx: null,
              x: f.x + f.facing * 60, y: f.y - f.h * 0.5, vx: f.facing * 12,
              w: 64, h: 44, life: 60, fx: 'fire',
              hit: hb(0, 0, 0, 0, 11, 7, 11, 35, { fx: 'fire' }),
            });
          }
        },
      },
      recovery: {
        name: 'Ascensão do Leão', startup: 6, active: 20, recovery: 10, helpless: true, air: true, lc: true, landLag: 14,
        grav: 0.45, noDrift: true, armor: [1, 14], sfx: 'fire',
        onFrame(f, g, t) {
          if (t === 6) {
            f.vy = -20;
            f.vx = f.inp.mx * 3;
            g.burst(f.x, f.y, 'fire', 14, 9);
          }
          if (t > 6 && t < 26 && t % 3 === 0) g.burst(f.x, f.y - 10, 'fire', 2);
        },
        hits: [
          hb(0, -40, 100, 110, 4, 5, 3, 85, { fx: 'fire', multi: 6, radial: true, t1: 14 }),
          hb(0, -50, 110, 120, 8, 9, 13, 80, { fx: 'fire', t0: 14, group: 1 }),
        ],
      },
      ult: {
        name: 'Coroa da Estrela', startup: 18, active: 34, recovery: 24, air: true, grav: 0.1, noDrift: true,
        intang: [1, 30], sfx: 'ult',
        onFrame(f, g, t) {
          if (t === 1) {
            f.vx = 0;
            f.vy = 0;
          }
          if (t === 18) {
            g.flashScreen('#ffd166', 0.45);
            g.shake = 14;
          }
          if (t > 18 && t < 52 && t % 3 === 0) g.burst(f.x + f.facing * U_rand(40, 380), f.y - U_rand(10, 180), 'fire', 2, 9);
          if (t === 44) {
            g.shake = 26;
            RR.audio.play('heavyhit');
          }
        },
        hits: [
          hb(170, -90, 440, 220, 3, 3, 1, 50, { fx: 'fire', multi: 6, t1: 26 }),
          hb(200, -90, 500, 240, 14, 6, 21, 38, { fx: 'fire', t0: 26, group: 1 }),
        ],
      },
    }),
  };

  // ---------------- LUNARA: guardiã das marés (Câncer), água — sprites (parte tirada de vídeo) ----------------
  C.lunara = {
    id: 'lunara', name: 'Lunara', title: 'Guardiã das Marés', arche: 'Tanque', sign: '♋',
    sprite: 'lunara',
    color: '#3db4ff', color2: '#ffb347', dark: '#0c2f5c', fxColor: '#8fdcff',
    alts: [{ color: '#7f8cff', color2: '#ffd166', dark: '#1a1f5c' }],
    w: 64, h: 70, weight: 118, walk: 4.6, air: 4.2, airAccel: 0.5, jump: 15.5, djump: 14.5, jumps: 2,
    grav: 0.95, fall: 14.5, ff: 20.5,
    stats: { Velocidade: 2, Força: 4, Peso: 5, Alcance: 3 },
    skills: [
      { key: 'A', name: 'Garras da Maré', desc: 'Combo de três golpes rápidos com as pinças.' },
      { key: 'B', name: 'Orbe Abissal', desc: 'Dispara uma esfera de água pressurizada.' },
      { key: '↑B', name: 'Jato Lunar', desc: 'Uma coluna de água a lança para cima.' },
      { key: 'ULT', name: 'Imperatriz do Oceano', desc: 'Vira uma criatura aquática gigante que golpeia a arena com ondas.' },
    ],
    ai: { pref: 85, range: 105, specialRange: 520, ultRange: 320 },
    moves: Object.assign(basics({ reach: 84, pow: 1.0, spd: 1, h: 70, w: 64, fx: 'water' }), {
      special: {
        name: 'Orbe Abissal', startup: 14, active: 1, recovery: 18, cooldown: 45, air: true, sfx: 'ice',
        onFrame(f, g, t) {
          if (t === 14)
            g.spawnProjectile(f, {
              type: 'orb', anim: ['orbA', 'orbB'], scale: 0.62,
              x: f.x + f.facing * 56, y: f.y - f.h * 0.5, vx: f.facing * 10,
              w: 46, h: 46, life: 70, fx: 'water',
              hit: hb(0, 0, 0, 0, 10, 7, 11, 35, { fx: 'water' }),
            });
        },
      },
      recovery: {
        name: 'Jato Lunar', startup: 6, active: 20, recovery: 10, helpless: true, air: true, lc: true, landLag: 14,
        grav: 0.4, noDrift: true, armor: [1, 12], sfx: 'wind',
        onFrame(f, g, t) {
          if (t === 6) {
            f.vy = -21;
            f.vx = f.inp.mx * 3;
            g.burst(f.x, f.y, 'water', 16, 9);
          }
          if (t > 6 && t < 26 && t % 2 === 0) g.burst(f.x, f.y + 10, 'water', 2);
        },
        hits: [
          hb(0, -20, 90, 120, 3, 4, 2, 88, { fx: 'water', multi: 6, t1: 14 }),
          hb(0, -40, 100, 120, 7, 9, 12, 82, { fx: 'water', t0: 14, group: 1 }),
        ],
      },
      ult: {
        name: 'Imperatriz do Oceano', startup: 18, active: 36, recovery: 24, air: true, grav: 0.1, noDrift: true,
        intang: [1, 34], sfx: 'ult',
        onFrame(f, g, t) {
          if (t === 1) {
            f.vx = 0;
            f.vy = 0;
          }
          if (t === 18) {
            g.flashScreen('#8fdcff', 0.45);
            g.shake = 16;
          }
          if (t > 18 && t < 54 && t % 3 === 0) g.burst(f.x + U_rand(-280, 280), f.y - U_rand(0, 160), 'water', 2, 8);
          if (t === 46) {
            g.shake = 26;
            RR.audio.play('heavyhit');
          }
        },
        hits: [
          hb(0, -80, 560, 220, 3, 3, 1, 65, { fx: 'water', multi: 6, radial: true, t1: 26 }),
          hb(0, -80, 600, 240, 13, 6, 20, 45, { fx: 'water', t0: 26, group: 1, radial: true }),
        ],
      },
    }),
  };

  function U_rand(a, b) {
    return a + Math.random() * (b - a);
  }

  C.list = ['lunara', 'solkar', 'astrael', 'noxara', 'vex'];
})(window.RR);
