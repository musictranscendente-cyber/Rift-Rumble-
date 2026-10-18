// Personagens desenhados com sprites (arte importada) e carregamento de imagens
(function (RR) {
  const S = (RR.sprites = {});
  const cache = {};

  S.image = function (src) {
    if (!cache[src]) {
      const im = new Image();
      im.src = src;
      cache[src] = im;
    }
    return cache[src];
  };
  const ready = (im) => im && im.complete && im.naturalWidth > 0;
  S.ready = ready;

  // golpe -> quadro de [preparação, golpe ativo, recuperação]
  // cada item: 'nome', ['nome', rotação] ou { seq: [...] } (sequência ao longo do golpe ativo)
  function moveFrame(set, f) {
    const m = f.move, t = f.moveT;
    const i = t < m.startup ? 0 : t < m.startup + m.active ? 1 : 2;
    const list = (set.moveFrames && set.moveFrames(f)) || set.moves[f.moveId];
    // track: sequência contínua ao longo do golpe inteiro (quadros tirados de vídeo)
    if (list && list.track) {
      const total = m.startup + m.active + m.recovery;
      return [list.track[Math.min(list.track.length - 1, Math.floor((t / total) * list.track.length))], 0];
    }
    let e = list ? list[i] : set.idle;
    if (e && e.seq) {
      const k = Math.min(0.999, Math.max(0, (t - m.startup) / m.active));
      e = e.seq[Math.floor(k * e.seq.length)];
    }
    return Array.isArray(e) ? e : [e, 0];
  }

  const seqNames = (prefix, n) => Array.from({ length: n }, (_, i) => prefix + String(i).padStart(2, '0'));
  const VRUN = seqNames('vrun', 12), VIDLE = seqNames('vidle', 16), VJAB = seqNames('vjab', 17), VWIN = seqNames('vwin', 21);

  // Configuração de cada personagem com sprites
  // scale: unidades do mundo por pixel (número, ou por quadro/prefixo quando a folha mistura tamanhos)
  const SETS = {
    // Vex: folha de personagem com linhas em escalas diferentes; o gêmeo escuro acompanha flutuando
    vex: {
      idle: 'idle',
      frames: ['idle', 'idle_dark', 'front', 'c1a', 'c1b', 'c1c', 'c1d', 'c2a', 'c2b', 'c3a', 'c3b', 'castA', 'castB',
        'orbA', 'orbB', 'rec1', 'rec2', 'rec3', 'ult1', 'ult2', 'ult3', 'win'],
      scale: { idle: 0.53, idle_dark: 0.5, front: 0.53, c: 0.72, cast: 0.74, orb: 0.74, rec: 0.66, ult: 0.86, win: 0.42 },
      twin: { L: 'idle', D: 'idle_dark', frames: { c2a: 'LD', c2b: 'LD', c3b: 'LD', rec2: 'LD', rec3: 'D', castB: 'D', ult1: 'LD', ult2: 'LD', ult3: 'LD', win: 'LD' } },
      moves: {
        jab1: ['c1a', 'c1b', 'c1b'],
        jab2: ['c1a', 'c2a', 'c2b'],
        jab3: ['c3a', 'c3b', 'c3b'],
        upA: ['c1c', ['c1d', -1.1], ['c1d', -1.1]],
        downG: ['c1a', ['c1b', 0.35], ['c1b', 0.35]],
        nair: ['c1c', 'c1d', 'c1d'],
        dair: ['c1c', ['c1d', 1.3], ['c1d', 1.3]],
        recovery: ['rec1', 'rec2', 'rec3'],
        ult: ['ult1', 'ult2', 'ult3'],
      },
      moveFrames: (f) => (f.moveId === 'special' ? (f.twinDark ? ['castB', 'castB', 'castB'] : ['castA', 'castA', 'castA']) : null),
      pose(f) {
        switch (f.state) {
          case 'run': return 'c1a';
          case 'air': return f.vy < 0 ? 'c1c' : 'c1a';
          case 'helpless': case 'roll': case 'airdodge': return 'c1c';
          case 'hitstun': case 'stunned': case 'ledge': return 'front';
        }
        return 'idle';
      },
    },

    // Noxara: folha em grade, mesma escala em todas as poses
    noxara: {
      idle: 'idle1',
      portrait: 'face',
      shieldFrame: true,
      frames: ['idle1', 'idle2', 'run1', 'run2', 'run3', 'run4', 'jump', 'fall', 'land', 'crouch', 'shield', 'roll', 'hurt',
        'launched', 'ledge', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'b1', 'b2', 'b3', 'b4', 'b5', 'blade1', 'blade2', 'impact',
        's1', 's2', 's3', 'r1', 'r2', 'r3', 'slam', 'u1', 'u2', 'u3', 'win', 'face'],
      scale: 0.66,
      moves: {
        jab1: ['a1', 'a1', 'a2'],
        jab2: ['a3', 'a3', 'a4'],
        jab3: ['a5', 'a6', 'a6'],
        upA: ['b1', 'b1', 'b1'],
        downG: ['b2', 'b3', 'b3'],
        nair: ['b4', 'b4', 'b5'],
        dair: ['b5', ['b4', 0.9], ['b4', 0.9]],
        special: ['s1', 's2', 's3'],
        recovery: ['r1', { seq: ['r1', 'r2', 'r3'] }, 'r3'],
        ult: ['u1', { seq: ['u2', 'u3'] }, 'u3'],
      },
      pose(f, time) {
        switch (f.state) {
          case 'run': return ['run1', 'run2', 'run3', 'run4'][Math.floor(f.anim.run * 1.3) % 4];
          case 'air': return f.vy < 0 ? 'jump' : 'fall';
          case 'helpless': return 'fall';
          case 'landing': return f.lagT > 6 ? 'slam' : 'land';
          case 'shield': return 'shield';
          case 'spotdodge': return 'crouch';
          case 'roll': case 'airdodge': return 'roll';
          case 'hitstun': return f.lastKb > 22 ? 'launched' : 'hurt';
          case 'stunned': return 'hurt';
          case 'ledge': return 'ledge';
        }
        return Math.floor((time + f.slot * 17) / 32) % 2 ? 'idle2' : 'idle1';
      },
    },

    // Astrael: folha em grade, mesma escala em todas as poses
    astrael: {
      idle: 'idle1',
      portrait: 'face',
      shieldFrame: true,
      frames: ['idle1', 'idle2', 'run1', 'run2', 'run3', 'run4', 'jump', 'fall', 'land', 'crouch', 'shield', 'roll', 'hurt',
        'launched', 'spin', 'ledge', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'b1', 'b2', 'b3', 'b4', 'b5', 'comet',
        's1', 's2', 'r1', 'r2', 'r3', 'r4', 'r5', 'volley', 'u1', 'u2', 'u3', 'win', 'face'],
      scale: 0.64,
      moves: {
        jab1: ['a1', 'a2', 'a2'],
        jab2: ['a3', 'a4', 'a4'],
        jab3: ['a5', 'a7', 'a7'],
        upA: ['b1', 'b1', 'b1'],
        downG: ['b3', 'b3', 'b3'],
        nair: ['b2', 'b4', 'b4'],
        dair: ['b5', ['b5', 1.1], ['b5', 1.1]],
        special: ['a1', 'a6', 'a6'],
        recovery: ['r1', { seq: ['r2', 'r3', 'r4'] }, 'r5'],
        ult: ['u1', { seq: ['u2', 'u3'] }, 'u3'],
      },
      pose(f, time) {
        switch (f.state) {
          case 'run': return ['run1', 'run2', 'run3', 'run4'][Math.floor(f.anim.run * 1.3) % 4];
          case 'air': return f.vy < 0 ? 'jump' : 'fall';
          case 'helpless': return 'fall';
          case 'landing': return f.lagT > 6 ? 'crouch' : 'land';
          case 'shield': return 'shield';
          case 'spotdodge': return 'crouch';
          case 'roll': case 'airdodge': return 'roll';
          case 'hitstun': return f.lastKb > 22 ? 'launched' : 'hurt';
          case 'stunned': return 'hurt';
          case 'ledge': return 'ledge';
        }
        return Math.floor((time + f.slot * 17) / 32) % 2 ? 'idle2' : 'idle1';
      },
    },

    // Solkar: mesma grade do Astrael
    solkar: {
      idle: 'idle1',
      portrait: 'face',
      shieldFrame: true,
      frames: ['idle1', 'idle2', 'run1', 'run2', 'run3', 'run4', 'jump', 'land', 'crouch', 'shield', 'roll', 'hurt',
        'launched', 'spin', 'ledge', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'b1', 'b2', 'b3', 'b4', 'b5', 'roar', 'roarBig',
        's1', 's2', 'r1', 'r2', 'r3', 'r4', 'r5', 'u1', 'u2', 'u3', 'win', 'face'],
      scale: 0.66,
      moves: {
        jab1: ['a1', 'a2', 'a2'],
        jab2: ['a3', 'a4', 'a4'],
        jab3: ['a5', 'a6', 'a6'],
        upA: ['b1', 'b1', 'b1'],
        downG: ['b3', 'b3', 'b3'],
        nair: ['b2', 'b4', 'b4'],
        dair: ['b5', ['b5', 1.1], ['b5', 1.1]],
        special: ['s1', 's2', 's2'],
        recovery: ['r1', { seq: ['r2', 'r3', 'r4'] }, 'r5'],
        ult: ['u1', { seq: ['u2', 'u3'] }, 'u3'],
      },
      pose(f, time) {
        switch (f.state) {
          case 'run': return ['run1', 'run2', 'run3', 'run4'][Math.floor(f.anim.run * 1.3) % 4];
          case 'air': case 'helpless': return 'jump';
          case 'landing': return f.lagT > 6 ? 'crouch' : 'land';
          case 'shield': return 'shield';
          case 'spotdodge': return 'crouch';
          case 'roll': case 'airdodge': return 'roll';
          case 'hitstun': return f.lastKb > 22 ? 'spin' : 'hurt';
          case 'stunned': return 'hurt';
          case 'ledge': return 'ledge';
        }
        return Math.floor((time + f.slot * 17) / 32) % 2 ? 'idle2' : 'idle1';
      },
    },

    // Lunara: corrida, parado, golpe 1 e vitória tirados de vídeo (quadros densos); resto da folha
    lunara: {
      ext: 'webp',
      idle: 'vidle00',
      portrait: 'face',
      shieldFrame: true,
      alias: { win: 'vwin12' },
      frames: ['stance', 'swipe', 'spin', 'up', 'wave', 'claw', 'cast', 'orbA', 'orbB', 'splash', 'jump', 'rise1', 'rise2',
        'low', 'fall', 'dive', 'charge', 'u1', 'u2', 'u3', 'hurt', 'dizzy', 'ko', 'bubble', 'dash', 'face'].concat(VRUN, VIDLE, VJAB, VWIN),
      // cada fonte foi desenhada num tamanho: vídeo (v...), vídeo da vitória (com zoom) e folha
      scale: { vwin: 0.5, v: 0.6, default: 0.66 },
      moves: {
        jab1: { track: VJAB },
        jab2: ['stance', 'swipe', 'swipe'],
        jab3: ['claw', 'spin', 'spin'],
        upA: ['stance', 'up', 'up'],
        downG: ['low', 'low', 'low'],
        nair: ['spin', 'wave', 'wave'],
        dair: ['fall', 'dive', 'dive'],
        special: ['charge', 'cast', 'cast'],
        recovery: ['jump', { seq: ['rise1', 'rise2'] }, 'rise2'],
        ult: ['u1', { seq: ['u2'] }, 'u3'],
      },
      winFrame: (time) => VWIN[Math.floor(time / 3) % VWIN.length],
      pose(f, time) {
        switch (f.state) {
          case 'run': return VRUN[Math.floor(f.anim.run * 2.6) % VRUN.length];
          case 'air': return f.vy < 0 ? 'jump' : 'fall';
          case 'helpless': return 'fall';
          case 'landing': return 'low';
          case 'shield': return 'bubble';
          case 'spotdodge': return 'low';
          case 'roll': case 'airdodge': return 'dash';
          case 'hitstun': return f.lastKb > 22 ? 'ko' : 'hurt';
          case 'stunned': return 'dizzy';
          case 'ledge': return 'stance';
        }
        return VIDLE[Math.floor((time + f.slot * 17) / 9) % VIDLE.length];
      },
    },
  };
  S.sets = SETS;

  const path = (id, name) => `img/${id}/${name}.${SETS[id].ext || 'png'}`;
  for (const [id, set] of Object.entries(SETS)) for (const fr of set.frames) S.image(path(id, fr));

  function scaleOf(set, name) {
    if (typeof set.scale === 'number') return set.scale;
    if (set.scale[name] != null) return set.scale[name];
    // prefixo mais longo que combina (ex.: 'vwin' antes de 'v')
    let best = null;
    for (const k of Object.keys(set.scale)) if (name.startsWith(k) && (!best || k.length > best.length)) best = k;
    if (best) return set.scale[best];
    return set.scale.default != null ? set.scale.default : set.scale.idle;
  }

  // desenha um quadro com os pés (ponto de apoio) em (x, y)
  function drawFrame(ctx, id, name, x, y, rot, mul, h) {
    if (SETS[id].alias && SETS[id].alias[name]) name = SETS[id].alias[name];
    const im = cache[path(id, name)];
    const m = RR.spriteData[id] && RR.spriteData[id][name];
    if (!ready(im) || !m) return;
    const s = scaleOf(SETS[id], name) * (mul || 1);
    ctx.save();
    ctx.translate(x, y);
    if (rot) {
      ctx.translate(0, -h * 0.5);
      ctx.rotate(rot);
      ctx.translate(0, h * 0.5);
    }
    ctx.drawImage(im, -m.ax * s, -m.ay * s, m.w * s, m.h * s);
    ctx.restore();
  }
  S.drawFrame = drawFrame;

  S.hasShieldFrame = (d) => !!(d.sprite && SETS[d.sprite].shieldFrame);

  // ---------------- Camada de movimento ----------------
  // As folhas têm poucas poses; isto dá o movimento "entre" elas: transição suave entre quadros,
  // respiração, inclinação na corrida e no ar, esticar/achatar, virar de lado, avanço no golpe e rastro.
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const ease = (k) => k * k * (3 - 2 * k);
  const approach = (v, target, rate, dt) => v + (target - v) * (1 - Math.pow(1 - rate, dt));

  function motion(f, p, set) {
    const mo = f.mo || (f.mo = { cur: p.frame, prev: null, blend: 1, speed: 0.2, turn: 1, facing: f.facing, lean: 0, sx: 1, sy: 1, bob: 0, punch: 0, t: now(), trail: [], trailT: 0, moveT: -1 });
    const t = now();
    const dt = Math.min(3, Math.max(0, ((t - mo.t) / 1000) * 60)); // em quadros de 60 Hz
    mo.t = t;
    const st = f.state, d = f.def;

    // transição entre poses: a pose anterior some aos poucos por cima da nova
    if (p.frame !== mo.cur && /^v[a-z]+\d\d$/.test(p.frame) && p.frame.slice(0, -2) === String(mo.cur).slice(0, -2)) {
      mo.cur = p.frame;
      mo.blend = 1;
    } else if (p.frame !== mo.cur) {
      const idleSwap = /^idle/.test(p.frame) && /^idle/.test(mo.cur);
      const run = /^run/.test(p.frame) && /^run/.test(mo.cur);
      mo.prev = mo.cur;
      mo.cur = p.frame;
      mo.blend = 0;
      mo.speed = idleSwap ? 0.05 : run ? 0.3 : st === 'attack' ? 0.32 : 0.2;
    }
    mo.blend = Math.min(1, mo.blend + mo.speed * dt);
    p.prevFrame = mo.blend < 1 ? mo.prev : null;
    p.prevAlpha = 1 - ease(mo.blend);

    // virar de lado: o corpo afina e volta, em vez de espelhar de uma vez
    if (f.facing !== mo.facing) {
      mo.facing = f.facing;
      mo.turn = 0;
    }
    mo.turn = Math.min(1, mo.turn + 0.22 * dt);

    // alvos de inclinação e escala conforme o estado
    let lean = 0, sx = 1, sy = 1, bob = 0;
    const tt = t / 1000;
    if ((st === 'idle' || st === 'shield') && f.grounded) {
      const b = Math.sin(tt * 3.2 + f.slot);
      sy = 1 + b * 0.022;
      sx = 1 - b * 0.012;
    } else if (st === 'run') {
      const k = Math.min(1, Math.abs(f.vx) / d.walk);
      lean = 0.09 * k;
      bob = -Math.abs(Math.sin(f.anim.run * Math.PI * 1.3)) * 4 * k;
      sy = 1 + Math.abs(Math.sin(f.anim.run * Math.PI * 1.3)) * 0.03 * k;
    } else if (st === 'air' || st === 'helpless') {
      lean = Math.max(-0.14, Math.min(0.18, f.vy * 0.012));
      const stretch = Math.min(0.12, Math.max(0, -f.vy * 0.006));
      sy = 1 + stretch;
      sx = 1 - stretch * 0.6;
    } else if (st === 'hitstun') {
      lean = -0.22;
    } else if (st === 'attack') {
      const m = f.move, k = (f.moveT - m.startup) / Math.max(1, m.active);
      if (f.moveT !== mo.moveT && f.moveT === m.startup) mo.punch = 1;
      mo.moveT = f.moveT;
      lean = f.moveT < m.startup ? -0.06 : k >= 0 && k <= 1 ? 0.07 : 0;
      if (k >= 0 && k <= 1 && f.grounded) p.offX = Math.sin(k * Math.PI) * 9;
    } else if (st === 'landing') {
      sy = 0.94;
      sx = 1.04;
    }
    mo.lean = approach(mo.lean, lean, 0.25, dt);
    mo.sx = approach(mo.sx, sx, 0.3, dt);
    mo.sy = approach(mo.sy, sy, 0.3, dt);
    mo.bob = approach(mo.bob, bob, 0.5, dt);
    mo.punch = Math.max(0, mo.punch - 0.12 * dt);

    const punch = 1 + mo.punch * 0.06;
    p.sx *= mo.sx * punch * (0.4 + 0.6 * ease(mo.turn));
    p.sy *= mo.sy * punch;
    p.mlean = mo.lean;
    p.bob2 = mo.bob;
    if (st === 'hitstun' && f.flash > 0) p.offX = (p.offX || 0) + (Math.random() - 0.5) * 6;

    // rastro (imagens fantasma) quando está muito rápido
    const fast = Math.hypot(f.vx, f.vy) > 11 || (st === 'attack' && (f.moveId === 'recovery' || f.moveId === 'ult'));
    mo.trailT += dt;
    if (fast && mo.trailT >= 2 && !f.hidden) {
      mo.trailT = 0;
      mo.trail.push({ x: f.x, y: f.y, frame: p.frame, rot: p.frot, facing: f.facing, life: 1 });
      if (mo.trail.length > 5) mo.trail.shift();
    }
    for (const g of mo.trail) g.life -= 0.09 * dt;
    mo.trail = mo.trail.filter((g) => g.life > 0);
  }

  // imagens fantasma desenhadas atrás do lutador (coordenadas do mundo)
  S.drawTrail = function (ctx, f) {
    if (!f.mo || !f.mo.trail.length) return;
    const id = f.def.sprite;
    ctx.save();
    for (const g of f.mo.trail) {
      ctx.globalAlpha = g.life * 0.28;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.scale(g.facing, 1);
      drawFrame(ctx, id, g.frame, 0, 0, g.rot || 0, 1, f.def.h);
      ctx.restore();
    }
    ctx.restore();
  };

  // escolhe o quadro conforme o estado do lutador (chamado por computePose)
  S.pose = function (f, p, time) {
    const set = SETS[f.def.sprite];
    let fr, rot = 0;
    if (f.isWinner && RR.game && RR.game.phase === 'ending' && RR.game.endT < 170 && f.grounded) fr = set.winFrame ? set.winFrame(time) : 'win';
    else if (f.state === 'attack') [fr, rot] = moveFrame(set, f);
    else fr = set.pose(f, time) || set.idle;
    p.frame = fr;
    p.frot = rot;
    motion(f, p, set);
    if (!set.twin) return;
    // gêmeo que acompanha flutuando atrás, com atraso
    const tw = f.twin || (f.twin = { x: f.x, y: f.y });
    const tx = f.x - f.facing * 38, ty = f.y - 20 + Math.sin(time * 0.07 + f.slot) * 6;
    tw.x += (tx - tw.x) * 0.15;
    tw.y += (ty - tw.y) * 0.15;
    if (Math.abs(tw.x - f.x) > 300 || Math.abs(tw.y - f.y) > 300) {
      tw.x = tx;
      tw.y = ty;
    }
    p.twinX = (tw.x - f.x) * f.facing;
    p.twinY = tw.y - f.y;
  };

  // desenha o personagem com os pés em (0,0), olhando para +x
  S.draw = function (ctx, d, p, time, tint) {
    const id = d.sprite, set = SETS[id];
    const fr = p.frame || set.idle;
    if (set.twin) {
      const tw = set.twin.frames[fr] || 'L';
      if (tw !== 'LD') {
        const tx = p.twinX != null ? p.twinX : -36;
        const ty = p.twinY != null ? p.twinY : -14;
        drawFrame(ctx, id, tw === 'L' ? set.twin.D : set.twin.L, tx, ty + Math.sin(time * 0.09) * 2, 0, 0.9, d.h);
      }
    }
    ctx.save();
    // inclinação a partir dos pés, balanço da corrida e avanço do golpe
    ctx.translate(p.offX || 0, p.bob2 || 0);
    if (p.mlean) ctx.rotate(p.mlean);
    if (tint) ctx.filter = tint === '#ffffff' ? 'brightness(2.6) saturate(0.2)' : 'saturate(0.4) brightness(1.3)';
    drawFrame(ctx, id, fr, 0, 0, p.frot || 0, 1, d.h);
    if (tint) ctx.filter = 'none';
    // pose anterior sumindo por cima: transição suave entre quadros
    if (p.prevFrame && p.prevAlpha > 0.02) {
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * p.prevAlpha;
      drawFrame(ctx, id, p.prevFrame, 0, 0, 0, 1, d.h);
      ctx.globalAlpha = a;
    }
    ctx.restore();
  };

  // rosto no placar; devolve false se o personagem não tiver retrato próprio
  S.drawPortrait = function (ctx, d, cx, cy, r) {
    const set = d.sprite && SETS[d.sprite];
    if (!set || !set.portrait) return false;
    const im = cache[path(d.sprite, set.portrait)];
    if (!ready(im)) return true;
    const s = (r * 2.3) / Math.max(im.naturalWidth, im.naturalHeight);
    ctx.drawImage(im, cx - im.naturalWidth * s * 0.5, cy - im.naturalHeight * s * 0.42, im.naturalWidth * s, im.naturalHeight * s);
    return true;
  };

  // projétil com sprite (orbes do Vex, lâminas da Noxara)
  S.drawOrb = function (ctx, p, time) {
    const dir = p.vx < 0 ? -1 : 1;
    const name = p.anim ? p.anim[Math.floor(p.t / 4) % p.anim.length] : p.sprite;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(dir, 1);
    if (p.vy) ctx.rotate(Math.atan2(p.vy, Math.abs(p.vx)));
    drawFrame(ctx, p.owner.def.sprite, name, 0, 0, 0, p.scale * (1 + Math.sin(time * 0.5) * 0.04), 0);
    ctx.restore();
  };

  // efeito com sprite (ex.: explosão de impacto)
  S.drawFx = function (ctx, fx) {
    const k = fx.life / fx.max;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 1.8);
    drawFrame(ctx, fx.id, fx.name, fx.x, fx.y, 0, fx.scale * (1.25 - k * 0.4), 0);
    ctx.restore();
  };
})(window.RR);
