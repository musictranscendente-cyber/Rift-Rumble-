// Itens de personalização (só visual, ninguém fica mais forte): skins dos lutadores, comemoração de vitória,
// efeito de nocaute, emotes na luta e perfil do ranking (ícone, moldura e título).
// Catálogo, o que o jogador tem e usa, compra com moedas/gemas e os efeitos de código (vitória, KO, balão do emote).
(function (RR) {
  const U = RR.U;
  const CO = (RR.cosmetics = {});
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // price: { c: moedas } ou { g: gemas }; free: já vem com o jogo; excl: só ganhando (não está à venda)
  // Skins de exemplo: recolorem os quadros (filter). Quando chegarem os vídeos, a skin ganha dir: 'pasta' com os quadros próprios.
  const ITEMS = [
    // ---------- skins ----------
    { id: 'sk_solkar_eclipse', cat: 'skin', char: 'solkar', name: 'Eclipse', rar: 'rara', price: { g: 300 },
      filter: 'hue-rotate(235deg) saturate(1.3) brightness(0.85) contrast(1.2)', fx: '#b77bff',
      desc: 'Sol apagado: chamas roxas e armadura escura.', en_desc: 'A burnt-out sun: purple flames and dark armor.' },
    { id: 'sk_lunara_coral', cat: 'skin', char: 'lunara', name: 'Abismo Coral', en: 'Coral Abyss', rar: 'comum', price: { c: 1500 },
      filter: 'hue-rotate(120deg) saturate(1.35) brightness(1.05)', fx: '#ff7ad9',
      desc: 'Corais rosa e brilho do fundo do mar.', en_desc: 'Pink corals and deep-sea glow.' },
    { id: 'sk_bront_lava', cat: 'skin', char: 'bront', name: 'Coração de Lava', en: 'Lava Heart', rar: 'rara', price: { g: 300 },
      filter: 'sepia(0.75) saturate(2.8) hue-rotate(-28deg) contrast(1.2) brightness(0.95)', fx: '#ff7a1a',
      desc: 'Rocha vulcânica com magma nas rachaduras.', en_desc: 'Volcanic rock with magma in the cracks.' },
    { id: 'sk_astrael_gelo', cat: 'skin', char: 'astrael', name: 'Caçador do Gelo', en: 'Frost Hunter', rar: 'comum', price: { c: 1500 },
      filter: 'grayscale(0.55) sepia(0.25) hue-rotate(165deg) saturate(1.7) brightness(1.18)', fx: '#bff4ff',
      desc: 'Armadura branca e flechas de cristal de gelo.', en_desc: 'White armor and ice-crystal arrows.' },
    { id: 'sk_noxara_neon', cat: 'skin', char: 'noxara', name: 'Neon Cyber', rar: 'epica', price: { g: 600 },
      filter: 'hue-rotate(165deg) saturate(2) contrast(1.25) brightness(1.05)', fx: '#b6ff3b',
      desc: 'Visual futurista com linhas de neon verde.', en_desc: 'Futuristic look with neon green lines.' },
    { id: 'sk_vex_ouro', cat: 'skin', char: 'vex', name: 'Gêmeos de Ouro', en: 'Golden Twins', rar: 'rara', price: { g: 300 },
      filter: 'sepia(0.85) saturate(2.4) hue-rotate(-5deg) brightness(1.12) contrast(1.1)', fx: '#ffd166',
      desc: 'Luz e sombra banhadas em ouro.', en_desc: 'Light and shadow bathed in gold.' },

    // ---------- comemoração de vitória ----------
    { id: 'win_classic', cat: 'win', name: 'Clássica', en: 'Classic', rar: 'comum', free: true, desc: 'A pose de vitória do lutador.', en_desc: "The fighter's victory pose." },
    { id: 'win_confetti', cat: 'win', name: 'Chuva de Confete', en: 'Confetti Rain', rar: 'comum', price: { c: 800 }, desc: 'Confete colorido caindo do céu.', en_desc: 'Colorful confetti falling from the sky.' },
    { id: 'win_fire', cat: 'win', name: 'Anel de Fogo', en: 'Ring of Fire', rar: 'rara', price: { c: 1600 }, desc: 'Chamas girando em volta do vencedor.', en_desc: 'Flames spinning around the winner.' },
    { id: 'win_stars', cat: 'win', name: 'Coroa de Estrelas', en: 'Star Crown', rar: 'rara', price: { g: 120 }, desc: 'Estrelas formam uma coroa na cabeça.', en_desc: 'Stars form a crown over your head.' },
    { id: 'win_storm', cat: 'win', name: 'Tempestade', en: 'Thunderstorm', rar: 'epica', price: { g: 220 }, desc: 'Raios caem em volta do vencedor.', en_desc: 'Lightning strikes around the winner.' },

    // ---------- efeito de nocaute ----------
    { id: 'ko_classic', cat: 'ko', name: 'Clássico', en: 'Classic', rar: 'comum', free: true, desc: 'O clarão padrão do nocaute.', en_desc: 'The standard knockout flash.' },
    { id: 'ko_stars', cat: 'ko', name: 'Explosão de Estrelas', en: 'Star Burst', rar: 'comum', price: { c: 700 }, desc: 'O derrubado vira uma chuva de estrelas.', en_desc: 'The knocked-out foe bursts into stars.' },
    { id: 'ko_petals', cat: 'ko', name: 'Pétalas', en: 'Petals', rar: 'comum', price: { c: 900 }, desc: 'Uma nuvem de pétalas de cerejeira.', en_desc: 'A cloud of cherry blossom petals.' },
    { id: 'ko_fireworks', cat: 'ko', name: 'Fogos de Artifício', en: 'Fireworks', rar: 'rara', price: { c: 1400 }, desc: 'Três explosões coloridas de fogos.', en_desc: 'Three colorful firework bursts.' },
    { id: 'ko_bolt', cat: 'ko', name: 'Relâmpago', en: 'Lightning', rar: 'rara', price: { g: 150 }, desc: 'Raios atingem o ponto do nocaute.', en_desc: 'Lightning strikes the knockout spot.' },
    { id: 'ko_void', cat: 'ko', name: 'Buraco Negro', en: 'Black Hole', rar: 'epica', price: { g: 250 }, desc: 'Um buraco negro engole tudo.', en_desc: 'A black hole swallows everything.' },

    // ---------- emotes ----------
    { id: 'em_wave', cat: 'emote', name: 'Tchau!', en: 'Bye!', e: '👋', rar: 'comum', free: true },
    { id: 'em_laugh', cat: 'emote', name: 'Risada', en: 'Laugh', e: '😂', rar: 'comum', free: true },
    { id: 'em_gg', cat: 'emote', name: 'GG', e: '🤝', txt: 'GG', rar: 'comum', price: { c: 300 } },
    { id: 'em_fire', cat: 'emote', name: 'Pegando fogo', en: 'On fire', e: '🔥', rar: 'comum', price: { c: 300 } },
    { id: 'em_sleep', cat: 'emote', name: 'Sono', en: 'Sleepy', e: '😴', rar: 'comum', price: { c: 400 } },
    { id: 'em_cool', cat: 'emote', name: 'Estiloso', en: 'Cool', e: '😎', rar: 'comum', price: { c: 400 } },
    { id: 'em_flex', cat: 'emote', name: 'Força', en: 'Flex', e: '💪', rar: 'comum', price: { c: 500 } },
    { id: 'em_clown', cat: 'emote', name: 'Palhaço', en: 'Clown', e: '🤡', rar: 'rara', price: { g: 60 } },
    { id: 'em_crown', cat: 'emote', name: 'Sou o rei', en: "I'm the king", e: '👑', rar: 'rara', price: { g: 90 } },

    // ---------- perfil: ícones (rostos dos lutadores são grátis) ----------
    ...['solkar', 'lunara', 'bront', 'astrael', 'noxara', 'vex'].map((c) => ({ id: 'ic_' + c, cat: 'icon', face: c, rar: 'comum', free: true })),
    { id: 'ic_bolt', cat: 'icon', name: 'Raio', en: 'Bolt', e: '⚡', rar: 'comum', price: { c: 400 } },
    { id: 'ic_skull', cat: 'icon', name: 'Caveira', en: 'Skull', e: '💀', rar: 'comum', price: { c: 500 } },
    { id: 'ic_galaxy', cat: 'icon', name: 'Galáxia', en: 'Galaxy', e: '🌌', rar: 'comum', price: { c: 700 } },
    { id: 'ic_dragon', cat: 'icon', name: 'Dragão', en: 'Dragon', e: '🐉', rar: 'rara', price: { g: 80 } },
    { id: 'ic_crown', cat: 'icon', name: 'Coroa', en: 'Crown', e: '👑', rar: 'epica', price: { g: 150 } },

    // ---------- perfil: molduras ----------
    { id: 'fr_basic', cat: 'frame', name: 'Simples', en: 'Basic', rar: 'comum', free: true },
    { id: 'fr_silver', cat: 'frame', name: 'Prata', en: 'Silver', rar: 'comum', price: { c: 600 } },
    { id: 'fr_gold', cat: 'frame', name: 'Ouro', en: 'Gold', rar: 'rara', price: { c: 1800 } },
    { id: 'fr_neon', cat: 'frame', name: 'Neon', rar: 'rara', price: { g: 150 } },
    { id: 'fr_rainbow', cat: 'frame', name: 'Arco-íris', en: 'Rainbow', rar: 'epica', price: { g: 300 } },
    { id: 'fr_legend', cat: 'frame', name: 'Lenda do Zodíaco', en: 'Zodiac Legend', rar: 'exclusiva', excl: 'legend',
      desc: 'Só para quem chega à liga Lenda do Zodíaco na Ranqueada.', en_desc: 'Only for players who reach the Zodiac Legend league in Ranked.' },

    // ---------- perfil: títulos ----------
    { id: 'ti_rookie', cat: 'title', name: 'Novato', en: 'Rookie', rar: 'comum', free: true },
    { id: 'ti_brawler', cat: 'title', name: 'Brigão', en: 'Brawler', rar: 'comum', price: { c: 500 } },
    { id: 'ti_unstop', cat: 'title', name: 'Imparável', en: 'Unstoppable', rar: 'comum', price: { c: 900 } },
    { id: 'ti_storm', cat: 'title', name: 'Tempestade Viva', en: 'Living Storm', rar: 'rara', price: { c: 1500 } },
    { id: 'ti_king', cat: 'title', name: 'Rei do Zodíaco', en: 'Zodiac King', rar: 'epica', price: { g: 250 } },
    { id: 'ti_top10', cat: 'title', name: 'Top 10', rar: 'exclusiva', excl: 'top10',
      desc: 'Só para quem termina uma temporada no Top 10.', en_desc: 'Only for players who finish a season in the Top 10.' },
    { id: 'ti_legend', cat: 'title', name: 'Lenda Viva', en: 'Living Legend', rar: 'exclusiva', excl: 'legend',
      desc: 'Só para quem chega à liga Lenda do Zodíaco.', en_desc: 'Only for players who reach the Zodiac Legend league.' },
  ];
  const BY = {};
  for (const it of ITEMS) BY[it.id] = it;
  CO.items = ITEMS;
  CO.get = (id) => BY[id];
  CO.CATS = ['skin', 'win', 'ko', 'emote', 'icon', 'frame', 'title'];
  CO.RARITY = { comum: '#9fb3c8', rara: '#4dabff', epica: '#c77dff', exclusiva: '#ffd166' };

  const T = (s) => (RR.t ? RR.t(s) : s);
  CO.name = (it) => {
    if (!it) return '';
    if (it.face) return RR.chars[it.face] ? RR.chars[it.face].name : it.face;
    return RR.lang === 'en' && it.en ? it.en : it.name;
  };
  CO.desc = (it) => (RR.lang === 'en' ? it.en_desc || '' : it.desc || '');
  CO.rarName = (r) => T({ comum: 'Comum', rara: 'Rara', epica: 'Épica', exclusiva: 'Exclusiva' }[r] || r);

  // ---------------- Estado: o que tem e o que está usando ----------------
  const DEF_EQ = { skin: {}, win: 'win_classic', ko: 'ko_classic', em: ['em_wave', 'em_laugh', null, null], icon: 'ic_solkar', frame: 'fr_basic', title: 'ti_rookie' };
  let st = null;
  const save = () => U.store.set('cos', st);
  CO.load = function () {
    const s = U.store.get('cos', {}) || {};
    st = { own: Object.assign({}, s.own), eq: Object.assign({}, DEF_EQ, s.eq) };
    st.eq.skin = Object.assign({}, st.eq.skin);
    st.eq.em = (Array.isArray(st.eq.em) ? st.eq.em : DEF_EQ.em).slice(0, 4);
    while (st.eq.em.length < 4) st.eq.em.push(null);
    // item que saiu do catálogo ou deixou de ser seu volta ao padrão
    for (const k of ['win', 'ko', 'icon', 'frame', 'title']) if (!CO.owns(st.eq[k]) || BY[st.eq[k]].cat !== k) st.eq[k] = DEF_EQ[k];
    for (const c of Object.keys(st.eq.skin)) if (!CO.owns(st.eq.skin[c])) delete st.eq.skin[c];
    st.eq.em = st.eq.em.map((e) => (e && CO.owns(e) ? e : null));
  };
  CO.owns = (id) => !!(id && BY[id] && (BY[id].free || (st && st.own[id])));
  CO.eq = () => st.eq;
  CO.grant = function (id) {
    if (!BY[id] || CO.owns(id)) return false;
    st.own[id] = Date.now();
    save();
    return true;
  };

  // ---------------- Ofertas do dia (mesmas para todos no dia, 25% de desconto) ----------------
  function dayKey(d) {
    const t = d || new Date();
    return t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
  }
  CO.offers = function (d) {
    let s = dayKey(d);
    const r = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
    const pool = ITEMS.filter((it) => it.price);
    const out = [];
    // sempre uma skin entre as ofertas
    const skins = pool.filter((it) => it.cat === 'skin');
    out.push(skins[Math.floor(r() * skins.length)]);
    while (out.length < 3) {
      const it = pool[Math.floor(r() * pool.length)];
      if (!out.includes(it)) out.push(it);
    }
    return out.map((it) => it.id);
  };
  CO.price = function (it, d) {
    if (!it.price) return null;
    const off = CO.offers(d).includes(it.id);
    const k = it.price.c != null ? 'c' : 'g';
    const v = off ? Math.round((it.price[k] * 0.75) / 10) * 10 : it.price[k];
    return { k, v, full: it.price[k], off };
  };

  // compra: devolve '' se deu certo ou o motivo
  CO.buy = function (id) {
    const it = BY[id];
    if (!it) return 'item';
    if (CO.owns(id)) return 'owned';
    if (it.excl || !it.price) return 'excl';
    const p = CO.price(it);
    const P = RR.progress;
    if (!P.spend(p.k === 'c' ? p.v : 0, p.k === 'g' ? p.v : 0)) return 'funds';
    st.own[id] = Date.now();
    save();
    return '';
  };

  CO.equip = function (id, slot) {
    const it = BY[id];
    if (!it || !CO.owns(id)) return;
    if (it.cat === 'skin') st.eq.skin[it.char] = id;
    else if (it.cat === 'emote') {
      const i = st.eq.em.indexOf(id);
      if (i >= 0) st.eq.em[i] = null; // tocar de novo tira
      else {
        const free = slot != null ? slot : st.eq.em.indexOf(null);
        st.eq.em[free >= 0 ? free : 3] = id;
      }
    } else st.eq[it.cat] = id;
    save();
    RR.rank && RR.rank.cosmChanged && RR.rank.cosmChanged();
  };
  CO.unequipSkin = function (charId) {
    delete st.eq.skin[charId];
    save();
  };
  CO.equipped = function (id) {
    const it = BY[id];
    if (!it || !st) return false;
    if (it.cat === 'skin') return st.eq.skin[it.char] === id;
    if (it.cat === 'emote') return st.eq.em.includes(id);
    return st.eq[it.cat] === id;
  };

  // lutador com a skin aplicada (sem skin: o próprio)
  CO.withSkin = function (def, skinId) {
    const sk = skinId && BY[skinId];
    if (!sk || sk.char !== def.id) return def;
    return Object.assign({}, def, { skin: sk, fxColor: sk.fx || def.fxColor });
  };
  CO.def = (charId) => CO.withSkin(RR.chars[charId], st && st.eq.skin[charId]);

  // visual de quem entra na luta: o jogador usa o seu; bots às vezes aparecem com itens (vitrine da loja)
  CO.forFighter = function (charId, human, demo) {
    if (human && st) return { skin: st.eq.skin[charId] || null, win: st.eq.win, ko: st.eq.ko, em: st.eq.em.filter(Boolean) };
    const pick = (cat, p) => {
      if (Math.random() > p) return null;
      const L = ITEMS.filter((it) => it.cat === cat && !it.free && !it.excl && (cat !== 'skin' || it.char === charId));
      return L.length ? U.pick(L).id : null;
    };
    return { skin: pick('skin', demo ? 0.45 : 0.25), win: pick('win', 0.5), ko: pick('ko', 0.5), em: ['em_wave', 'em_laugh', pick('emote', 1)].filter(Boolean) };
  };

  // ---------------- Perfil (ranking) ----------------
  // guardado na nuvem como texto curto "icone.moldura.titulo"
  CO.profile = () => ({ icon: st.eq.icon, frame: st.eq.frame, title: st.eq.title });
  CO.profileStr = () => [st.eq.icon, st.eq.frame, st.eq.title].join('.');
  CO.parseProfile = function (s, fav) {
    const [icon, frame, title] = String(s || '').split('.');
    return {
      icon: BY[icon] && BY[icon].cat === 'icon' ? icon : 'ic_' + (fav || 'solkar'),
      frame: BY[frame] && BY[frame].cat === 'frame' ? frame : 'fr_basic',
      title: BY[title] && BY[title].cat === 'title' ? title : null,
    };
  };
  // jogadores simulados: visual fixo pelo nome (os do topo com itens melhores)
  CO.botProfile = function (name, fav, pos) {
    let h = 2166136261;
    for (const ch of String(name)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    // mulberry32: sorteio estável a partir do nome
    const r = (n) => {
      h = (h + 0x6d2b79f5) >>> 0;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * n | 0;
    };
    const top = pos <= 3 ? 3 : pos <= 15 ? 2 : pos <= 50 ? 1 : 0;
    const frames = [['fr_basic', 'fr_basic', 'fr_silver'], ['fr_silver', 'fr_basic', 'fr_gold'], ['fr_gold', 'fr_neon', 'fr_silver'], ['fr_legend', 'fr_rainbow', 'fr_gold']][top];
    const titles = [[null, null, null, 'ti_rookie', 'ti_brawler'], [null, 'ti_brawler', 'ti_unstop'], ['ti_unstop', 'ti_storm', null], ['ti_legend', 'ti_king', 'ti_storm']][top];
    const icons = ['ic_' + fav, 'ic_' + fav, 'ic_' + fav, 'ic_bolt', 'ic_skull', 'ic_galaxy', 'ic_dragon'];
    return { icon: icons[r(top >= 2 ? icons.length : 4)], frame: frames[r(frames.length)], title: titles[r(titles.length)] };
  };

  // HTML do ícone com moldura (ranking e loja)
  CO.avatarHTML = function (pr, cls) {
    const ic = BY[pr.icon] || BY.ic_solkar;
    const inner = ic.face ? `<img src="img/${ic.face}/face.webp" alt="">` : `<span class="emo">${ic.e}</span>`;
    return `<span class="av ${pr.frame || 'fr_basic'}${cls ? ' ' + cls : ''}">${inner}</span>`;
  };
  CO.titleText = (id) => (id && BY[id] ? CO.name(BY[id]) : '');

  // prêmios exclusivos da Ranqueada (chamado pelo ranked)
  CO.checkRank = function (rk) {
    const got = [];
    if (rk && rk.maxLeague >= 5) for (const id of ['fr_legend', 'ti_legend']) if (CO.grant(id)) got.push(id);
    if (rk && rk.trophies > 0 && CO.grant('ti_top10')) got.push('ti_top10');
    return got;
  };

  // ---------------- Efeitos de código (vitória e nocaute) ----------------
  // partículas no mesmo sistema de efeitos da luta (type 'c'); a vitrine da loja usa a mesma coisa num canvas
  function add(g, o) {
    if (g.fx.length >= 440) return null;
    o.type = 'c';
    o.max = o.life;
    g.fx.push(o);
    return o;
  }
  const HUES = ['#ff4d6d', '#ffd166', '#4dabff', '#7cff6b', '#c77dff', '#ff9f43', '#ffffff'];

  function starBurst(g, x, y, n, sp, cols) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), v = rnd(sp * 0.4, sp);
      add(g, { k: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.93, g: 0.08, size: rnd(7, 15), col: U.pick(cols), rot: rnd(0, TAU), vr: rnd(-0.2, 0.2), life: rnd(30, 48) });
    }
  }
  function sparkBurst(g, x, y, n, sp, col, delay) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd(-0.1, 0.1), v = rnd(sp * 0.75, sp);
      add(g, { k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.94, g: 0.12, size: rnd(3, 5), col, life: rnd(30, 42), delay });
    }
    add(g, { k: 'ring', x, y, r: sp * 9, col, life: 16, delay });
  }
  function bolt(g, x, y, h, col, delay) {
    const pts = [];
    const n = 9;
    for (let i = 0; i <= n; i++) pts.push([x + (i === 0 || i === n ? 0 : rnd(-26, 26)), y - h + (h * i) / n]);
    add(g, { k: 'bolt', x, y, pts, col: col || '#bfe6ff', life: 18, delay });
    add(g, { k: 'ring', x, y, r: 70, col: '#ffffff', life: 14, delay });
  }

  const KO = {
    // só para a vitrine da loja: lembra o clarão padrão
    ko_classic(g, x, y) {
      if (!g.preview) return;
      add(g, { k: 'ring', x, y, r: 150, col: '#ffffff', life: 20 });
      for (let i = 0; i < 16; i++) {
        const a = rnd(0, TAU), v = rnd(5, 12);
        add(g, { k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.9, size: rnd(2, 4), col: '#fff3b0', life: rnd(14, 22) });
      }
    },
    ko_stars(g, x, y) {
      starBurst(g, x, y, 30, 13, ['#ffd166', '#ffffff', '#fff3b0']);
      add(g, { k: 'ring', x, y, r: 140, col: '#ffd166', life: 18 });
    },
    ko_petals(g, x, y) {
      for (let i = 0; i < 42; i++) {
        const a = rnd(0, TAU), v = rnd(2, 11);
        add(g, { k: 'petal', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, drag: 0.95, g: 0.05, size: rnd(7, 12), col: U.pick(['#ffb7d5', '#ff8fc0', '#ffffff', '#ffd1e6']), rot: rnd(0, TAU), vr: rnd(-0.15, 0.15), sway: rnd(0, TAU), life: rnd(50, 75) });
      }
    },
    ko_fireworks(g, x, y) {
      for (let i = 0; i < 3; i++) sparkBurst(g, x + rnd(-110, 110), y + rnd(-90, 40), 26, rnd(9, 13), U.pick(HUES.slice(0, 6)), i * 9);
    },
    ko_bolt(g, x, y) {
      for (let i = 0; i < 3; i++) bolt(g, x + rnd(-60, 60), y + rnd(-20, 20), 520, i % 2 ? '#ffe66d' : '#bfe6ff', i * 5);
      for (let i = 0; i < 18; i++) {
        const a = rnd(0, TAU), v = rnd(4, 12);
        add(g, { k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.9, size: rnd(2, 4), col: '#d8f3ff', life: rnd(16, 26) });
      }
    },
    ko_void(g, x, y) {
      add(g, { k: 'void', x, y, r: 120, life: 70 });
      for (let i = 0; i < 36; i++) {
        const a = rnd(0, TAU), r = rnd(120, 260);
        add(g, { k: 'spark', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: -Math.cos(a) * r * 0.045, vy: -Math.sin(a) * r * 0.045, drag: 1, size: rnd(2.5, 5), col: U.pick(['#c77dff', '#7b2cff', '#ffffff']), life: 22, delay: Math.floor(rnd(0, 30)) });
      }
    },
  };
  // nocaute: (x, y) é o ponto da saída da arena; o efeito aparece um pouco para dentro, onde a câmera vê
  CO.koFx = function (g, id, x, y) {
    const fn = KO[id];
    if (fn) fn(g, x, y);
  };

  // vitória: chamado a cada quadro da cena de vitória (t = 0, 1, 2...) com os pés do vencedor em (x, y) e altura h
  const WIN = {
    win_confetti(g, t, x, y, h) {
      if (t % 2) return;
      for (let i = 0; i < 3; i++)
        add(g, { k: 'conf', x: x + rnd(-330, 330), y: y - h * 2.6 - rnd(0, 120), vx: rnd(-1.5, 1.5), vy: rnd(2, 4), g: 0.03, drag: 0.995, size: rnd(6, 10), col: U.pick(HUES), rot: rnd(0, TAU), vr: rnd(-0.25, 0.25), life: 130 });
    },
    win_fire(g, t, x, y, h) {
      if (t === 0) add(g, { k: 'ring', x, y: y - h * 0.5, r: 180, col: '#ff9f43', life: 20 });
      if (t % 2) return;
      for (let i = 0; i < 2; i++) {
        const a = t * 0.11 + i * Math.PI;
        add(g, { k: 'flame', x: x + Math.cos(a) * h * 0.95, y: y - 8 + Math.sin(a) * h * 0.22, vx: 0, vy: rnd(-2.6, -1.4), drag: 0.97, size: rnd(16, 24), life: rnd(22, 30) });
      }
    },
    win_stars(g, t, x, y, h) {
      if (t === 0) starBurst(g, x, y - h * 0.6, 16, 9, ['#ffd166', '#ffffff']);
      if (t % 5) return;
      const a = t * 0.07;
      for (let i = 0; i < 5; i++) {
        const b = a + (i / 5) * TAU;
        add(g, { k: 'star', x: x + Math.cos(b) * h * 0.42, y: y - h * 1.18 + Math.sin(b) * h * 0.1, vx: 0, vy: 0, size: 10, col: i % 2 ? '#ffffff' : '#ffd166', rot: b, vr: 0.1, life: 10 });
      }
    },
    win_storm(g, t, x, y, h) {
      if (t % 16 === 0) bolt(g, x + U.pick([-1, 1]) * rnd(h * 0.6, h * 1.6), y, 560, t % 32 ? '#ffe66d' : '#bfe6ff', 0);
      if (t % 4 === 0) add(g, { k: 'spark', x: x + rnd(-h, h), y: y - rnd(0, h * 1.4), vx: rnd(-1, 1), vy: rnd(-2, 0), drag: 0.95, size: rnd(2, 3.5), col: '#bfe6ff', life: 20 });
    },
  };
  CO.winFx = function (g, id, t, x, y, h) {
    const fn = WIN[id];
    if (fn) fn(g, t, x, y, h);
  };

  CO.update = function (p) {
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
    if (p.k === 'petal') p.x += Math.sin((p.sway += 0.12)) * 0.8;
  };

  function star5(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  CO.drawP = function (ctx, p) {
    if (p.delay > 0) return;
    const k = p.life / p.max;
    ctx.save();
    switch (p.k) {
      case 'star':
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = p.col;
        ctx.shadowColor = p.col;
        ctx.shadowBlur = 10;
        star5(ctx, p.x, p.y, p.size, p.rot || 0);
        ctx.fill();
        break;
      case 'spark':
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.strokeStyle = p.col;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx || 0) * 2.2, p.y - (p.vy || 0) * 2.2);
        ctx.stroke();
        break;
      case 'ring':
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.col;
        ctx.lineWidth = 6 * k + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1.1 - k), 0, TAU);
        ctx.stroke();
        break;
      case 'conf':
        ctx.globalAlpha = Math.min(1, k * 3);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 * (0.4 + Math.abs(Math.sin(p.rot * 2))));
        break;
      case 'petal':
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, TAU);
        ctx.fill();
        break;
      case 'flame': {
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.globalCompositeOperation = 'lighter';
        const r = p.size * (0.5 + k * 0.6);
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        gr.addColorStop(0, '#fff3c4');
        gr.addColorStop(0.4, '#ffb000');
        gr.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();
        break;
      }
      case 'bolt':
        ctx.globalAlpha = k > 0.5 ? 1 : k * 2;
        ctx.strokeStyle = p.col;
        ctx.shadowColor = p.col;
        ctx.shadowBlur = 18;
        ctx.lineJoin = 'round';
        for (const [w, c] of [[9, p.col], [3.5, '#ffffff']]) {
          ctx.lineWidth = w;
          ctx.strokeStyle = c;
          ctx.beginPath();
          for (const [x, y] of p.pts) ctx.lineTo(x, y);
          ctx.stroke();
        }
        break;
      case 'void': {
        const grow = Math.min(1, (1 - k) * 5), shrink = Math.min(1, k * 4);
        const r = p.r * grow * shrink;
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 1.6);
        gr.addColorStop(0, '#000000');
        gr.addColorStop(0.55, '#0a0014');
        gr.addColorStop(0.7, '#7b2cff');
        gr.addColorStop(1, 'rgba(123,44,255,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.6, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#e0b3ff';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.75, (1 - k) * 12, (1 - k) * 12 + 4.2);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  };

  // ---------------- Emotes na luta ----------------
  // balão em cima do lutador por ~2 s; cada lutador espera 3 s para mandar outro
  CO.emote = function (g, f, id) {
    const it = BY[id];
    if (!it || it.cat !== 'emote' || (f.emoteCd || 0) > g.frame) return false;
    f.emote = { id, t: 0 };
    f.emoteCd = g.frame + 180;
    RR.audio && RR.audio.play && RR.audio.play('click');
    return true;
  };
  CO.stepEmotes = function (g) {
    for (const f of g.fighters) if (f.emote && ++f.emote.t > 130) f.emote = null;
  };
  CO.drawEmotes = function (ctx, g) {
    for (const f of g.fighters) {
      const e = f.emote;
      if (!e || !f.alive || f.state === 'dead' || f.state === 'out') continue;
      const it = BY[e.id];
      const pop = e.t < 8 ? 0.5 + (e.t / 8) * 0.6 : e.t < 12 ? 1.1 - ((e.t - 8) / 4) * 0.1 : 1;
      const a = e.t > 115 ? (130 - e.t) / 15 : 1;
      const x = f.x, y = f.y - f.h - 74;
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.translate(x, y);
      ctx.scale(pop, pop);
      const w = it.txt ? 92 : 66, h = 58;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeStyle = f.pcolor || '#fff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-w / 2, -h / 2, w, h, 18) : ctx.rect(-w / 2, -h / 2, w, h);
      ctx.moveTo(-8, h / 2);
      ctx.lineTo(0, h / 2 + 12);
      ctx.lineTo(8, h / 2);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (it.txt) {
        ctx.font = '900 30px system-ui, sans-serif';
        ctx.fillStyle = '#1d1440';
        ctx.fillText(it.txt, 0, 2);
      } else {
        ctx.font = '36px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.fillText(it.e, 0, 3);
      }
      ctx.restore();
    }
  };
  // bots provocam de vez em quando depois de derrubar alguém
  CO.botTaunt = function (g, f) {
    if (!f || f.isHuman || !f.cos || !f.cos.em || !f.cos.em.length || Math.random() > 0.45) return;
    f.tauntAt = g.frame + 40 + Math.floor(Math.random() * 40);
  };
  CO.stepBots = function (g) {
    for (const f of g.fighters) if (f.tauntAt && g.frame >= f.tauntAt) {
      f.tauntAt = 0;
      CO.emote(g, f, U.pick(f.cos.em));
    }
  };

  CO.load();
})(window.RR);
