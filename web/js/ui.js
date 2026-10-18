// Menus: título, seleção de personagem/arena, opções, pausa e resultados
(function (RR) {
  const U = RR.U;
  const ui = (RR.ui = {});
  const $ = (s) => document.querySelector(s);
  const LEVEL_NAMES = ['Fácil', 'Médio', 'Difícil'];

  const cfg = Object.assign(
    { char: 'solkar', mode: 'stock', bots: 1, level: 1, stage: 'leao', cpuChars: ['random', 'random', 'random'] },
    U.store.get('cfg', {})
  );
  // escolhas salvas de versões antigas podem apontar para lutadores/arenas que não existem mais
  if (!RR.chars[cfg.char]) cfg.char = RR.chars.list[0];
  if (!RR.stages[cfg.stage]) cfg.stage = RR.stages.list[0];
  cfg.cpuChars = cfg.cpuChars.map((c) => (c === 'random' || RR.chars[c] ? c : 'random'));
  const saveCfg = () => U.store.set('cfg', cfg);
  let current = 'title';
  let lastPlayers = null;
  const portraits = [];
  // vitrine da seleção: o escolhido em tamanho grande ('idle', 'show' = golpe ao tocar, 'win' = vitória ao confirmar)
  const sc = { mode: 'idle', t0: 0, time: 0 };
  const SHOW_T = 50, WIN_T = 70;

  function click() {
    RR.audio.init();
    RR.audio.play('click');
  }

  function show(id) {
    document.querySelectorAll('.screen').forEach((e) => e.classList.toggle('show', e.id === 'screen-' + id));
    $('#hud').classList.toggle('hidden', id !== 'game' && id !== 'pause');
    current = id;
  }
  ui.current = () => current;

  // ---------------- Partida demo no fundo dos menus ----------------
  function startDemo() {
    const ids = RR.chars.list.slice().sort(() => Math.random() - 0.5).slice(0, 4);
    RR.match = new RR.Match({
      mode: 'time', time: 99999, stageId: U.pick(RR.stages.list),
      players: ids.map((id) => ({ charId: id, type: 'cpu', level: 2 })),
    });
    RR.match.demo = true;
    RR.match.phase = 'play';
    RR.paused = false;
  }

  // ---------------- Seleção de personagem ----------------
  function buildSelect() {
    const grid = $('#charGrid');
    grid.innerHTML = '';
    const n = RR.chars.list.length;
    grid.style.setProperty('--cols', n > 5 ? Math.ceil(n / 2) : n);
    for (const id of RR.chars.list) {
      const d = RR.chars[id];
      const card = document.createElement('div');
      card.className = 'char-card';
      card.style.setProperty('--c', d.color);
      const cv = document.createElement('canvas');
      cv.width = 200;
      cv.height = 220;
      card.appendChild(cv);
      card.insertAdjacentHTML('beforeend', `<div class="nm">${d.name}</div><div class="ar">${d.arche}</div>`);
      card.addEventListener('click', () => {
        if (sc.mode === 'win') return;
        click();
        cfg.char = id;
        saveCfg();
        refreshSelect();
        sc.mode = 'show';
        sc.t0 = sc.time;
      });
      card.dataset.id = id;
      grid.appendChild(card);
      portraits.push({ cv, d });
    }
    seg('#optMode', [['stock', '3 Vidas'], ['time', 'Tempo 2min']], () => cfg.mode, (v) => (cfg.mode = v));
    seg('#optBots', [[1, '1'], [2, '2'], [3, '3']], () => cfg.bots, (v) => (cfg.bots = v));
    seg('#optLevel', LEVEL_NAMES.map((n, i) => [i, n]), () => cfg.level, (v) => (cfg.level = v));
    refreshSelect();
  }

  function seg(sel, items, get, set) {
    const el = $(sel);
    el.innerHTML = '';
    for (const [v, label] of items) {
      const b = document.createElement('button');
      b.textContent = label;
      b.addEventListener('click', () => {
        click();
        set(v);
        saveCfg();
        refreshSelect();
      });
      b.dataset.v = v;
      el.appendChild(b);
    }
    el._refresh = () => el.querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(get()) === b.dataset.v));
  }

  function refreshSelect() {
    document.querySelectorAll('.char-card').forEach((c) => c.classList.toggle('sel', c.dataset.id === cfg.char));
    ['#optMode', '#optBots', '#optLevel'].forEach((s) => $(s)._refresh());
    const d = RR.chars[cfg.char];
    const info = $('#charInfo');
    info.style.setProperty('--c', d.color);
    $('#showcase').style.setProperty('--c', d.color);
    $('#scName').innerHTML = `<b>${d.sign} ${d.name}</b><span>${d.title}</span>`;
    info.innerHTML =
      `<div class="stats">${Object.entries(d.stats)
        .map(([k, v]) => `<span>${k}</span><span class="pips">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span>`)
        .join('')}</div>` +
      d.skills.map((s) => `<div class="skill"><span class="k">${s.key}</span><div class="t"><b>${s.name}</b><div>${s.desc}</div></div></div>`).join('');
    // vagas dos bots
    const slots = $('#cpuSlots');
    slots.innerHTML = '';
    for (let i = 0; i < cfg.bots; i++) {
      const c = cfg.cpuChars[i] || 'random';
      const el = document.createElement('div');
      el.className = 'cpu';
      el.style.setProperty('--pc', RR.PCOLORS[i + 1]);
      if (c === 'random') el.innerHTML = '<div class="q">?</div>';
      else {
        const cv = document.createElement('canvas');
        cv.width = 92;
        cv.height = 76;
        el.appendChild(cv);
        RR.render.portrait(cv, RR.chars[c], 0);
      }
      el.addEventListener('click', () => {
        click();
        const opts = ['random'].concat(RR.chars.list);
        cfg.cpuChars[i] = opts[(opts.indexOf(c) + 1) % opts.length];
        saveCfg();
        refreshSelect();
      });
      slots.appendChild(el);
    }
  }

  // ---------------- Arenas ----------------
  function drawStageThumb(cv, st) {
    RR.stages.prepare(st);
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, th = st.theme;
    if (st.image) {
      const im = RR.sprites.image(st.image.src);
      const sky = st.bg && RR.sprites.image(st.bg.src);
      const paint = () => {
        const day = ctx.createLinearGradient(0, 0, W, 0);
        day.addColorStop(0.5, '#5aa8f0');
        day.addColorStop(0.5, '#2a1a6e');
        ctx.fillStyle = st.bg ? th.sky[1] : day;
        ctx.fillRect(0, 0, W, H);
        if (sky && RR.sprites.ready(sky)) ctx.drawImage(sky, 0, 0, W, H);
        const s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * 1.05;
        ctx.drawImage(im, (W - im.naturalWidth * s) / 2, (H - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
      };
      if (RR.sprites.ready(im)) paint();
      else im.addEventListener('load', paint);
      if (sky) sky.addEventListener('load', paint);
      return;
    }
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.sky[0]);
    g.addColorStop(0.6, th.sky[1]);
    g.addColorStop(1, th.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const s = W / 1500;
    ctx.save();
    ctx.translate(W / 2, H * 0.62);
    ctx.scale(s, s);
    for (const b of st.solids) {
      ctx.fillStyle = th.body;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + b.w, b.y);
      ctx.lineTo(b.x + b.w * 0.55, b.y + b.h);
      ctx.lineTo(b.x + b.w * 0.4, b.y + b.h * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = th.top;
      ctx.fillRect(b.x, b.y, b.w, 14);
    }
    ctx.fillStyle = th.plat;
    for (const p of st.plats) ctx.fillRect(p.x, p.y, p.w, 12);
    ctx.restore();
    if (th.lava) {
      ctx.fillStyle = 'rgba(255,120,0,0.6)';
      ctx.fillRect(0, H * 0.9, W, H * 0.1);
    }
  }

  function buildStages() {
    const grid = $('#stageGrid');
    grid.innerHTML = '';
    for (const id of RR.stages.list) {
      const st = RR.stages[id];
      const card = document.createElement('div');
      card.className = 'stage-card';
      card.dataset.id = id;
      const cv = document.createElement('canvas');
      cv.width = 480;
      cv.height = 230;
      card.appendChild(cv);
      card.insertAdjacentHTML('beforeend', `<div class="nm">${st.name}</div><div class="ds">${st.desc}</div>`);
      card.addEventListener('click', () => {
        click();
        if (cfg.stage === id) return ui.startMatch();
        cfg.stage = id;
        saveCfg();
        refreshStages();
      });
      grid.appendChild(card);
      drawStageThumb(cv, st);
    }
    refreshStages();
  }
  function refreshStages() {
    document.querySelectorAll('.stage-card').forEach((c) => c.classList.toggle('sel', c.dataset.id === cfg.stage));
  }

  // ---------------- Opções ----------------
  function buildOptions() {
    const p = $('#optionsPanel');
    const s = RR.settings;
    const toggles = [
      ['sound', 'Efeitos sonoros'],
      ['music', 'Música'],
      ['vibration', 'Vibração'],
      ['hitboxes', 'Mostrar hitboxes (debug)'],
    ];
    p.innerHTML = '';
    for (const [k, label] of toggles) {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span>${label}</span>`;
      const t = document.createElement('button');
      t.className = 'toggle' + (s[k] ? ' on' : '');
      t.addEventListener('click', () => {
        s[k] = !s[k];
        t.classList.toggle('on', s[k]);
        U.saveSettings();
        click();
        RR.audio.refresh();
        if (k === 'vibration' && s[k]) U.vibrate(60);
      });
      row.appendChild(t);
      p.appendChild(row);
    }
    const sliders = [
      ['ctrlSize', 'Tamanho dos controles', 0.7, 1.4, 0.05],
      ['ctrlOpacity', 'Opacidade dos controles', 0.2, 1, 0.05],
    ];
    for (const [k, label, min, max, step] of sliders) {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span>${label}</span>`;
      const r = document.createElement('input');
      r.type = 'range';
      r.min = min;
      r.max = max;
      r.step = step;
      r.value = s[k];
      r.addEventListener('input', () => {
        s[k] = parseFloat(r.value);
        U.saveSettings();
        RR.input.layout();
      });
      row.appendChild(r);
      p.appendChild(row);
    }
  }

  // ---------------- Partida ----------------
  ui.startMatch = function (players) {
    if (!players) {
      const pool = RR.chars.list;
      players = [{ charId: cfg.char, type: 'human' }];
      for (let i = 0; i < cfg.bots; i++) {
        let c = cfg.cpuChars[i] || 'random';
        if (c === 'random') c = U.pick(pool);
        players.push({ charId: c, type: 'cpu', level: cfg.level });
      }
    }
    lastPlayers = players;
    RR.input.human.reset();
    ui.hideControls(false);
    RR.match = new RR.Match({ mode: cfg.mode, stocks: 3, time: 120, stageId: cfg.stage, players });
    RR.paused = false;
    show('game');
    RR.input.layout();
    RR.audio.init();
    RR.audio.music(0.55);
  };

  // esconde os botões de toque (cena de vitória)
  ui.hideControls = function (hide) {
    $('#controls').classList.toggle('hidden', hide);
    $('#btnPause').classList.toggle('hidden', hide);
  };

  ui.pause = function () {
    if (!RR.match || RR.match.demo || current !== 'game') return;
    RR.paused = true;
    RR.input.human.reset();
    show('pause');
    RR.audio.music(0.15);
  };

  ui.resume = function () {
    RR.input.human.reset();
    RR.paused = false;
    show('game');
    RR.audio.music(0.55);
  };

  ui.toMenu = function (screen) {
    startDemo();
    show(screen || 'title');
    RR.audio.music(0.25);
  };

  ui.showResults = function (m) {
    if (m.demo) return;
    const rank = m.ranking();
    const human = m.fighters.find((f) => f.isHuman);
    const won = rank[0] === human;
    $('#resTitle').textContent = won ? 'VITÓRIA!' : 'DERROTA';
    $('#resTitle').style.color = won ? '#ffd166' : '#ff6b6b';
    const tbl = $('#resTable');
    tbl.innerHTML = '<div class="res-row head"><span></span><span></span><span>LUTADOR</span><span class="v">KOs</span><span class="v">QUEDAS</span><span class="v">DANO</span></div>';
    rank.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'res-row';
      row.style.setProperty('--pc', f.pcolor);
      const cv = document.createElement('canvas');
      cv.width = 92;
      cv.height = 92;
      row.innerHTML = `<span class="pos">${i + 1}º</span>`;
      row.appendChild(cv);
      row.insertAdjacentHTML(
        'beforeend',
        `<span class="nm"><b>${f.def.name}</b><small>${f.label}</small></span><span class="v">${f.kos}</span><span class="v">${f.falls}</span><span class="v">${Math.round(f.dmgDealt)}%</span>`
      );
      tbl.appendChild(row);
      RR.render.portrait(cv, f.def, 0, RR.sprites.anim(f.def, 'win', 30));
    });
    show('results');
    RR.audio.music(0.2);
  };

  ui.onBack = function () {
    switch (current) {
      case 'game': return ui.pause();
      case 'pause': return ui.resume();
      case 'select': click(); return show('title');
      case 'stage': click(); return show('select');
      case 'howto':
      case 'options':
        click();
        return show(optionsReturn || 'title');
      case 'results': return ui.toMenu();
      case 'title':
        if (window.AndroidBridge && window.AndroidBridge.exit) window.AndroidBridge.exit();
        return;
    }
  };
  let optionsReturn = null;

  // ---------------- Inicialização ----------------
  ui.init = function () {
    RR.input.build($('#controls'));
    buildSelect();
    buildStages();
    buildOptions();

    document.querySelectorAll('[data-go]').forEach((b) =>
      b.addEventListener('click', () => {
        click();
        optionsReturn = null;
        show(b.dataset.go);
      })
    );
    document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => ui.onBack()));
    $('#toStage').addEventListener('click', () => {
      if (sc.mode === 'win') return;
      click();
      RR.audio.play('ult');
      // pose de vitória do escolhido antes de ir para as arenas
      sc.mode = 'win';
      sc.t0 = sc.time;
    });
    $('#startFight').addEventListener('click', () => {
      click();
      ui.startMatch();
    });
    $('#btnPause').addEventListener('click', () => ui.pause());
    $('#resume').addEventListener('click', () => {
      click();
      ui.resume();
    });
    $('#restart').addEventListener('click', () => {
      click();
      ui.startMatch(lastPlayers);
    });
    $('#pauseOptions').addEventListener('click', () => {
      click();
      optionsReturn = 'pause';
      show('options');
    });
    $('#quit').addEventListener('click', () => {
      click();
      ui.toMenu();
    });
    $('#rematch').addEventListener('click', () => {
      click();
      ui.startMatch(lastPlayers);
    });
    $('#resSelect').addEventListener('click', () => {
      click();
      ui.toMenu('select');
    });
    $('#resMenu').addEventListener('click', () => {
      click();
      ui.toMenu();
    });
    // o primeiro toque libera o áudio (exigência dos navegadores)
    const unlock = () => {
      RR.audio.init();
      RR.audio.music(current === 'game' ? 0.55 : 0.25);
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    startDemo();
    show('title');
    const ver = document.querySelector('.version');
    if (ver && RR.VERSION) ver.textContent = 'v' + RR.VERSION.name;
    setTimeout(() => RR.update && RR.update.check(), 1500);
  };

  // anima os retratos na seleção
  ui.tick = function (time) {
    if (current !== 'select') {
      sc.mode = 'idle';
      return;
    }
    sc.time = time;
    const d = RR.chars[cfg.char];
    const t = time - sc.t0;
    let frame;
    if (sc.mode === 'show') {
      frame = RR.sprites.anim(d, 'show', time, t / SHOW_T);
      if (t >= SHOW_T) sc.mode = 'idle';
    } else if (sc.mode === 'win') {
      frame = RR.sprites.anim(d, 'win', t);
      if (t >= WIN_T) {
        sc.mode = 'idle';
        show('stage');
      }
    } else frame = RR.sprites.anim(d, 'idle', time);
    RR.render.portrait($('#showCv'), d, time, frame, 0.42, 0.8);
    if (time % 2) return;
    for (const p of portraits) RR.render.portrait(p.cv, p.d, time, RR.sprites.anim(p.d, 'idle', time + p.d.h * 3), 0.62, 0.88);
  };
})(window.RR);
