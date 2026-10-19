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
    if (typeof list === 'function') return [list(f), 0];
    // track: sequência contínua ao longo do golpe inteiro (quadros tirados de vídeo)
    if (list && list.track) {
      const L = list.track, total = m.startup + m.active + m.recovery;
      // hit: quadro do vídeo em que o golpe acerta, alinhado com o começo do golpe ativo
      if (list.hit != null) {
        const idx = t < m.startup ? (t / m.startup) * list.hit : list.hit + ((t - m.startup) / (m.active + m.recovery)) * (L.length - list.hit);
        return [L[Math.min(L.length - 1, Math.floor(idx))], 0];
      }
      return [L[Math.min(L.length - 1, Math.floor((t / total) * L.length))], 0];
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
  const VJAB2 = seqNames('vjab2', 19), VJAB3 = seqNames('vjab3', 23);
  const VJUMP = seqNames('vjump', 9).slice(1), VREC = seqNames('vrec', 16);
  const VSP = seqNames('vsp', 34), VORB = seqNames('vorb', 17), VULT = seqNames('vult', 46);
  const BRUN = seqNames('brun', 11), BIDLE = seqNames('bidle', 16), BJAB = seqNames('bjab', 23), BJAB2 = seqNames('bjab2', 18);
  const BJAB3 = seqNames('bjab3', 26), BSPEC = seqNames('bspec', 21), BJUMP = seqNames('bjump', 8), BREC = seqNames('brec', 17);
  const BWIN = seqNames('bwin', 21), BULT = seqNames('bult', 24);

  // animações de vídeo: lista de quadros de cada prefixo (quantidade gerada pelo extrator)
  const V = {};
  for (const id of ['solkar', 'astrael', 'vex', 'noxara']) {
    const memo = {};
    V[id] = (p) => memo[p] || (memo[p] = seqNames(p, ((RR.spriteData[id] || {}).__count || {})[p] || 1));
  }

  // conjunto de um personagem feito só de vídeo: corrida, parado, pulo, subida e vitória seguem o mesmo padrão
  function videoSet(id, k, moves) {
    const L = V[id], data = RR.spriteData[id] || {};
    const prefixes = Object.keys(data.__count || {}).filter((p) => p !== 'face');
    const RUN = L(k + 'run'), IDLE = L(k + 'idle'), JUMP = L(k + 'jump'), REC = L(k + 'rec'), WIN = L(k + 'win');
    return {
      ext: 'webp',
      idle: IDLE[0],
      anims: { idle: IDLE, win: WIN, show: moves.jab2.track },
      portrait: 'face',
      frames: ['face'].concat(...prefixes.map(L)),
      scale: Object.assign({ default: (data.__scale || {})[k + 'idle'] || 0.5 }, data.__scale),
      moves,
      winFrame: (time) => WIN[Math.floor(time / 3) % WIN.length],
      pose(f, time) {
        switch (f.state) {
          case 'run': return RUN[Math.floor(f.anim.run * 2.4) % RUN.length];
          case 'air': {
            const q = Math.min(1, Math.max(0, (f.vy + f.def.jump) / (2 * f.def.jump)));
            return JUMP[Math.round(q * (JUMP.length - 1))];
          }
          case 'helpless': return JUMP[JUMP.length - 1];
          case 'roll': case 'airdodge': return REC[1];
          case 'hitstun': case 'stunned': return JUMP[Math.floor(JUMP.length / 2)];
          case 'ledge': return JUMP[0];
        }
        return IDLE[Math.floor((time + f.slot * 17) / 7) % IDLE.length];
      },
    };
  }

  // Configuração de cada personagem com sprites
  // scale: unidades do mundo por pixel (número, ou por quadro/prefixo quando a folha mistura tamanhos)
  const SETS = {
    // Solkar, Astrael, Vex e Noxara: tudo de vídeo (tools/extract-video-chars.py)
    solkar: videoSet('solkar', 's', {
      jab1: { track: V.solkar('sjab'), hit: 7 },
      jab2: { track: V.solkar('sjab2'), hit: 6 },
      jab3: { track: V.solkar('sjab3'), hit: 6 },
      upA: { track: V.solkar('sjab3'), hit: 6 },
      downG: { track: V.solkar('sjab'), hit: 7 },
      nair: { track: V.solkar('srec').slice(3, 12), hit: 1 },
      dair: { track: V.solkar('sjab2'), hit: 6 },
      special: { track: V.solkar('sspec'), hit: 3 },
      recovery: { track: V.solkar('srec'), hit: 3 },
      // Queda do Sol: salto (até sumir), bola de fogo caindo e a explosão depois de tocar o chão
      ult(f) {
        const L = V.solkar('sult'), m = f.move, t = f.moveT;
        if (f.mvar.landed) return L[Math.min(L.length - 1, 28 + Math.floor(((t - m.startup - m.active) / m.recovery) * (L.length - 28)))];
        if (t < 26) return L[Math.min(19, Math.floor((t / 14) * 19))];
        return L[22 + (Math.floor((t - 26) / 2) % 7)];
      },
    }),

    astrael: videoSet('astrael', 'a', {
      jab1: { track: V.astrael('ajab'), hit: 3 },
      jab2: { track: V.astrael('ajab2'), hit: 3 },
      jab3: { track: V.astrael('ajab3'), hit: 4 },
      upA: { track: V.astrael('ajab'), hit: 3 },
      downG: { track: V.astrael('ajab3').slice(0, 10), hit: 4 },
      nair: { track: V.astrael('ajab'), hit: 3 },
      dair: { track: V.astrael('ajab2'), hit: 3 },
      // Flecha Cometa: a corda vai sendo puxada com a carga; solta rápido (tiro curto) ou o cometa (carga alta)
      special(f) {
        const C = V.astrael('achg'), m = f.move, t = f.moveT, c = f.mvar.c || 0;
        if (t < m.startup) return c < 4 ? C[Math.floor((t / m.startup) * 4)] : C[Math.min(C.length - 1, 4 + Math.floor((c / 60) * (C.length - 5)))];
        const k = (t - m.startup) / (m.active + m.recovery);
        const L = c < 20 ? V.astrael('ajab2').slice(3) : V.astrael('arel');
        return L[Math.min(L.length - 1, Math.floor(k * L.length))];
      },
      recovery: { track: V.astrael('arec'), hit: 2 },
      ult: { track: V.astrael('ault') },
    }),

    vex: videoSet('vex', 'x', {
      jab1: { track: V.vex('xjab'), hit: 6 },
      jab2: { track: V.vex('xjab2'), hit: 7 },
      jab3: { track: V.vex('xjab3'), hit: 4 },
      upA: { track: V.vex('xjab2'), hit: 7 },
      downG: { track: V.vex('xjab'), hit: 6 },
      nair: { track: V.vex('xrec').slice(2, 12), hit: 1 },
      dair: { track: V.vex('xjab3'), hit: 4 },
      // Passo Gêmeo: lampejo, some (não é desenhado) e reaparece no chute
      special(f) {
        const L = V.vex('xspec'), m = f.move, t = f.moveT;
        if (t < 6) return L[Math.floor((t / 6) * 5)];
        const k = Math.min(0.999, (t - 13) / (m.startup + m.active + m.recovery - 13));
        return L[14 + Math.floor(Math.max(0, k) * (L.length - 14))];
      },
      recovery: { track: V.vex('xrec'), hit: 1 },
      ult: { track: V.vex('xult') },
    }),

    noxara: videoSet('noxara', 'n', {
      jab1: { track: V.noxara('njab'), hit: 3 },
      jab2: { track: V.noxara('njab2'), hit: 2 },
      jab3: { track: V.noxara('njab3'), hit: 6 },
      upA: { track: V.noxara('njab2'), hit: 2 },
      downG: { track: V.noxara('njab'), hit: 3 },
      nair: { track: V.noxara('nrec').slice(2, 14), hit: 1 },
      dair: { track: V.noxara('njab3'), hit: 6 },
      // Bote do Escorpião: avanço, prende (ferroadas enquanto segura) e arremesso
      special(f) {
        const L = V.noxara('nspec'), m = f.move, t = f.moveT, v = f.mvar;
        if (v.grab) return L[Math.min(29, 6 + Math.floor((v.gt / 40) * 24))];
        if (t <= m.startup + m.active && !v.done) return L[Math.min(6, Math.floor((t / (m.startup + m.active)) * 7))];
        const k = Math.min(0.999, Math.max(0, (t - m.startup - m.active) / m.recovery));
        return L[30 + Math.floor(k * (L.length - 30))];
      },
      recovery: { track: V.noxara('nrec'), hit: 3 },
      // Dança do Eclipse: o eclipse se forma, ela some durante os cortes e volta no ferrão final
      ult(f) {
        const L = V.noxara('nult'), t = f.moveT, m = f.move;
        if (t < 18) return L[Math.floor((t / 18) * 6)];
        const k = Math.min(0.999, Math.max(0, (t - 66) / (m.startup + m.active + m.recovery - 66)));
        return L[32 + Math.floor(k * (L.length - 32))];
      },
    }),


    // Lunara: corrida, parado, golpe 1 e vitória tirados de vídeo (quadros densos); resto da folha
    lunara: {
      ext: 'webp',
      idle: 'vidle00',
      portrait: 'face',
      shieldFrame: true,
      alias: { win: 'vwin12' },
      frames: ['stance', 'swipe', 'spin', 'up', 'wave', 'claw', 'cast', 'orbA', 'orbB', 'splash', 'jump', 'rise1', 'rise2',
        'low', 'fall', 'dive', 'charge', 'u1', 'u2', 'u3', 'hurt', 'dizzy', 'ko', 'bubble', 'dash', 'face'].concat(VRUN, VIDLE, VJAB, VWIN, VJAB2, VJAB3, VJUMP, VREC, VSP, VORB, VULT),
      // cada fonte foi desenhada num tamanho: vídeo (v...), vídeo da vitória (com zoom) e folha
      scale: { vult: 0.75, vwin: 0.5, v: 0.6, default: 0.66 },
      moves: {
        jab1: { track: VJAB },
        jab2: { track: VJAB2 },
        jab3: { track: VJAB3 },
        upA: ['stance', 'up', 'up'],
        downG: ['low', 'low', 'low'],
        nair: ['spin', 'wave', 'wave'],
        dair: ['fall', 'dive', 'dive'],
        special: { track: VSP },
        recovery: { track: VREC },
        ult: { track: VULT },
      },
      winFrame: (time) => VWIN[Math.floor(time / 3) % VWIN.length],
      anims: { idle: VIDLE, win: VWIN, show: VJAB2 },
      pose(f, time) {
        switch (f.state) {
          case 'run': return VRUN[Math.floor(f.anim.run * 2.6) % VRUN.length];
          case 'air': {
            // quadro do pulo conforme a velocidade vertical: subindo, topo, descendo
            const k = Math.min(1, Math.max(0, (f.vy + f.def.jump) / (2 * f.def.jump)));
            return VJUMP[Math.round(k * (VJUMP.length - 1))];
          }
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

    // Bront: tudo tirado de vídeo (fundo magenta)
    bront: {
      ext: 'webp',
      idle: 'bidle00',
      portrait: 'face',
      frames: ['face'].concat(BRUN, BIDLE, BJAB, BJAB2, BJAB3, BSPEC, BJUMP, BREC, BWIN, BULT),
      scale: 0.62,
      moves: {
        jab1: { track: BJAB },
        jab2: { track: BJAB2 },
        jab3: { track: BJAB3 },
        upA: { track: BJAB2 },
        downG: { track: BSPEC.slice(6, 14) },
        nair: { track: BJAB2 },
        dair: { track: BJAB3.slice(4, 14) },
        special: { track: BSPEC },
        recovery: { track: BREC },
        ult: { track: BULT },
      },
      winFrame: (time) => BWIN[Math.floor(time / 3) % BWIN.length],
      anims: { idle: BIDLE, win: BWIN, show: BJAB2 },
      pose(f, time) {
        switch (f.state) {
          case 'run': return BRUN[Math.floor(f.anim.run * 2.4) % BRUN.length];
          case 'air': {
            const k = Math.min(1, Math.max(0, (f.vy + f.def.jump) / (2 * f.def.jump)));
            return BJUMP[Math.round(k * (BJUMP.length - 1))];
          }
          case 'helpless': return BJUMP[BJUMP.length - 1];
          case 'roll': case 'airdodge': return BREC[1];
          case 'hitstun': case 'stunned': return BREC[16];
          case 'ledge': return BJUMP[0];
        }
        return BIDLE[Math.floor((time + f.slot * 17) / 9) % BIDLE.length];
      },
    },
  };
  S.sets = SETS;

  // quadro de uma animação fora da luta (seleção de personagem): 'idle' e 'win' repetem; 'show' vai de 0 a 1
  S.anim = function (def, kind, time, k) {
    const a = SETS[def.sprite].anims[kind];
    if (kind === 'show') return a[Math.min(a.length - 1, Math.floor(k * a.length))];
    return a[Math.floor(time / (kind === 'win' ? 3 : 7)) % a.length];
  };
  S.seq = seqNames;

  const path = (id, name) => `img/${id}/${name}.${SETS[id].ext || 'png'}`;
  // ao abrir só o essencial (pose parada e rosto); o resto vem quando o
  // personagem entra numa luta ou é escolhido, e qualquer quadro pedido no desenho começa a carregar
  const preloaded = {};
  S.preload = function (id) {
    if (!SETS[id] || preloaded[id]) return;
    preloaded[id] = true;
    for (const fr of SETS[id].frames) S.image(path(id, fr));
  };
  for (const [id, set] of Object.entries(SETS))
    for (const fr of [set.idle, set.portrait]) if (fr) S.image(path(id, fr));

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
  // largura do personagem parado no mundo (para caber nos quadros da seleção)
  S.idleWidth = function (def) {
    const set = SETS[def.sprite], m = RR.spriteData[def.sprite] && RR.spriteData[def.sprite][set.idle];
    return m ? m.w * scaleOf(set, set.idle) : def.w;
  };

  function drawFrame(ctx, id, name, x, y, rot, mul, h) {
    if (SETS[id].alias && SETS[id].alias[name]) name = SETS[id].alias[name];
    const im = S.image(path(id, name));
    const m = RR.spriteData[id] && RR.spriteData[id][name];
    if (!m) return;
    // quadro ainda chegando pela rede: mostra a pose parada no lugar
    if (!ready(im)) return name !== SETS[id].idle && drawFrame(ctx, id, SETS[id].idle, x, y, 0, mul, h);
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
  };

  // desenha o personagem com os pés em (0,0), olhando para +x
  S.draw = function (ctx, d, p, time, tint) {
    const id = d.sprite, set = SETS[id];
    const fr = p.frame || set.idle;
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
    const name = p.anim ? p.anim[Math.floor(p.t / (p.animRate || 4)) % p.anim.length] : p.sprite;
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
