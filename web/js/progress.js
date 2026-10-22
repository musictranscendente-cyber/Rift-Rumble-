// Progresso do jogador (salvo no navegador): nível por XP, missões diárias e sequência de dias seguidos.
// Dá motivo para voltar no dia seguinte e para jogar "só mais uma".
(function (RR) {
  const U = RR.U;
  const P = (RR.progress = {});
  const T = (s) => (RR.t ? RR.t(s) : s);

  // missões: tipo, meta, XP. "{n}" vira a meta no texto
  const POOL = [
    { id: 'win', goal: 2, xp: 120, text: 'Vença {n} lutas' },
    { id: 'win', goal: 3, xp: 160, text: 'Vença {n} lutas' },
    { id: 'ko', goal: 5, xp: 120, text: 'Derrube {n} oponentes' },
    { id: 'ko', goal: 8, xp: 160, text: 'Derrube {n} oponentes' },
    { id: 'ult', goal: 2, xp: 120, text: 'Use o ultimate {n} vezes' },
    { id: 'dmg', goal: 300, xp: 120, text: 'Cause {n}% de dano' },
    { id: 'chars', goal: 3, xp: 140, text: 'Lute com {n} lutadores diferentes' },
    { id: 'play', goal: 4, xp: 100, text: 'Jogue {n} lutas' },
  ];

  const today = (d) => {
    const t = d || new Date();
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  };

  const d = Object.assign({ xp: 0, day: '', streak: 0, missions: [], chars: [] }, U.store.get('prog', {}));
  const save = () => U.store.set('prog', d);

  // nível: cada nível pede 100 XP a mais que o anterior (1→2: 200, 2→3: 300...)
  P.level = function (xp = d.xp) {
    let lv = 1, need = 200;
    while (xp >= need) {
      xp -= need;
      lv++;
      need += 100;
    }
    return { lv, cur: xp, need };
  };

  // primeiro acesso do dia: missões novas e bônus da sequência
  P.daily = null;
  (function newDay() {
    const now = today();
    if (d.day === now) return;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const first = !d.day;
    d.streak = d.day === today(y) ? d.streak + 1 : 1;
    d.day = now;
    const pool = POOL.slice().sort(() => Math.random() - 0.5);
    const picked = [];
    for (const m of pool) if (picked.length < 3 && !picked.some((p) => p.id === m.id)) picked.push(m);
    d.missions = picked.map((m) => ({ id: m.id, goal: m.goal, xp: m.xp, text: m.text, n: 0, done: false }));
    d.chars = [];
    const bonus = first ? 0 : 50 * Math.min(d.streak, 7);
    d.xp += bonus;
    if (!first) P.daily = { streak: d.streak, bonus };
    save();
  })();

  P.missions = () => d.missions;
  P.streak = () => d.streak;
  P.missionText = (m) => T(m.text).replace('{n}', m.goal);

  // fim de uma luta do jogador: XP e avanço das missões; devolve o resumo para a tela de resultado
  P.record = function (m) {
    const h = m.fighters.find((f) => f.isHuman);
    if (!h) return null;
    const won = m.ranking()[0] === h;
    const before = P.level();
    let xp = 40 + (won ? 60 : 0) + h.kos * 15;
    if (!d.chars.includes(h.def.id)) d.chars.push(h.def.id);
    const add = { win: won ? 1 : 0, ko: h.kos, ult: h.ultsUsed || 0, dmg: Math.round(h.dmgDealt), play: 1 };
    const finished = [];
    for (const ms of d.missions) {
      if (ms.done) continue;
      ms.n = ms.id === 'chars' ? d.chars.length : ms.n + (add[ms.id] || 0);
      if (ms.n >= ms.goal) {
        ms.n = ms.goal;
        ms.done = true;
        xp += ms.xp;
        finished.push(ms);
      }
    }
    d.xp += xp;
    save();
    const after = P.level();
    return { xp, before, after, up: after.lv > before.lv, finished };
  };
})(window.RR);
