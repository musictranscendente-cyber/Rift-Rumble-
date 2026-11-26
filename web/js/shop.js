// Loja e "Meus itens": comprar com moedas/gemas, ver o que tem e equipar. A vitrine à esquerda mostra o item em ação.
(function (RR) {
  const U = RR.U;
  const CO = RR.cosmetics;
  const S = (RR.shop = {});
  const $ = (s) => document.querySelector(s);
  const T = RR.t;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // abas: ofertas e gemas só na loja
  const TABS = [
    ['offers', '⭐', 'Ofertas'],
    ['skin', '🎨', 'Skins'],
    ['win', '🏆', 'Vitória'],
    ['ko', '💥', 'Nocaute'],
    ['emote', '😀', 'Emotes'],
    ['profile', '🪪', 'Perfil'],
    ['gems', '💎', 'Gemas'],
  ];
  // símbolo do card para o que não é skin/ícone
  const GLYPH = {
    win_classic: '🏆', win_confetti: '🎉', win_fire: '🔥', win_stars: '👑', win_storm: '⛈️',
    ko_classic: '💥', ko_stars: '✨', ko_petals: '🌸', ko_fireworks: '🎆', ko_bolt: '⚡', ko_void: '🕳️',
  };
  const CAT_NAME = { skin: 'Skin', win: 'Comemoração de vitória', ko: 'Efeito de nocaute', emote: 'Emote', icon: 'Ícone', frame: 'Moldura', title: 'Título' };

  const ui = { mode: 'shop', tab: 'offers', sel: null, char: null };
  let built = false;

  const fmt = (n) => Number(n).toLocaleString(RR.lang === 'en' ? 'en-US' : 'pt-BR');
  function priceHTML(it) {
    const p = CO.price(it);
    if (!p) return '';
    const cur = p.k === 'c' ? '🪙' : '💎';
    return `${p.off ? `<s>${fmt(p.full)}</s> ` : ''}<b>${cur} ${fmt(p.v)}</b>`;
  }
  function wallet() {
    $('#shopWallet').innerHTML = `<span>🪙 ${fmt(RR.progress.coins())}</span><span>💎 ${fmt(RR.progress.gems())}</span>`;
  }

  // ---------------- Lista de itens da aba ----------------
  // skin "Original" de cada lutador (sempre sua) para voltar ao visual padrão
  const ORIG = (c) => ({ id: 'orig_' + c, cat: 'skin', char: c, orig: true, rar: 'comum', free: true });
  function itemsOf(tab) {
    const mine = ui.mode === 'mine';
    const keep = (it) => !mine || it.orig || CO.owns(it.id);
    if (tab === 'offers') return CO.offers().map(CO.get);
    if (tab === 'skin') {
      const out = [];
      for (const c of RR.chars.list) {
        const L = CO.items.filter((it) => it.cat === 'skin' && it.char === c).filter(keep);
        out.push(ORIG(c), ...L);
      }
      return out;
    }
    if (tab === 'profile') return CO.items.filter((it) => ['icon', 'frame', 'title'].includes(it.cat)).filter(keep);
    return CO.items.filter((it) => it.cat === tab).filter(keep);
  }
  const getItem = (id) => (id && id.startsWith('orig_') ? ORIG(id.slice(5)) : CO.get(id));
  const owned = (it) => it.orig || CO.owns(it.id);
  const isEquipped = (it) => (it.orig ? !CO.eq().skin[it.char] : CO.equipped(it.id));

  function cardHTML(it) {
    const own = owned(it), eq = own && isEquipped(it);
    let art;
    if (it.cat === 'skin') art = `<canvas class="cface" width="96" height="96" data-char="${it.char}" data-skin="${it.orig ? '' : it.id}"></canvas>`;
    else if (it.cat === 'icon' || it.cat === 'frame') art = CO.avatarHTML({ icon: it.cat === 'icon' ? it.id : CO.eq().icon, frame: it.cat === 'frame' ? it.id : 'fr_basic' }, 'big');
    else if (it.cat === 'title') art = `<span class="ctitle">${esc(CO.name(it))}</span>`;
    else if (it.cat === 'emote') art = `<span class="cglyph">${it.txt ? `<i class="gg">${it.txt}</i>` : it.e}</span>`;
    else art = `<span class="cglyph">${GLYPH[it.id] || '✨'}</span>`;
    const nm = it.orig ? T('Original') : it.cat === 'skin' ? CO.name(it) : it.cat === 'title' ? T('Título') : CO.name(it);
    const sub = it.cat === 'skin' ? RR.chars[it.char].name : '';
    const tag = eq ? `<span class="tag eq">${T('EQUIPADO')}</span>` : own ? `<span class="tag own">✔ ${T('SEU')}</span>` : it.excl ? `<span class="tag ex">🔒 ${T('EXCLUSIVO')}</span>` : `<span class="tag pr">${priceHTML(it)}</span>`;
    const off = !own && CO.price(it) && CO.price(it).off ? '<span class="off">-25%</span>' : '';
    return `<button class="scard${ui.sel === it.id ? ' sel' : ''}${eq ? ' is-eq' : ''}" data-id="${it.id}" style="--r:${CO.RARITY[it.rar] || '#9fb3c8'}">${off}<span class="art">${art}</span><span class="nm">${esc(nm)}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}${tag}</button>`;
  }

  function gemsHTML() {
    const packs = [[100, 'R$ 4,99', '$0.99'], [250, 'R$ 9,99', '$1.99'], [700, 'R$ 24,99', '$4.99'], [1600, 'R$ 49,99', '$9.99']];
    return (
      `<div class="gem-note">${T('Ganhe gemas grátis: +20 a cada 5 níveis e nos prêmios da Ranqueada.')}</div>` +
      packs.map(([n, br, us]) => `<div class="scard gem"><span class="art"><span class="cglyph">💎</span></span><span class="nm">${fmt(n)} ${T('gemas')}</span><span class="tag soon">${RR.lang === 'en' ? us : br} · ${T('EM BREVE')}</span></div>`).join('')
    );
  }

  function renderTabs() {
    $('#shopTabs').innerHTML = TABS.filter(([k]) => ui.mode === 'shop' || (k !== 'offers' && k !== 'gems'))
      .map(([k, ic, nm]) => `<button class="${ui.tab === k ? 'on' : ''}" data-tab="${k}">${ic} <span>${T(nm)}</span></button>`)
      .join('');
  }

  function renderGrid() {
    const grid = $('#shopGrid');
    if (ui.tab === 'gems') {
      grid.innerHTML = gemsHTML();
      return;
    }
    const L = itemsOf(ui.tab);
    let html = '';
    let lastGroup = null;
    for (const it of L) {
      // separadores: lutador (skins) e tipo (perfil)
      const group = ui.tab === 'skin' ? it.char : ui.tab === 'profile' ? it.cat : null;
      if (group && group !== lastGroup) {
        html += `<div class="sgroup">${ui.tab === 'skin' ? `${RR.chars[group].sign} ${RR.chars[group].name}` : T({ icon: 'Ícones', frame: 'Molduras', title: 'Títulos' }[group])}</div>`;
        lastGroup = group;
      }
      html += cardHTML(it);
    }
    if (ui.tab === 'offers') html = `<div class="gem-note">⏰ ${T('Ofertas do dia: 25% de desconto. Trocam à meia-noite.')}</div>` + html;
    grid.innerHTML = html || `<div class="gem-note">${T('Nada aqui ainda. Veja na loja!')}</div>`;
    // rosto de cada skin
    grid.querySelectorAll('canvas.cface').forEach((cv) => {
      const d = CO.withSkin(RR.chars[cv.dataset.char], cv.dataset.skin || null);
      const ctx = cv.getContext('2d');
      const draw = () => {
        ctx.clearRect(0, 0, cv.width, cv.height);
        RR.sprites.drawPortrait(ctx, d, 48, 52, 38);
      };
      draw();
      const im = RR.sprites.image(`img/${d.sprite}/face.webp`);
      if (!RR.sprites.ready(im)) im.addEventListener('load', draw, { once: true });
    });
    if (ui.sel) {
      const c = grid.querySelector(`[data-id="${ui.sel}"]`);
      if (c && c.scrollIntoView && ui.scrollSel) c.scrollIntoView({ block: 'nearest' });
      ui.scrollSel = false;
    }
  }

  // ---------------- Vitrine ----------------
  const pv = { g: { fx: [], frame: 0, fighters: [], preview: true }, t: 0, last: 0, item: null };
  function renderInfo() {
    const it = getItem(ui.sel);
    pv.item = it;
    pv.t = 0;
    pv.g.fx = [];
    const card = $('#shopCard'), info = $('#shopInfo'), act = $('#shopAct');
    if (!it) {
      info.innerHTML = '';
      card.innerHTML = '';
      act.style.visibility = 'hidden';
      return;
    }
    const nm = it.orig ? T('Original') : CO.name(it);
    const what = it.cat === 'skin' ? `${T('Skin')} · ${RR.chars[it.char].name}` : T(CAT_NAME[it.cat]);
    const rar = it.orig ? '' : `<span class="rar" style="color:${CO.RARITY[it.rar]}">${CO.rarName(it.rar)}</span>`;
    const desc = it.orig ? T('O visual padrão do lutador.') : CO.desc(it);
    info.innerHTML = `<b>${esc(nm)}</b><span class="what">${esc(what)} ${rar}</span>${desc ? `<span class="desc">${esc(desc)}</span>` : ''}`;
    // perfil: mostra como fica no ranking
    if (['icon', 'frame', 'title'].includes(it.cat)) {
      const e = CO.eq();
      const pr = { icon: it.cat === 'icon' ? it.id : e.icon, frame: it.cat === 'frame' ? it.id : e.frame, title: it.cat === 'title' ? it.id : e.title };
      const name = (RR.rank && RR.rank.state && RR.rank.state().name) || T('Você');
      card.innerHTML = `<div class="rk-row me sp-row"><span class="p">#1</span>${CO.avatarHTML(pr)}<span class="n">${esc(name)}<small class="ti">${esc(CO.titleText(pr.title))}</small></span><span class="l">👑</span><span class="v">2.800</span></div><div class="sp-hint">${T('Assim você aparece no ranking da Ranqueada')}</div>`;
    } else card.innerHTML = '';
    // botão
    act.style.visibility = 'visible';
    act.disabled = false;
    act.className = 'btn big primary';
    if (owned(it)) {
      if (it.cat === 'emote') act.textContent = CO.equipped(it.id) ? T('TIRAR DA LUTA') : T('LEVAR PARA A LUTA');
      else if (isEquipped(it)) {
        act.textContent = '✔ ' + T('EQUIPADO');
        act.disabled = true;
        act.className = 'btn big';
      } else act.textContent = T('EQUIPAR');
    } else if (it.excl) {
      act.textContent = '🔒 ' + T('SÓ NA RANQUEADA');
      act.disabled = true;
      act.className = 'btn big';
    } else {
      const p = CO.price(it);
      act.innerHTML = `${T('COMPRAR')} · ${p.k === 'c' ? '🪙' : '💎'} ${fmt(p.v)}`;
    }
  }

  function select(id) {
    ui.sel = id;
    const it = getItem(id);
    if (it && it.char) ui.char = it.char;
    if (it && it.cat === 'skin') RR.sprites.preload(RR.chars[it.char].sprite);
    renderInfo();
    $('#shopGrid').querySelectorAll('.scard').forEach((c) => c.classList.toggle('sel', c.dataset.id === id));
  }

  function refresh() {
    wallet();
    renderTabs();
    renderGrid();
    renderInfo();
    $('#shopMode').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === ui.mode));
  }

  // desenho da vitrine (chamado a cada quadro enquanto a loja está aberta)
  S.tick = function () {
    if (!RR.ui || RR.ui.current() !== 'shop') return;
    const cv = $('#shopCv');
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const now = performance.now();
    const steps = Math.min(4, Math.max(1, Math.round((now - (pv.last || now - 16)) / 16.67)));
    pv.last = now;
    const it = pv.item;
    ctx.clearRect(0, 0, W, H);
    if (!it) return;
    for (let s = 0; s < steps; s++) {
      pv.t++;
      pv.g.frame++;
      stepFx(it);
    }
    const charId = it.char || ui.char || RR.ui.cfgChar();
    const d = it.cat === 'skin' ? CO.withSkin(RR.chars[charId], it.orig ? null : it.id) : CO.def(charId);
    // lutador: 'show' (golpe) de tempos em tempos nas skins, 'win' na comemoração, parado no resto
    const loop = it.cat === 'win' ? 200 : 240;
    const tl = pv.t % loop;
    let frame;
    if (it.cat === 'win') frame = RR.sprites.anim(d, 'win', tl);
    else if (it.cat === 'skin' && tl > 150 && tl < 200) frame = RR.sprites.anim(d, 'show', pv.t, (tl - 150) / 50);
    else frame = RR.sprites.anim(d, 'idle', pv.t);
    const s = (H * (it.cat === 'ko' ? 0.3 : it.cat === 'win' ? 0.4 : 0.5)) / d.h;
    ctx.save();
    ctx.translate(W / 2, H * 0.92);
    ctx.scale(s, s);
    if (it.cat !== 'ko') RR.art.drawModel(ctx, d, { frame, sx: 1, sy: 1 }, pv.t);
    for (const p of pv.g.fx) CO.drawP(ctx, p);
    if (it.cat === 'emote') {
      const f = { x: 0, y: 0, h: d.h, alive: true, state: 'idle', pcolor: '#ffd166', emote: { id: it.id, t: Math.min(60, tl % 130) } };
      CO.drawEmotes(ctx, { fighters: [f] });
    }
    ctx.restore();
    if (it.cat === 'ko' && it.id === 'ko_classic' && pv.t % 120 < 20) {
      // clarão padrão
      ctx.fillStyle = `rgba(255,255,255,${(1 - (pv.t % 120) / 20) * 0.4})`;
      ctx.fillRect(0, 0, W, H);
    }
  };
  function stepFx(it) {
    const g = pv.g;
    for (const p of g.fx) {
      p.life--;
      CO.update(p);
    }
    g.fx = g.fx.filter((p) => p.life > 0);
    const d = RR.chars[it.char || ui.char || RR.ui.cfgChar()];
    if (it.cat === 'win') {
      const t = pv.t % 200;
      if (t < 160) CO.winFx(g, it.id, t, 0, 0, d.h);
    } else if (it.cat === 'ko' && pv.t % 120 === 1) CO.koFx(g, it.id, 0, -d.h * 1.5);
  }

  // ---------------- Ações ----------------
  function pop(title, html, btns) {
    $('#spTitle').textContent = title;
    $('#spBody').innerHTML = html;
    const row = $('#spBtns');
    row.innerHTML = '';
    for (const [label, cls, fn] of btns) {
      const b = document.createElement('button');
      b.className = 'btn ' + (cls || '');
      b.textContent = label;
      b.addEventListener('click', () => {
        RR.audio.play('click');
        $('#shopPop').classList.add('hidden');
        fn && fn();
      });
      row.appendChild(b);
    }
    $('#shopPop').classList.remove('hidden');
  }

  function act() {
    const it = getItem(ui.sel);
    if (!it) return;
    RR.audio.play('click');
    if (owned(it)) {
      if (it.orig) CO.unequipSkin(it.char);
      else CO.equip(it.id);
      if (it.cat === 'skin') RR.ui.refreshSkins && RR.ui.refreshSkins();
      refresh();
      return;
    }
    if (it.excl) return;
    const p = CO.price(it);
    const cur = p.k === 'c' ? '🪙' : '💎';
    const have = p.k === 'c' ? RR.progress.coins() : RR.progress.gems();
    if (have < p.v) {
      const msg = p.k === 'c'
        ? T('Faltam {n} moedas. Ganhe jogando: vitórias, nocautes, missões e subir de nível.').replace('{n}', fmt(p.v - have))
        : T('Faltam {n} gemas. Ganhe +20 a cada 5 níveis e nos prêmios da Ranqueada.').replace('{n}', fmt(p.v - have));
      return pop(T('SALDO INSUFICIENTE'), `<p>${msg}</p>`, [[T('OK'), 'primary']]);
    }
    pop(T('COMPRAR?'), `<p><b>${esc(CO.name(it))}</b></p><p class="nt-rw">${cur} ${fmt(p.v)}</p>`, [
      [T('COMPRAR'), 'primary', () => {
        if (CO.buy(it.id)) return;
        RR.audio.play('ult');
        CO.equip(it.id);
        if (it.cat === 'skin') RR.ui.refreshSkins && RR.ui.refreshSkins();
        refresh();
        RR.platform && RR.platform.happy && RR.platform.happy();
      }],
      [T('CANCELAR'), ''],
    ]);
  }

  function build() {
    if (built) return;
    built = true;
    const mode = $('#shopMode');
    for (const [v, label] of [['shop', '🛒 ' + T('LOJA')], ['mine', '🎒 ' + T('MEUS ITENS')]]) {
      const b = document.createElement('button');
      b.textContent = label;
      b.dataset.v = v;
      b.addEventListener('click', () => {
        RR.audio.play('click');
        ui.mode = v;
        if (v === 'mine' && (ui.tab === 'offers' || ui.tab === 'gems')) ui.tab = 'skin';
        const first = ui.tab !== 'gems' && itemsOf(ui.tab)[0];
        if (!getItem(ui.sel) || (v === 'mine' && !owned(getItem(ui.sel)))) ui.sel = first ? first.id : null;
        refresh();
      });
      mode.appendChild(b);
    }
    $('#shopTabs').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tab]');
      if (!b) return;
      RR.audio.play('click');
      ui.tab = b.dataset.tab;
      const L = ui.tab === 'gems' ? [] : itemsOf(ui.tab);
      // nas skins, abre no lutador que estava em foco
      const pref = ui.tab === 'skin' && L.find((it) => it.char === (ui.char || RR.ui.cfgChar()) && !it.orig);
      ui.sel = pref ? pref.id : L[0] ? L[0].id : null;
      ui.scrollSel = true;
      refresh();
    });
    $('#shopGrid').addEventListener('click', (e) => {
      const c = e.target.closest('.scard[data-id]');
      if (!c) return;
      RR.audio.play('click');
      select(c.dataset.id);
    });
    $('#shopAct').addEventListener('click', act);
  }

  // abre a loja; opts: { tab, char, mode }
  S.open = function (opts) {
    opts = opts || {};
    build();
    ui.mode = opts.mode || 'shop';
    ui.tab = opts.tab || (ui.mode === 'shop' ? 'offers' : 'skin');
    ui.char = opts.char || RR.ui.cfgChar();
    const L = ui.tab === 'gems' ? [] : itemsOf(ui.tab);
    const pref = opts.char && L.find((it) => it.char === opts.char && !it.orig);
    ui.sel = pref ? pref.id : L[0] ? L[0].id : null;
    ui.scrollSel = true;
    RR.ui.show('shop');
    refresh();
    // presente de abertura da loja (uma vez)
    if (!U.store.get('shopGift', false)) {
      U.store.set('shopGift', true);
      RR.progress.addCurrency(500, 50);
      wallet();
      pop(T('PRESENTE!'), `<div class="nt-big">🎁</div><p>${T('A loja abriu! Um presente para você começar:')}</p><p class="nt-rw">+500 🪙 &nbsp; +50 💎</p>`, [[T('OBA!'), 'primary']]);
    }
  };
  S.isPopOpen = () => !$('#shopPop').classList.contains('hidden');
  S.closePop = () => $('#shopPop').classList.add('hidden');
})(window.RR);
