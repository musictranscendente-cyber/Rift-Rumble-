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

  // Configuração de cada personagem com sprites
  // scale: unidades do mundo por pixel (cada linha da folha foi desenhada num tamanho diferente)
  // twins: quais gêmeos aparecem no quadro (L = claro, D = escuro, LD = os dois)
  // moves: quadro de [preparação, golpe ativo, recuperação]; [nome, rotação] gira o quadro
  const SETS = {
    vex: {
      frames: ['idle', 'idle_dark', 'front', 'c1a', 'c1b', 'c1c', 'c1d', 'c2a', 'c2b', 'c3a', 'c3b', 'castA', 'castB',
        'orbA', 'orbB', 'rec1', 'rec2', 'rec3', 'ult1', 'ult2', 'ult3', 'win'],
      scale: { idle: 0.53, idle_dark: 0.5, front: 0.53, c: 0.72, cast: 0.74, orb: 0.74, rec: 0.66, ult: 0.86, win: 0.42 },
      twins: { c2a: 'LD', c2b: 'LD', c3b: 'LD', rec2: 'LD', rec3: 'D', castB: 'D', ult1: 'LD', ult2: 'LD', ult3: 'LD', win: 'LD' },
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
    },
  };

  for (const [id, set] of Object.entries(SETS)) for (const fr of set.frames) S.image(`img/${id}/${fr}.png`);

  function scaleOf(set, name) {
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

  // escolhe o quadro conforme o estado do lutador (chamado por computePose)
  S.pose = function (f, p, time) {
    const set = SETS[f.def.sprite];
    let fr = 'idle', rot = 0;
    switch (f.state) {
      case 'run': fr = 'c1a'; break;
      case 'air': fr = f.vy < 0 ? 'c1c' : 'c1a'; break;
      case 'helpless': case 'roll': case 'airdodge': fr = 'c1c'; break;
      case 'hitstun': case 'stunned': case 'ledge': fr = 'front'; break;
      case 'attack': {
        const m = f.move, t = f.moveT;
        const i = t < m.startup ? 0 : t < m.startup + m.active ? 1 : 2;
        let e = f.moveId === 'special' ? (f.twinDark ? 'castB' : 'castA') : (set.moves[f.moveId] || [])[i] || 'idle';
        if (Array.isArray(e)) [e, rot] = e;
        fr = e;
        break;
      }
    }
    p.frame = fr;
    p.frot = rot;
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
    const fr = p.frame || 'idle';
    const tw = set.twins[fr] || 'L';
    if (tw !== 'LD') {
      const other = tw === 'L' ? 'idle_dark' : 'idle';
      const tx = p.twinX != null ? p.twinX : -36;
      const ty = p.twinY != null ? p.twinY : -14;
      drawFrame(ctx, id, other, tx, ty + Math.sin(time * 0.09) * 2, 0, 0.9, d.h);
    }
    if (tint) ctx.filter = tint === '#ffffff' ? 'brightness(2.6) saturate(0.2)' : 'saturate(0.4) brightness(1.3)';
    drawFrame(ctx, id, fr, 0, 0, p.frot || 0, 1, d.h);
    if (tint) ctx.filter = 'none';
  };

  // projétil com sprite (orbes do Vex)
  S.drawOrb = function (ctx, p, time) {
    const dir = p.vx < 0 ? -1 : 1;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(dir, 1);
    drawFrame(ctx, p.owner.def.sprite, p.sprite, 0, 0, 0, p.scale * (1 + Math.sin(time * 0.5) * 0.04), 0);
    ctx.restore();
  };
})(window.RR);
