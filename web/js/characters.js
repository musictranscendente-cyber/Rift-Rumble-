// Personagens: atributos, skills e golpes
// Hitbox: cx (para frente), cy (a partir dos pés, negativo = para cima), w, h,
// dmg (dano %), kb (knockback base), gr (crescimento por 100%), ang (graus; 0 = frente, 90 = cima)
(function (RR) {
  const C = (RR.chars = {});
  const hb = (cx, cy, w, h, dmg, kb, gr, ang, extra) =>
    Object.assign({ cx, cy, w, h, dmg, kb, gr, ang }, extra || {});

  // oponente mais perto (vivo e acertável), ou null
  function nearest(f, g, maxD) {
    let best = null, bd = maxD || 1e9;
    for (const o of g.fighters) {
      if (o === f || !o.alive || o.state === 'respawn' || o.intangible()) continue;
      const d = Math.hypot(o.x - f.x, o.y - f.y);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

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
      { key: 'B', name: 'Passo Gêmeo', desc: 'Some num lampejo e reaparece atrás do oponente, chutando.' },
      { key: '↑B', name: 'Espiral Gêmea', desc: 'Os gêmeos sobem girando e puxam quem estiver perto.' },
      { key: 'ULT', name: 'Dragões Gêmeos', desc: 'Dois dragões, de luz e de sombra, atravessam a arena inteira.' },
    ],
    ai: { pref: 80, range: 90, specialRange: 420, ultRange: 700 },
    moves: Object.assign(basics({ reach: 60, pow: 0.95, spd: -1, h: 80, w: 46, fx: 'twin' }), {
      special: {
        // some num lampejo e reaparece atrás do oponente mais perto, já chutando
        name: 'Passo Gêmeo', startup: 14, active: 4, recovery: 18, cooldown: 70, air: true, grav: 0.2, noDrift: true, sfx: 'teleport',
        onFrame(f, g, t) {
          if (t === 1) {
            f.vx = 0;
            f.vy = Math.min(f.vy, 0);
          }
          if (t === 6) f.hidden = true;
          if (t === 13) {
            const b = nearest(f, g, 460);
            const st = g.stage;
            if (b) {
              const side = U_sign(b.x - f.x);
              f.x = b.x + side * (b.w / 2 + 34);
              f.y = b.y;
              f.facing = -side;
              f.grounded = b.grounded;
            } else f.x += f.facing * 220;
            f.x = Math.max(st.blast.left + 200, Math.min(st.blast.right - 200, f.x));
            f.vy = 0;
            f.hidden = false;
          }
        },
        hits: [hb(36, -44, 96, 74, 8, 7, 10, 40, { fx: 'twin' })],
      },
      recovery: {
        name: 'Espiral Gêmea', startup: 4, active: 24, recovery: 10, helpless: true, air: true, lc: true, landLag: 12,
        grav: 0, noDrift: true, sfx: 'wind',
        onFrame(f, g, t) {
          if (t >= 4 && t < 28) {
            f.vy = -13 + (t - 4) * 0.28;
            f.vx = f.inp.mx * 4.8;
          }
        },
        hits: [
          hb(0, -40, 96, 110, 2, 4, 2, 85, { fx: 'twin', multi: 5, radial: true, t1: 20 }),
          hb(0, -46, 104, 116, 5, 8, 11, 80, { fx: 'twin', t0: 20, group: 1 }),
        ],
      },
      ult: {
        // dois dragões (luz embaixo, sombra no alto) atravessam a arena inteira à frente
        // o vídeo mostra o círculo e os dragões nascendo; quando eles saem do quadro, viram projéteis que cruzam a arena
        name: 'Dragões Gêmeos', startup: 84, active: 4, recovery: 20, air: true, grav: 0.1, noDrift: true,
        intang: [1, 88], sfx: 'ult',
        onFrame(f, g, t) {
          if (t === 1) {
            f.vx = 0;
            f.vy = 0;
          }
          if (t === 84) {
            g.shake = 14;
            g.flashScreen('#c9a6ff', 0.35);
            for (const [dy, col, col2, hit] of [
              [-62, '#4dabff', '#dff4ff', hb(0, 0, 0, 0, 13, 6, 14, 30, { fx: 'light' })],
              [-190, '#ff5fd2', '#ffe0f6', hb(0, 0, 0, 0, 15, 6, 18, 60, { fx: 'shadow' })],
            ])
              g.spawnProjectile(f, {
                type: 'spirit', col, col2, pierce: true,
                x: f.x + f.facing * 300, y: f.y + dy, vx: f.facing * 17,
                w: 150, h: 90, life: 90, fx: hit.fx, hit,
              });
          }
        },
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
      { key: 'B', name: 'Bote do Escorpião', desc: 'Agarrão: prende, crava o ferrão (veneno) e arremessa para trás.' },
      { key: '↑B', name: 'Espiral do Escorpião', desc: 'Gira a cauda e se impulsiona para cima.' },
      { key: 'ULT', name: 'Dança do Eclipse', desc: 'A arena escurece; ela salta entre os oponentes cortando e termina com o ferrão.' },
    ],
    ai: { pref: 85, range: 100, specialRange: 110, ultRange: 900 },
    moves: Object.assign(basics({ reach: 76, pow: 0.95, spd: -1, h: 74, w: 54, fx: 'shadow' }), {
      special: {
        // agarrão: bote para a frente; se pegar, crava o ferrão 3 vezes (veneno) e arremessa para trás
        name: 'Bote do Escorpião', startup: 8, active: 12, recovery: 22, cooldown: 60, air: true, sfx: 'dash',
        onFrame(f, g, t) {
          const m = f.move, v = f.mvar;
          if (v.grab) {
            const b = v.grab;
            f.moveT = m.startup + 1; // segura o golpe enquanto prende
            v.gt++;
            f.vx = 0;
            b.x = f.x + f.facing * (f.w / 2 + b.w / 2 - 6);
            b.y = f.y;
            b.vx = b.vy = 0;
            b.stateT = 0; // continua preso (se a Noxara for interrompida, solta sozinho)
            if (!b.alive) v.grab = null;
            else if (v.gt % 10 === 0 && v.gt <= 30) {
              b.percent = Math.min(999, b.percent + 2);
              b.flash = 6;
              g.addText(b.x, b.y - b.h - 20, '2%', '#e07bff');
              RR.vfx && RR.vfx.hit(g, b.x, b.y - b.h * 0.55, 'shadow', 3, 2, f.facing);
              RR.audio.play('hit');
            } else if (v.gt === 40) {
              v.grab = null;
              b.setState('idle');
              f.facing = -f.facing; // arremesso por cima do ombro
              g.applyHit(f, b, hb(0, 0, 0, 0, 7, 9, 12, 45, { fx: 'shadow', poison: { n: 4, dmg: 1.5, every: 30 } }), f.facing);
              f.moveT = m.startup + m.active;
            }
            return;
          }
          if (t > m.startup && t <= m.startup + m.active && !v.done) {
            f.vx = f.facing * 12;
            const r = { x: f.x + (f.facing > 0 ? 0 : -86), y: f.y - f.h, w: 86, h: f.h };
            for (const b of g.fighters) {
              if (b === f || !b.alive || b.intangible() || !RR.U.overlap(r, b.hurtRect())) continue;
              v.grab = b;
              v.gt = 0;
              v.done = true;
              b.setState('stunned');
              b.stunT = 60;
              b.hitLog && b.hitLog.clear();
              RR.audio.play('hit');
              break;
            }
          }
        },
      },
      recovery: {
        name: 'Espiral do Escorpião', startup: 4, active: 22, recovery: 10, helpless: true, air: true, lc: true, landLag: 12,
        grav: 0, noDrift: true, sfx: 'wind',
        onFrame(f, g, t) {
          if (t >= 4 && t < 26) {
            f.vy = -14 + (t - 4) * 0.3;
            f.vx = f.inp.mx * 4.5;
          }
        },
        hits: [
          hb(0, -40, 92, 104, 2, 4, 2, 85, { fx: 'shadow', multi: 5, radial: true, t1: 18 }),
          hb(0, -44, 100, 110, 6, 8, 11, 78, { fx: 'shadow', t0: 18, group: 1 }),
        ],
      },
      ult: {
        // escurece a arena, some e corta cada oponente várias vezes saltando entre eles; termina com o ferrão
        name: 'Dança do Eclipse', startup: 18, active: 52, recovery: 18, air: true, grav: 0, noDrift: true,
        intang: [1, 72], sfx: 'ult',
        onFrame(f, g, t) {
          const v = f.mvar;
          if (t === 1) {
            f.vx = 0;
            f.vy = 0;
          }
          if (t === 18) {
            g.flashScreen('#12051f', 0.6);
            f.hidden = true;
            v.hx = f.x;
            v.hy = f.y;
          }
          if (t > 18 && t < 70 && (t - 18) % 8 === 0) {
            const foes = g.fighters.filter((o) => o !== f && o.alive && o.state !== 'respawn');
            if (!foes.length) return;
            const b = foes[((t - 18) / 8) % foes.length | 0];
            const last = t >= 66;
            const side = (t / 8) % 2 ? 1 : -1;
            v.hx = b.x + side * 60;
            v.hy = b.y;
            RR.vfx && RR.vfx.ghost(g, f, v.hx, v.hy, -side);
            if (last) {
              f.hidden = false;
              f.x = v.hx;
              f.y = v.hy;
              f.facing = -side;
              g.shake = 20;
              RR.audio.play('heavyhit');
              g.applyHit(f, b, hb(0, 0, 0, 0, 12, 6, 19, 45, { fx: 'shadow', poison: { n: 5, dmg: 1.5, every: 30 } }), -side);
            } else {
              b.hitLog && b.hitLog.clear();
              g.applyHit(f, b, hb(0, 0, 0, 0, 3, 2, 0, 80, { fx: 'shadow' }), -side);
              b.vx *= 0.2;
              b.vy = Math.min(b.vy, -2) * 0.3;
            }
          }
          if (t === 70 && f.hidden) f.hidden = false;
        },
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
      { key: 'B', name: 'Flecha Cometa', desc: 'Segure para carregar: toque = flecha rápida; carga cheia = cometa que atravessa todos.' },
      { key: '↑B', name: 'Ascensão Estelar', desc: 'Explosão de energia que o impulsiona para cima.' },
      { key: 'ULT', name: 'Chuva de Constelações', desc: 'Flechas cósmicas caem do céu sobre a área à frente.' },
    ],
    ai: { pref: 220, range: 110, specialRange: 900, ultRange: 500 },
    moves: Object.assign(basics({ reach: 92, pow: 0.9, spd: -1, h: 78, w: 48, fx: 'light' }), {
      special: {
        // segure B para carregar: toque = flecha rápida; carga cheia = cometa que atravessa todos
        name: 'Flecha Cometa', startup: 10, active: 1, recovery: 16, cooldown: 40, air: true, charge: 60, sfx: 'dash',
        onFrame(f, g, t) {
          const v = f.mvar;
          if (t === 9 && f.inp.specialH && (v.c || 0) < 60) {
            v.c = (v.c || 0) + 1;
            f.moveT = 8; // segura a corda
            if (!f.grounded) f.vy = Math.min(f.vy, 1.5);
            return;
          }
          if (t === 10) {
            const k = Math.min(1, (v.c || 0) / 60);
            const full = k > 0.95;
            g.spawnProjectile(f, {
              type: 'arrow', len: 60 + k * 90, charge: k, pierce: full,
              x: f.x + f.facing * 60, y: f.y - f.h * 0.5, vx: f.facing * (15 + k * 9),
              w: 40 + k * 50, h: 22 + k * 12, life: 60 + k * 30, fx: 'light',
              hit: hb(0, 0, 0, 0, 4 + k * 10, 4 + k * 4, 5 + k * 9, 25, { fx: 'light' }),
            });
            if (full) {
              g.shake = 8;
              f.vx = -f.facing * 4;
            }
          }
        },
      },
      recovery: {
        name: 'Ascensão Estelar', startup: 5, active: 18, recovery: 10, helpless: true, air: true, lc: true, landLag: 12,
        grav: 0.4, noDrift: true, sfx: 'teleport',
        onFrame(f, g, t) {
          if (t === 5) {
            f.vy = -20;
            f.vx = f.inp.mx * 4;
          }
        },
        hits: [hb(0, -30, 110, 110, 9, 8, 12, 82, { fx: 'light', t1: 6, radial: true })],
      },
      ult: {
        // segue o vídeo: flecha para o céu, constelação e a chuva caindo à frente (as flechas que acertam são invisíveis)
        name: 'Chuva de Constelações', startup: 36, active: 44, recovery: 20, air: true, grav: 0.1, noDrift: true,
        intang: [1, 40], sfx: 'ult',
        onFrame(f, g, t) {
          if (t === 1) {
            f.vx = 0;
            f.vy = 0;
          }
          if (t === 20) g.flashScreen('#9fe8ff', 0.35);
          if (t >= 36 && t < 80 && t % 4 === 0) {
            const k = (t - 36) / 44;
            const last = t === 76;
            g.spawnProjectile(f, {
              type: 'arrow', invisible: true, pierce: true,
              x: f.x + f.facing * (90 + U_rand(0, 360)), y: f.y - 520,
              vx: 0, vy: 22, w: last ? 300 : 80, h: 70, life: 40, fx: 'light',
              hit: last ? hb(0, 0, 0, 0, 12, 5, 19, 55, { fx: 'light' }) : hb(0, 0, 0, 0, 3, 3, 1, 70 - k * 20, { fx: 'light' }),
            });
          }
          if (t === 76) g.shake = 18;
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
      { key: 'B', name: 'Rugido Solar', desc: 'Rugido de perto: empurra, deixa tonto e devolve projéteis.' },
      { key: '↑B', name: 'Ascensão do Leão', desc: 'Lança-se para cima envolvido por chamas, com armadura.' },
      { key: 'ULT', name: 'Queda do Sol', desc: 'Salta para fora da tela e cai como um sol em cima do oponente.' },
    ],
    ai: { pref: 90, range: 110, specialRange: 150, ultRange: 900 },
    moves: Object.assign(basics({ reach: 90, pow: 1.1, spd: 1, h: 82, w: 62, fx: 'fire' }), {
      special: {
        // rugido de perto: empurra e deixa tonto, e devolve projéteis que estiverem na frente
        name: 'Rugido Solar', startup: 14, active: 10, recovery: 22, cooldown: 70, air: true, armor: [1, 14], sfx: 'fire',
        onFrame(f, g, t) {
          if (t === 14) g.shake = 8;
          if (t >= 14 && t < 24) {
            const r = { x: f.x + (f.facing > 0 ? 10 : -190), y: f.y - f.h - 30, w: 180, h: f.h + 60 };
            for (const p of g.projectiles) {
              if (p.owner === f || !RR.U.overlap(r, g.projRect(p))) continue;
              p.owner = f;
              p.vx = -p.vx * 1.2;
              p.dir = -p.dir;
              p.hitLog = new Map();
            }
          }
        },
        hits: [hb(95, -50, 170, 120, 5, 10, 4, 25, { fx: 'fire', stun: 55 })],
      },
      recovery: {
        name: 'Ascensão do Leão', startup: 6, active: 20, recovery: 10, helpless: true, air: true, lc: true, landLag: 14,
        grav: 0.45, noDrift: true, armor: [1, 14], sfx: 'fire',
        onFrame(f, g, t) {
          if (t === 6) {
            f.vy = -20;
            f.vx = f.inp.mx * 3;
          }
        },
        hits: [
          hb(0, -40, 100, 110, 4, 5, 3, 85, { fx: 'fire', multi: 6, radial: true, t1: 14 }),
          hb(0, -50, 110, 120, 8, 9, 13, 80, { fx: 'fire', t0: 14, group: 1 }),
        ],
      },
      ult: {
        // salta para fora da tela e cai como um sol em cima do oponente mais perto
        name: 'Queda do Sol', startup: 26, active: 40, recovery: 22, air: true, grav: 0, noDrift: true,
        intang: [1, 30], armor: [1, 70], sfx: 'ult',
        onFrame(f, g, t) {
          const m = f.move, v = f.mvar;
          if (t === 1) {
            f.vx = 0;
            f.vy = -26;
            f.grounded = false;
          }
          if (t > 1 && t < 14) f.vy *= 0.9;
          if (t === 14) f.hidden = true;
          if (t === 26) {
            const st = g.stage;
            const b = nearest(f, g);
            const tx = b ? b.x : f.x + f.facing * 200;
            f.x = Math.max(st.left + 40, Math.min(st.right - 40, tx));
            v.ty = b && b.grounded ? b.y : st.solids[0].y; // cai até a altura do alvo
            f.y = v.ty - 620;
            f.vy = 26;
            f.vx = 0;
            f.hidden = false;
            g.flashScreen('#ffd166', 0.3);
          }
          if (t > 26 && !v.landed && f.y < v.ty - 12) f.dropT = 2; // atravessa as plataformas finas no caminho
          if (t > 26 && !v.landed && f.grounded) {
            v.landed = true;
            g.shake = 28;
            g.flashScreen('#ffd166', 0.5);
            RR.audio.play('heavyhit');
            for (const b of g.fighters) {
              if (b === f || !b.alive || b.intangible() || f.hitLog.has(b)) continue;
              if (Math.abs(b.x - f.x) < 230 && Math.abs(b.y - f.y) < 160) g.applyHit(f, b, hb(0, 0, 0, 0, 15, 7, 18, 55, { fx: 'fire' }), U_sign(b.x - f.x));
            }
            RR.vfx && RR.vfx.sunImpact(g, f);
            f.moveT = m.startup + m.active;
          }
        },
        onLand(f) {
          return !f.mvar.landed && f.moveT > 26;
        },
        hits: [hb(0, -40, 130, 150, 5, 3, 0, 80, { fx: 'fire' })], // a queda só prende; o dano forte é o impacto
      },
    }),
  };

  const VORB = Array.from({ length: 17 }, (_, i) => 'vorb' + String(i).padStart(2, '0'));

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
        // track de vídeo: giro, carga nas duas pinças e explosão na metade do golpe
        name: 'Orbe Abissal', startup: 40, active: 1, recovery: 36, cooldown: 45, air: true, grav: 0.4, sfx: 'ice',
        onFrame(f, g, t) {
          if (t === 12) RR.audio.play('wind');
          if (t === 40) {
            g.spawnProjectile(f, {
              type: 'orb', anim: VORB, animRate: 2, scale: 0.42,
              x: f.x + f.facing * 90, y: f.y - f.h * 0.55, vx: f.facing * 11,
              w: 58, h: 58, life: 70, fx: 'water',
              hit: hb(0, 0, 0, 0, 11, 8, 12, 35, { fx: 'water' }),
            });
            g.shake = 10;
            f.vx = -f.facing * 5; // recuo
          }
        },
      },
      recovery: {
        name: 'Jato Lunar', startup: 6, active: 20, recovery: 10, helpless: true, air: true, lc: true, landLag: 14,
        grav: 0.4, noDrift: true, armor: [1, 12], sfx: 'wind',
        onFrame(f, g, t) {
          if (t === 6) {
            f.vy = -21;
            f.vx = f.inp.mx * 3;
          }
        },
        hits: [
          hb(0, -20, 90, 120, 3, 4, 2, 88, { fx: 'water', multi: 6, t1: 14 }),
          hb(0, -40, 100, 120, 7, 9, 12, 82, { fx: 'water', t0: 14, group: 1 }),
        ],
      },
      ult: {
        // segue o vídeo: tornado e caranguejo gigante (60), pinças descem (t 86 = batida) e ondas, depois volta ao normal
        name: 'Imperatriz do Oceano', startup: 60, active: 50, recovery: 40, air: true, grav: 0.1, noDrift: true,
        intang: [1, 90], sfx: 'ult',
        onFrame(f, g, t) {
          if (t === 1) {
            f.vx = 0;
            f.vy = 0;
          }
          if (t === 20) g.flashScreen('#8fdcff', 0.3);
          if (t === 60) g.shake = 10;
          if (t === 86) {
            g.flashScreen('#8fdcff', 0.45);
            g.shake = 26;
            RR.audio.play('heavyhit');
          }
        },
        hits: [
          hb(0, -80, 480, 220, 3, 3, 1, 65, { fx: 'water', multi: 6, radial: true, t1: 26 }),
          hb(0, -80, 520, 240, 13, 6, 20, 45, { fx: 'water', t0: 26, group: 1, radial: true }),
        ],
      },
    }),
  };

  // ---------------- BRONT: colosso de pedra (Touro), terra — tudo de vídeo ----------------
  C.bront = {
    id: 'bront', name: 'Bront', title: 'Colosso de Pedra', arche: 'Pesado', sign: '♉',
    sprite: 'bront',
    color: '#c27a3a', color2: '#5dff6a', dark: '#4a2a12', fxColor: '#8cff7a',
    alts: [{ color: '#7a8a99', color2: '#7df9ff', dark: '#2e3740' }],
    w: 70, h: 88, weight: 126, walk: 4.4, air: 4.0, airAccel: 0.45, jump: 15.5, djump: 14, jumps: 2,
    grav: 0.98, fall: 15, ff: 21,
    stats: { Velocidade: 2, Força: 5, Peso: 5, Alcance: 3 },
    skills: [
      { key: 'A', name: 'Martelo de Rocha', desc: 'Três socos de pedra; o terceiro lança longe.' },
      { key: 'B', name: 'Ruptura Sísmica', desc: 'Soca o chão e manda uma onda de rochas e cristais pela plataforma.' },
      { key: '↑B', name: 'Investida do Touro', desc: 'Salta para cima e para a frente com os chifres, blindado.' },
      { key: 'ULT', name: 'Colosso da Terra', desc: 'Esmaga o chão e faz pilares de pedra e cristal emergirem.' },
    ],
    ai: { pref: 85, range: 105, specialRange: 480, ultRange: 320 },
    moves: Object.assign(basics({ reach: 88, pow: 1.3, spd: 3, h: 88, w: 70, fx: 'rock' }), {
      special: {
        name: 'Ruptura Sísmica', startup: 22, active: 4, recovery: 22, cooldown: 60, air: true, armor: [1, 22], sfx: 'rock',
        onFrame(f, g, t) {
          if (!f.grounded && t === 21) {
            f.moveT = 20; // no ar, segura até tocar o chão
            f.vy = 18;
          }
          if (t === 22) {
            g.shake = 12;
            g.spawnProjectile(f, {
              type: 'wave', x: f.x + f.facing * 70, y: f.y, vx: f.facing * 10, w: 48, h: 60, life: 46, fx: 'rock',
              ground: true, hit: hb(0, 0, 0, 0, 12, 8, 13, 70, { fx: 'rock' }),
            });
          }
        },
        hits: [hb(60, -24, 120, 50, 9, 7, 10, 72, { fx: 'rock' })],
      },
      recovery: {
        name: 'Investida do Touro', startup: 5, active: 20, recovery: 12, helpless: true, air: true, lc: true, landLag: 14,
        grav: 0.5, noDrift: true, armor: [1, 16], sfx: 'rock',
        onFrame(f, g, t) {
          if (t === 5) {
            f.vy = -19;
            f.vx = f.facing * 5 + f.inp.mx * 2;
          }
        },
        hits: [hb(30, -60, 100, 100, 10, 8, 13, 70, { fx: 'rock', t1: 12 })],
      },
      ult: {
        name: 'Colosso da Terra', startup: 40, active: 30, recovery: 12, air: true, grav: 0.3, noDrift: true,
        intang: [1, 40], armor: [1, 82], sfx: 'ult',
        onFrame(f, g, t) {
          if (t === 1) {
            f.vx = 0;
            f.vy = 0;
          }
          if (t === 58) {
            g.shake = 30;
            g.flashScreen('#8cff7a', 0.45);
            RR.audio.play('heavyhit');
          }
        },
        hits: [hb(0, -100, 620, 260, 24, 6, 20, 72, { fx: 'rock', t0: 18, t1: 24, radial: true })],
      },
    }),
  };

  function U_sign(v) {
    return v < 0 ? -1 : 1;
  }

  function U_rand(a, b) {
    return a + Math.random() * (b - a);
  }

  C.list = ['bront', 'lunara', 'solkar', 'astrael', 'noxara', 'vex'];
})(window.RR);
