// Ranqueada: estado do jogador, nuvem (Supabase), tela do ranking, procura de adversário,
// fim de partida, desistência/abandono e virada de temporada. As regras ficam em rank-core.js.
(function (RR) {
  const U = RR.U, K = RR.rankCore, T = RR.t;
  const R = (RR.rank = {});
  const $ = (s) => document.querySelector(s);
  const now = () => (R.clock ? R.clock() : Date.now()); // os testes podem trocar o relógio
  const L = (i) => K.LEAGUES[i];
  const lname = (i) => (RR.lang === 'pt' ? L(i).pt : L(i).en);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ---------------- Estado no aparelho ----------------
  const blank = () => ({ season: K.seasonOf(now()), points: 0, maxLeague: 0, streak: 0, wins: 0, losses: 0, trophies: 0, prevPoints: 0 });
  let st = null;
  const save = () => U.store.set('rk', st);

  // ---------------- Nuvem (Supabase, por REST; sem biblioteca) ----------------
  const CFG = RR.RANK_CLOUD || {};
  const cloudOn = () => !!(CFG.url && CFG.anonKey);
  let session = null; // { access_token, refresh_token, expires_at, user: { id } }
  let rowExists = false;
  let pushing = Promise.resolve();
  let reals = []; // linhas dos jogadores reais desta temporada

  async function api(path, opts = {}) {
    const headers = Object.assign({ apikey: CFG.anonKey, 'Content-Type': 'application/json' }, opts.headers || {});
    headers.Authorization = 'Bearer ' + (opts.auth && session ? session.access_token : CFG.anonKey);
    const r = await fetch(CFG.url.replace(/\/$/, '') + path, Object.assign({}, opts, { headers }));
    const txt = await r.text();
    let body = null;
    try {
      body = txt ? JSON.parse(txt) : null;
    } catch (e) {}
    if (!r.ok) {
      const err = new Error((body && (body.message || body.msg || body.error_description || body.error)) || 'HTTP ' + r.status);
      err.status = r.status;
      throw err;
    }
    return body;
  }

  function setSession(s) {
    session = s && s.access_token ? { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600), user: { id: s.user.id } } : null;
    U.store.set('rk_session', session);
  }
  async function freshSession() {
    if (!session) return null;
    if (session.expires_at - 60 > Date.now() / 1000) return session;
    try {
      setSession(await api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) }));
    } catch (e) {
      if (e.status === 400 || e.status === 401) setSession(null);
    }
    return session;
  }

  const rowOf = (s) => ({
    name: s.name, fav: s.fav, season: s.season, points: s.points, max_league: s.maxLeague, streak: s.streak,
    wins: s.wins, losses: s.losses, trophies: s.trophies, prev_points: s.prevPoints,
  });

  // grava o estado atual. Linha nova = INSERT; linha existente = UPDATE (nunca upsert: o upsert passa pela
  // regra de INSERT, que limita a 40 pontos, e é recusado para quem já tem mais — os pontos sumiriam).
  function push() {
    if (!cloudOn() || !session) return pushing;
    st.pending = true;
    save();
    pushing = pushing.then(async () => {
      if (!(await freshSession())) return;
      const uid = session.user.id;
      const row = rowOf(st);
      try {
        // tenta sempre o UPDATE primeiro: se não alterou nenhuma linha, ela ainda não existe e aí é INSERT
        const up = await api('/rest/v1/ranked_players?user_id=eq.' + uid, { method: 'PATCH', auth: true, headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
        if (up && up.length) {
          rowExists = true;
          st.pending = false;
        } else {
          await api('/rest/v1/ranked_players', { method: 'POST', auth: true, headers: { Prefer: 'return=representation' }, body: JSON.stringify(Object.assign({ user_id: uid }, row)) });
          rowExists = true;
          st.pending = false;
        }
      } catch (e) {
        // sem internet ou recusado: fica guardado no aparelho e é reenviado ao abrir o ranking
        R.lastError = e.message;
      }
      save();
    });
    return pushing;
  }

  // lê a nuvem: a própria linha (para continuar de outro aparelho) e os jogadores da temporada
  async function pull() {
    if (!cloudOn()) return;
    if (st.pending) push();
    await pushing; // senão a leitura traz pontos velhos
    try {
      if (await freshSession()) {
        const mine = await api('/rest/v1/ranked_players?select=*&user_id=eq.' + session.user.id, { auth: true });
        rowExists = !!(mine && mine.length);
        const m = mine && mine[0];
        if (m && !st.pending && (m.season > st.season || (m.season === st.season && m.points > st.points))) {
          Object.assign(st, { name: m.name, fav: m.fav, season: m.season, points: m.points, maxLeague: m.max_league, streak: m.streak, wins: m.wins, losses: m.losses, trophies: m.trophies, prevPoints: m.prev_points });
          save();
        }
      }
      const rows = await api('/rest/v1/ranked_players?select=user_id,name,fav,season,points,trophies,prev_points&order=points.desc&limit=300');
      R.allRows = rows || [];
      const season = K.seasonOf(now());
      reals = (rows || []).filter((r) => r.season === season).map((r) => ({ id: r.user_id, name: r.name, fav: r.fav, points: r.points, trophies: r.trophies }));
      R.cloudOk = true;
    } catch (e) {
      R.cloudOk = false;
      R.lastError = e.message;
    }
  }

  // ---------------- Virada de temporada e partida abandonada ----------------
  function checkSeason() {
    const cur = K.seasonOf(now());
    if (st.season >= cur) return null;
    // posição final: bots no fim da temporada + jogadores reais (pontos da temporada anterior) + você
    const realPrev = (R.allRows || [])
      .filter((r) => !session || r.user_id !== session.user.id)
      .map((r) => (r.season === st.season ? r.points : r.season === st.season + 1 ? r.prev_points : null))
      .filter((p) => p != null);
    const pos = K.finalPosition(st.season, st.points, realPrev);
    const ro = K.rollover(st, cur, pos);
    st = Object.assign(st, ro.st);
    RR.progress.addCurrency(ro.reward.coins, ro.reward.gems);
    save();
    push();
    return ro;
  }

  function checkAbandoned() {
    const live = U.store.get('rk_live', null);
    if (!live) return null;
    U.store.set('rk_live', null);
    const r = K.applyResult(st, 'loss', live.oppPoints || 0);
    st = Object.assign(st, r.st);
    save();
    push();
    return r;
  }

  // janela que só fecha no OK (um aviso que some sozinho poderia ser apagado por um redesenho)
  const queue = [];
  function notice(title, html) {
    queue.push({ title, html });
    if (queue.length === 1) showNotice();
  }
  let noticeReturn = 'title';
  function showNotice() {
    const n = queue[0];
    if (!n) return RR.ui.show(noticeReturn);
    if (RR.ui.current() !== 'notice') noticeReturn = RR.ui.current() || 'title';
    $('#ntTitle').textContent = n.title;
    $('#ntBody').innerHTML = n.html;
    RR.ui.show('notice');
  }

  function rolloverNotice(ro) {
    const rw = ro.reward;
    notice(
      T('FIM DA TEMPORADA') + ' ' + ro.oldSeason,
      `<div class="nt-big">${L(ro.oldLeague).icon}</div>` +
        `<p>${T('Maior liga')}: <b style="color:${L(ro.oldLeague).color}">${lname(ro.oldLeague)}</b> · ${T('Posição final')}: <b>#${ro.finalPos.toLocaleString()}</b></p>` +
        (ro.top10 ? `<p class="nt-top">🏆 ${T('TOP 10! Você ganhou um troféu!')}</p>` : '') +
        `<p class="nt-rw">+${rw.coins} 🪙${rw.gems ? ` &nbsp; +${rw.gems} 💎` : ''}</p>` +
        `<p class="nt-small">${T('Seus pontos caíram pela metade')}: ${ro.oldPoints} → ${st.points}</p>`
    );
  }

  // ---------------- Tela do ranking ----------------
  const faceSrc = (fav) => `img/${(RR.chars[fav] || RR.chars.solkar).sprite}/face.webp`;
  const medal = (p) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '#' + p);
  const me = () => ({ id: session ? session.user.id : 'me', name: st.name || T('Você'), fav: st.fav || RR.ui.cfgChar(), points: st.points, trophies: st.trophies });

  function rowHTML(r, mine) {
    const lg = L(K.leagueOf(r.points));
    return `<div class="rk-row${mine ? ' me' : ''}"><span class="p">${medal(r.pos)}</span><img src="${faceSrc(r.fav)}" alt=""><span class="n">${esc(r.name)}${r.trophies ? ` <em>${'🏆'.repeat(Math.min(3, r.trophies))}</em>` : ''}</span><span class="l" title="${lname(K.leagueOf(r.points))}">${lg.icon}</span><span class="v">${r.points.toLocaleString()}</span></div>`;
  }

  function render() {
    const t = now();
    const season = K.seasonOf(t);
    $('#rkSeason').textContent = `${T('Temporada')} ${season} · ${T('termina em {n} dias').replace('{n}', K.daysLeft(t))}`;
    const b = K.board(t, reals, me());
    R.lastBoard = b;
    const lg = K.leagueOf(st.points), cur = L(lg), nxt = K.LEAGUES[lg + 1];
    $('#rkEmblem').textContent = cur.icon;
    $('#rkEmblem').style.setProperty('--c', cur.color);
    $('#rkLeague').textContent = lname(lg);
    $('#rkLeague').style.color = cur.color;
    $('#rkPos').innerHTML = `#${b.myPos.toLocaleString()} · <b>${st.points.toLocaleString()} ${T('pts')}</b>`;
    $('#rkBar').style.width = nxt ? Math.round(((st.points - cur.min) / (nxt.min - cur.min)) * 100) + '%' : '100%';
    $('#rkNext').textContent = nxt ? T('Faltam {n} pts para {l}').replace('{n}', nxt.min - st.points).replace('{l}', lname(lg + 1)) : T('Liga máxima!');
    $('#rkStats').innerHTML = `${T('V')} ${st.wins} · ${T('D')} ${st.losses}${st.streak >= 2 ? ` · 🔥 ${st.streak}` : ''}${st.trophies ? ` · ${'🏆'.repeat(Math.min(5, st.trophies))}` : ''}`;
    const can = R.canPlay();
    $('#rkPlay').disabled = !can;
    $('#rkPlay').textContent = can ? T('JOGAR RANQUEADA') : T('ENTRE PARA JOGAR');
    $('#rkAcc').innerHTML = !cloudOn()
      ? T('Modo local: o ranking não é salvo online.')
      : session
        ? `${esc(st.name || '')} · <a href="#" id="rkOut">${T('Sair')}</a>${st.pending ? ` · ⏳ ${T('enviando...')}` : ''}`
        : `<button class="btn" id="rkIn">${T('ENTRAR')}</button>`;
    const inMe = $('#rkIn'), outMe = $('#rkOut');
    if (inMe) inMe.onclick = () => openLogin();
    if (outMe) outMe.onclick = (e) => {
      e.preventDefault();
      setSession(null);
      rowExists = false;
      render();
    };
    $('#rkRows').innerHTML = b.top.map((r) => rowHTML(r, r.me)).join('');
    const mineIn = b.top.some((r) => r.me);
    $('#rkMine').innerHTML = mineIn ? '' : rowHTML(Object.assign(me(), { pos: b.myPos }), true);
    $('#rkMine').style.display = mineIn ? 'none' : '';
  }

  R.canPlay = () => !cloudOn() || !!session;

  R.open = async function () {
    RR.ui.show('ranked');
    render();
    await pull();
    const ro = checkSeason();
    render();
    if (ro) rolloverNotice(ro);
  };

  // ---------------- Entrar / criar conta ----------------
  function openLogin(msg) {
    $('#lgMsg').textContent = msg || '';
    $('#lgName').value = st.name || '';
    RR.ui.show('login');
  }
  async function doAuth(signup) {
    const email = $('#lgEmail').value.trim(), password = $('#lgPass').value, name = $('#lgName').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 6) return ($('#lgMsg').textContent = T('Digite um e-mail válido e uma senha com 6 caracteres ou mais.'));
    if (signup && (name.length < 3 || name.length > 16)) return ($('#lgMsg').textContent = T('Escolha um apelido de 3 a 16 caracteres.'));
    $('#lgMsg').textContent = '...';
    try {
      const s = signup
        ? await api('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password }) })
        : await api('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (!s || !s.access_token) return ($('#lgMsg').textContent = T('Conta criada! Confirme pelo link no seu e-mail e depois toque em ENTRAR.'));
      setSession(s);
      if (name.length >= 3) st.name = name.slice(0, 16);
      if (!st.fav) st.fav = RR.ui.cfgChar();
      rowExists = false;
      save();
      await pull();
      if (!st.name) st.name = 'Player' + Math.floor(Math.random() * 9000 + 1000);
      push();
      R.open();
    } catch (e) {
      $('#lgMsg').textContent = T('Não deu certo') + ': ' + e.message;
    }
  }

  // ---------------- Procurar adversário -> VS -> partida ----------------
  function card(sel, who) {
    const el = $(sel);
    const def = RR.chars[who.fav];
    RR.render.portrait(el.querySelector('canvas'), def, 0, RR.sprites.anim(def, 'idle', 0), 0.62, 0.9);
    el.querySelector('b').textContent = who.name;
    el.querySelector('span').innerHTML = `${L(K.leagueOf(who.points)).icon} ${lname(K.leagueOf(who.points))} · ${who.points} ${T('pts')}`;
  }

  R.play = function () {
    if (!R.canPlay()) return openLogin();
    const t = now();
    const b = K.board(t, reals, me());
    const seed = t + ':' + Math.random();
    const opp = K.pickOpponent(t, me(), b.myPos, seed);
    const ai = K.aiFor(opp.league, RR.progress.level().lv);
    RR.sprites.preload(RR.chars[opp.fav].sprite);
    RR.sprites.preload(RR.chars[RR.ui.cfgChar()].sprite);
    const box = $('#screen-mm');
    box.classList.remove('found', 'vs');
    $('#mmTitle').textContent = T('PROCURANDO ADVERSÁRIO...');
    RR.ui.show('mm');
    const wait = 1200 + Math.random() * 1600;
    setTimeout(() => {
      $('#mmTitle').innerHTML = `${T('ADVERSÁRIO ENCONTRADO!')}<br><b>${esc(opp.name)}</b>`;
      box.classList.add('found');
      RR.audio.play('beep');
      setTimeout(() => {
        card('#mmMe', Object.assign(me(), { fav: RR.ui.cfgChar() }));
        card('#mmOpp', opp);
        box.classList.add('vs');
        $('#mmTitle').textContent = '';
        RR.audio.play('ult');
        setTimeout(() => {
          // marca "partida em andamento": se o app fechar no meio, ao abrir de novo conta como derrota
          U.store.set('rk_live', { oppPoints: opp.points, at: Date.now() });
          RR.ui.startRanked({ opp, ai });
        }, 2200);
      }, 1100);
    }, wait);
  };

  // fim da partida: aplica os pontos e devolve o HTML do resumo para a tela de resultado
  R.finish = function (m, result) {
    U.store.set('rk_live', null);
    const opp = m.ranked.opp;
    const r = K.applyResult(st, result, opp.points);
    st = Object.assign(st, r.st);
    st.fav = RR.ui.cfgChar();
    save();
    push();
    m.ranked.done = true;
    const lg = L(r.league);
    const sign = r.delta > 0 ? '+' : '';
    const parts = [];
    if (r.breakdown.upset) parts.push(`+${r.breakdown.upset} ${T('adversário forte')}`);
    if (r.breakdown.streak) parts.push(`+${r.breakdown.streak} 🔥 ${T('sequência')}`);
    if (r.breakdown.protected) parts.push(`🛡️ ${T('proteção de liga')}`);
    return (
      `<div class="rk-res"><span class="d ${r.delta >= 0 ? 'up' : 'down'}">${sign}${r.delta} ${T('pts')}</span>` +
      `<span class="t">${lg.icon} ${st.points.toLocaleString()} ${T('pts')} · ${lname(r.league)}</span>` +
      (parts.length ? `<span class="b">${parts.join(' · ')}</span>` : '') +
      (r.leagueUp ? `<span class="lu">${T('Subiu para a liga {l}!').replace('{l}', lg.icon + ' ' + lname(r.league))}</span>` : '') +
      `</div>`
    );
  };

  // desistir pelo menu de pausa = derrota
  R.forfeit = function () {
    const m = RR.match;
    if (!m || !m.ranked || m.ranked.done) return RR.ui.toMenu();
    m.ranked.done = true;
    U.store.set('rk_live', null);
    const r = K.applyResult(st, 'loss', m.ranked.opp.points);
    st = Object.assign(st, r.st);
    save();
    push();
    RR.ui.toMenu();
    notice(T('DESISTÊNCIA'), `<p>${T('Sair da partida ranqueada conta como derrota.')}</p><p class="nt-rw down">${r.delta} ${T('pts')} → ${st.points}</p>`);
  };

  // ---------------- Início ----------------
  R.init = function () {
    st = Object.assign(blank(), U.store.get('rk', {}));
    session = U.store.get('rk_session', null);
    $('#openRanked').addEventListener('click', () => {
      RR.audio.play('click');
      R.open();
    });
    $('#rkPlay').addEventListener('click', () => {
      RR.audio.play('click');
      R.play();
    });
    $('#rkAgain').addEventListener('click', () => {
      RR.audio.play('click');
      R.play();
    });
    $('#rkBoard').addEventListener('click', () => {
      RR.audio.play('click');
      R.open();
    });
    $('#lgIn').addEventListener('click', () => doAuth(false));
    $('#lgUp').addEventListener('click', () => doAuth(true));
    $('#lgClose').addEventListener('click', () => R.open());
    $('#ntOk').addEventListener('click', () => {
      RR.audio.play('click');
      queue.shift();
      showNotice();
    });
    const ab = checkAbandoned();
    if (ab) notice(T('PARTIDA ABANDONADA'), `<p>${T('Sua última partida ranqueada foi fechada no meio e contou como derrota.')}</p><p class="nt-rw down">${ab.delta} ${T('pts')} → ${st.points}</p>`);
    // virada de temporada: com nuvem, primeiro lê os jogadores reais (contam na posição final do Top 10)
    if (cloudOn()) {
      pull().then(() => {
        const ro = checkSeason();
        if (ro) rolloverNotice(ro);
      });
    } else {
      const ro = checkSeason();
      if (ro) rolloverNotice(ro);
    }
  };

  // para os testes
  R.state = () => st;
  R.isLogged = () => !!session;
})(window.RR);
