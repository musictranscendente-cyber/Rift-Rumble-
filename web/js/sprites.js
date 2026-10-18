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
    let e = list ? list[i] : set.idle;
    if (e && e.seq) {
      const k = Math.min(0.999, Math.max(0, (t - m.startup) / m.active));
      e = e.seq[Math.floor(k * e.seq.length)];
    }
    return Array.isArray(e) ? e : [e, 0];
  }

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
  };
  S.sets = SETS;

  for (const [id, set] of Object.entries(SETS)) for (const fr of set.frames) S.image(`img/${id}/${fr}.png`);

  function scaleOf(set, name) {
    if (typeof set.scale === 'number') return set.scale;
    if (set.scale[name] != null) return set.scale[name];
    for (const k of ['cast', 'orb', 'rec', 'ult', 'c']) if (name.startsWith(k)) return set.scale[k];
    return set.scale.idle;
  }

  // desenha um quadro com os pés (ponto de apoio) em (x, y)
  function drawFrame(ctx, id, name, x, y, rot, mul, h) {
    const im = cache[`img/${id}/${name}.png`];
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

  // escolhe o quadro conforme o estado do lutador (chamado por computePose)
  S.pose = function (f, p, time) {
    const set = SETS[f.def.sprite];
    let fr, rot = 0;
    if (f.state === 'attack') [fr, rot] = moveFrame(set, f);
    else fr = set.pose(f, time) || set.idle;
    p.frame = fr;
    p.frot = rot;
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
    if (tint) ctx.filter = tint === '#ffffff' ? 'brightness(2.6) saturate(0.2)' : 'saturate(0.4) brightness(1.3)';
    drawFrame(ctx, id, fr, 0, 0, p.frot || 0, 1, d.h);
    if (tint) ctx.filter = 'none';
  };

  // rosto no placar; devolve false se o personagem não tiver retrato próprio
  S.drawPortrait = function (ctx, d, cx, cy, r) {
    const set = d.sprite && SETS[d.sprite];
    if (!set || !set.portrait) return false;
    const im = cache[`img/${d.sprite}/${set.portrait}.png`];
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
