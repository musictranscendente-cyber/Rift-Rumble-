// Ranqueada: regras puras (sem tela e sem internet). Pontos, ligas, temporadas, os 100 jogadores
// simulados, a "multidão" abaixo do Top 100 e a escolha do adversário. Testes: tools/rank-test.js
(function (root) {
  const K = {};

  // ---------------- Ligas ----------------
  // nome em inglês (padrão do jogo) e em português; o ícone é um emoji (aparece igual em todo aparelho)
  K.LEAGUES = [
    { min: 0, icon: '🌑', en: 'Stardust', pt: 'Poeira Estelar', color: '#9aa3b5' },
    { min: 300, icon: '☄️', en: 'Comet', pt: 'Cometa', color: '#7fd3ff' },
    { min: 700, icon: '🌙', en: 'Crescent Moon', pt: 'Lua Crescente', color: '#c9b8ff' },
    { min: 1200, icon: '☀️', en: 'Rising Sun', pt: 'Sol Nascente', color: '#ffb000' },
    { min: 1800, icon: '✨', en: 'Constellation', pt: 'Constelação', color: '#5dffd6' },
    { min: 2500, icon: '👑', en: 'Zodiac Legend', pt: 'Lenda do Zodíaco', color: '#ff5fd2' },
  ];
  K.leagueOf = (pts) => {
    let i = 0;
    while (i + 1 < K.LEAGUES.length && pts >= K.LEAGUES[i + 1].min) i++;
    return i;
  };

  // ---------------- Pontos por partida ----------------
  K.WIN = 20;
  K.LOSS = -12;
  K.DRAW = 3;
  K.STREAK_BONUS = 5; // a partir da 3ª vitória seguida
  K.UPSET_STEP = 20; // +1 a cada 20 pontos que o adversário tem a mais
  K.UPSET_MAX = 10;

  // result: 'win' | 'loss' | 'draw' (desistir ou abandonar conta como 'loss')
  // st: { points, maxLeague, streak, wins, losses } -> devolve { st: novo estado, delta, breakdown, leagueUp }
  K.applyResult = function (st, result, oppPoints) {
    const s = Object.assign({ points: 0, maxLeague: 0, streak: 0, wins: 0, losses: 0 }, st);
    const before = s.points;
    const br = {};
    if (result === 'win') {
      s.streak += 1;
      s.wins += 1;
      br.base = K.WIN;
      br.upset = Math.min(K.UPSET_MAX, Math.floor(Math.max(0, oppPoints - before) / K.UPSET_STEP));
      br.streak = s.streak >= 3 ? K.STREAK_BONUS : 0;
      s.points = before + br.base + br.upset + br.streak;
    } else if (result === 'draw') {
      br.base = K.DRAW;
      s.points = before + K.DRAW;
    } else {
      s.streak = 0;
      s.losses += 1;
      br.base = K.LOSS;
      // proteção de liga: nunca cai abaixo do piso da maior liga já alcançada na temporada
      const floor = K.LEAGUES[s.maxLeague].min;
      s.points = Math.max(floor, before + K.LOSS, 0);
      br.protected = before + K.LOSS < floor;
    }
    const lg = K.leagueOf(s.points);
    const leagueUp = lg > s.maxLeague;
    if (leagueUp) s.maxLeague = lg;
    return { st: s, delta: s.points - before, breakdown: br, leagueUp, league: lg };
  };

  // ---------------- Temporadas (uma por mês, em UTC) ----------------
  // temporada 1 = novembro de 2026; o número sobe a cada mês
  K.FIRST = Date.UTC(2026, 10, 1);
  K.seasonOf = function (now) {
    const d = new Date(now);
    return (d.getUTCFullYear() - 2026) * 12 + d.getUTCMonth() - 10 + 1;
  };
  K.seasonStart = (n) => Date.UTC(2026, 10 + (n - 1), 1);
  K.seasonEnd = (n) => K.seasonStart(n + 1);
  K.daysLeft = (now) => Math.max(0, Math.ceil((K.seasonEnd(K.seasonOf(now)) - now) / 86400000));

  // prêmio pela maior liga alcançada (moedas do jogo; gemas nas ligas altas). Top 10 ganha troféu e bônus.
  K.REWARDS = [
    { coins: 50, gems: 0 },
    { coins: 120, gems: 0 },
    { coins: 250, gems: 0 },
    { coins: 400, gems: 5 },
    { coins: 600, gems: 10 },
    { coins: 1000, gems: 20 },
  ];
  K.TOP10_BONUS = { coins: 500, gems: 15 };

  // virada de temporada: pontos pela metade, prêmio pela maior liga, troféu se terminou no Top 10
  // st.season é a temporada antiga; finalPos = posição final calculada com K.positionAt(...)
  K.rollover = function (st, newSeason, finalPos) {
    const reward = Object.assign({}, K.REWARDS[st.maxLeague || 0]);
    const top10 = finalPos != null && finalPos <= 10;
    if (top10) {
      reward.coins += K.TOP10_BONUS.coins;
      reward.gems += K.TOP10_BONUS.gems;
    }
    const half = Math.floor((st.points || 0) / 2);
    const ns = {
      season: newSeason,
      points: half,
      prevPoints: st.points || 0,
      // a nova temporada começa com a proteção da liga dos pontos que sobraram
      maxLeague: K.leagueOf(half),
      streak: 0,
      wins: 0,
      losses: 0,
      trophies: (st.trophies || 0) + (top10 ? 1 : 0),
    };
    return { st: ns, reward, top10, finalPos, oldSeason: st.season, oldLeague: st.maxLeague || 0, oldPoints: st.points || 0 };
  };

  // ---------------- Números pseudoaleatórios fixos (mesmo resultado em todo aparelho) ----------------
  K.hash = function (str) {
    // FNV-1a 32 bits + mistura final
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;
    return (h >>> 0) / 4294967296; // 0..1
  };
  const rnd = (...parts) => K.hash(parts.join('|'));

  // ---------------- Os 100 jogadores simulados ----------------
  const CHARS = ['solkar', 'lunara', 'bront', 'astrael', 'noxara', 'vex'];
  K.BOT_NAMES = [
    'leo_flame', 'Kaiser77', 'luna.tide', 'xX_Sagitta_Xx', 'Brontosaurio', 'nox_shade', 'GeminiTwin', 'Rafa_RJ',
    'starfall.br', 'Mika93', 'TaurusRex', 'ScorpKing', 'sol.invicto', 'AquaMarina', 'zodiakz', 'Pedrin_GG',
    'ElCometa', 'NightArcher', 'ana.luz', 'Ryuu_88', 'FireMane', 'tide_breaker', 'Vexxy', 'lobo.lunar',
    'KingStone', 'astra_vibes', 'Juanito21', 'shadowpaw', 'GabiGamer', 'Orion.exe', 'CrabMaster', 'lukinhas_br',
    'Sunny_Days', 'yuki.storm', 'BullRush', 'Escorpia', 'twin.blade', 'ThiagoX', 'nova_star', 'MrRoar',
    'marina.ocean', 'DarkZodiac', 'kai_kenji', 'PixelLeo', 'Bia.Fight', 'Sagi_Hunter', 'ironhorn', 'venom.rose',
    'LuzESombra', 'joao_pro', 'Cosmo_Kid', 'Lua_Cheia', 'TheStoneWall', 'meteor99', 'Dani.Cancer', 'RiftWalker',
    'HugoBR', 'fenix_dourada', 'Toro_Loco', 'stingray', 'GeminiFox', 'Vini_Ace', 'eclipse.void', 'MarcoPolo_',
    'SolarFlare', 'cancer.crab', 'Taurino', 'Arqueiro_Z', 'Nyx.Noxa', 'luzia_gamer', 'KairosTime', 'brawl.queen',
    'LeoMessi_fan', 'deepwave', 'RockSolid', 'starshot', 'PoisonIvy_', 'DualSoul', 'Rafinha.13', 'Zenith',
    'tsuki_moon', 'Martelo', 'Sagittarius_BR', 'Scorpio88', 'yinyang', 'Caio.Rift', 'GoldenMane', 'mare_alta',
    'Pedra_Viva', 'cometa.azul', 'Venenosa', 'Twinkle', 'Felipe_PVP', 'OrbitZ', 'sol_poente', 'Crabby',
    'Granite', 'Hawkeye_', 'nox.night', 'Duo.Gemeos',
  ];
  // cada bot tem um personagem favorito (vem do nome quando o nome lembra um signo)
  const HINT = [['leo', 'solkar'], ['sol', 'solkar'], ['sun', 'solkar'], ['fire', 'solkar'], ['roar', 'solkar'], ['mane', 'solkar'],
    ['lua', 'lunara'], ['luna', 'lunara'], ['tide', 'lunara'], ['aqua', 'lunara'], ['crab', 'lunara'], ['cancer', 'lunara'], ['mar', 'lunara'], ['wave', 'lunara'], ['moon', 'lunara'], ['tsuki', 'lunara'],
    ['bront', 'bront'], ['taur', 'bront'], ['bull', 'bront'], ['toro', 'bront'], ['stone', 'bront'], ['rock', 'bront'], ['pedra', 'bront'], ['horn', 'bront'], ['granite', 'bront'], ['martelo', 'bront'],
    ['sagi', 'astrael'], ['arch', 'astrael'], ['arque', 'astrael'], ['star', 'astrael'], ['astra', 'astrael'], ['orion', 'astrael'], ['comet', 'astrael'], ['hawk', 'astrael'],
    ['scorp', 'noxara'], ['nox', 'noxara'], ['venom', 'noxara'], ['poison', 'noxara'], ['shade', 'noxara'], ['shadow', 'noxara'], ['venen', 'noxara'], ['escorp', 'noxara'], ['sting', 'noxara'], ['eclipse', 'noxara'],
    ['gemini', 'vex'], ['twin', 'vex'], ['vex', 'vex'], ['dual', 'vex'], ['duo', 'vex'], ['yin', 'vex'], ['luzesombra', 'vex']];
  K.BOTS = K.BOT_NAMES.map((name, i) => {
    const low = name.toLowerCase().replace(/[^a-z]/g, '');
    const h = HINT.find(([k]) => low.includes(k));
    return {
      id: 'bot' + i,
      name,
      fav: h ? h[1] : CHARS[Math.floor(rnd('fav', name) * CHARS.length)],
      talent: rnd('talent', name), // fixo
      pace: 0.55 + rnd('pace', name) * 1.1, // <1 sobe cedo, >1 sobe no fim
    };
  });

  // pontuação de cada bot num instante: calculada só a partir da data (sem servidor)
  K.TOP_TARGET = 2800;
  K.LAST_TARGET = 700;
  K.botScores = function (now) {
    const season = K.seasonOf(now);
    const t0 = K.seasonStart(season), t1 = K.seasonEnd(season);
    const f = Math.min(1, Math.max(0, (now - t0) / (t1 - t0)));
    const hour = Math.floor(now / 3600000), day = Math.floor(now / 86400000);
    // força da temporada: 60% talento fixo + 40% sorte da temporada -> define a colocação final
    const ranked = K.BOTS.map((b) => ({ b, power: b.talent * 0.6 + rnd('season', season, b.name) * 0.4 })).sort((a, c) => c.power - a.power);
    return ranked.map(({ b }, r) => {
      const target = K.TOP_TARGET - ((K.TOP_TARGET - K.LAST_TARGET) * r) / (K.BOTS.length - 1);
      const start = target * 0.5;
      const prog = Math.pow(f, b.pace);
      const noise = (rnd('h', hour, b.name) - 0.5) * 24 + (rnd('d', day, b.name) - 0.5) * 60;
      const points = Math.max(0, Math.round(start + (target - start) * prog + noise * Math.min(1, f * 20)));
      // troféus de temporadas passadas: os mais talentosos, alguns
      const trophies = b.talent > 0.85 ? 1 + Math.floor(rnd('tr', b.name) * 3) : b.talent > 0.7 && rnd('tr2', b.name) > 0.6 ? 1 : 0;
      return { id: b.id, name: b.name, fav: b.fav, points, trophies, league: K.leagueOf(points), bot: true };
    });
  };

  // ---------------- A multidão abaixo do Top 100 ----------------
  K.CROWD_BASE = 1400;
  K.CROWD_GROWTH = 9; // por dia desde o lançamento
  K.CROWD_MAX = 6000;
  K.crowdSize = (now) => Math.min(K.CROWD_MAX, K.CROWD_BASE + Math.max(0, Math.floor((now - K.FIRST) / 86400000)) * K.CROWD_GROWTH);
  K.crowdAbove = function (myPoints, cut, total) {
    if (myPoints >= cut || cut <= 0) return 0;
    return Math.round(total * Math.pow((cut - myPoints) / cut, 2.5));
  };

  // bots visíveis: com mais de 20 jogadores reais na temporada, cada real a mais tira um bot (os de menos pontos)
  K.visibleBots = function (bots, realCount) {
    const n = Math.max(0, bots.length - Math.max(0, realCount - 20));
    return bots.slice().sort((a, c) => c.points - a.points).slice(0, n);
  };

  // tabela completa: bots + reais + você, ordenada; posição de cada um e a sua
  // reals: [{ id, name, fav, points, trophies }], me: { id, name, fav, points, trophies } ou null
  K.board = function (now, reals, me) {
    const bots = K.visibleBots(K.botScores(now), (reals || []).length);
    const rows = bots.concat((reals || []).filter((r) => !me || r.id !== me.id).map((r) => Object.assign({ league: K.leagueOf(r.points) }, r)));
    if (me) rows.push(Object.assign({ league: K.leagueOf(me.points), me: true }, me));
    rows.sort((a, c) => c.points - a.points || (a.me ? -1 : c.me ? 1 : 0));
    rows.forEach((r, i) => (r.pos = i + 1));
    const sortedBots = bots.slice().sort((a, c) => c.points - a.points);
    const cut = sortedBots.length >= 100 ? sortedBots[99].points : sortedBots.length ? sortedBots[sortedBots.length - 1].points : 0;
    let myPos = null;
    if (me) {
      const above = rows.filter((r) => !r.me && r.points > me.points).length;
      myPos = 1 + above + K.crowdAbove(me.points, cut, K.crowdSize(now));
    }
    return { top: rows.slice(0, 100), myPos, cut, rows };
  };

  // posição final de uma temporada (para o Top 10 na virada): bots no fim da temporada + reais + você
  K.finalPosition = function (season, myPoints, realPrev) {
    const end = K.seasonEnd(season) - 1000;
    const bots = K.botScores(end);
    const above = bots.filter((b) => b.points > myPoints).length + (realPrev || []).filter((p) => p > myPoints).length;
    const cut = bots.slice().sort((a, c) => c.points - a.points)[99].points;
    return 1 + above + K.crowdAbove(myPoints, cut, K.crowdSize(end));
  };

  // ---------------- Adversário ----------------
  const SYL = ['ka', 'ri', 'zo', 'lu', 'mi', 'to', 'ra', 'ne', 'vi', 'sa', 'do', 'ke', 'ya', 'el', 'ar', 'on'];
  const STY = [(a, n) => a + '_' + n, (a, n) => a.charAt(0).toUpperCase() + a.slice(1) + n, (a, n, b) => a + '.' + b, (a, n, b) => a + b + '_br', (a, n) => 'xX' + a + 'Xx'];
  K.crowdName = function (seed) {
    const a = SYL[Math.floor(rnd('a', seed) * SYL.length)] + SYL[Math.floor(rnd('b', seed) * SYL.length)] + (rnd('c', seed) > 0.5 ? SYL[Math.floor(rnd('c2', seed) * SYL.length)] : '');
    const b = SYL[Math.floor(rnd('d', seed) * SYL.length)] + SYL[Math.floor(rnd('e', seed) * SYL.length)];
    const n = 1 + Math.floor(rnd('n', seed) * 98);
    return STY[Math.floor(rnd('s', seed) * STY.length)](a, n, b);
  };

  // longe do Top 100: alguém da multidão com pontos parecidos; perto: um dos 6 bots mais próximos
  K.pickOpponent = function (now, me, myPos, seed) {
    const r = (k) => rnd('opp', seed, k);
    if (myPos > 130) {
      const pts = Math.max(0, Math.round(me.points + (r(1) - 0.45) * 120));
      return { name: K.crowdName(seed), fav: CHARS[Math.floor(r(2) * CHARS.length)], points: pts, league: K.leagueOf(pts), crowd: true };
    }
    const bots = K.botScores(now).sort((a, c) => Math.abs(a.points - me.points) - Math.abs(c.points - me.points)).slice(0, 6);
    const b = bots[Math.floor(r(3) * bots.length)];
    return Object.assign({}, b);
  };

  // dificuldade da IA (0 fácil, 1 médio, 2 difícil) pela liga do adversário e pelo nível do jogador;
  // na liga máxima o adversário ainda começa com metade da barra de ultimate
  K.aiFor = function (oppLeague, playerLevel) {
    let lv = [0, 0, 1, 1, 2, 2][oppLeague];
    if (playerLevel >= 6 && lv < 2) lv += 1;
    return { level: lv, ultStart: oppLeague >= 5 ? 50 : oppLeague >= 4 ? 25 : 0 };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = K;
  if (root && root.RR) root.RR.rankCore = K;
})(typeof window !== 'undefined' ? window : globalThis);
