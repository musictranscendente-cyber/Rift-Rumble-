// Partida: regras, colisão de golpes, projéteis, KO, respawn, câmera e efeitos
(function (RR) {
  const U = RR.U;
  const sfx = (n, p) => RR.audio && RR.audio.play(n, p);

  const FX_COLORS = {
    fire: ['#ffd166', '#ff8c2a', '#ff4d1a'],
    wind: ['#e6fff9', '#7dfce0', '#21d4a8'],
    rock: ['#e8c9a0', '#a67c52', '#ffb347'],
    ice: ['#ffffff', '#9ff3ff', '#8f6bff'],
    shield: ['#ffffff', '#9fd0ff', '#4dabff'],
    neutral: ['#ffffff', '#fff3b0', '#ffd166'],
  };
  RR.FX_COLORS = FX_COLORS;
  const PCOLORS = ['#ff4d6d', '#4dabff', '#ffd23f', '#7cff6b'];
  RR.PCOLORS = PCOLORS;

  class Match {
    constructor(cfg) {
      this.cfg = cfg;
      this.stage = RR.stages.prepare(RR.stages[cfg.stageId]);
      for (const L of this.stage.ledges) L.occ = null;
      this.mode = cfg.mode;
      this.frame = 0;
      this.phase = 'countdown';
      this.phaseT = 0;
      this.hitstop = 0;
      this.shake = 0;
      this.flashA = 0;
      this.flashC = '#fff';
      this.projectiles = [];
      this.fx = [];
      this.timeLeft = cfg.mode === 'time' ? cfg.time * 60 : 0;
      this.cine = null;
      this.message = null;
      let cpuN = 0;
      this.fighters = cfg.players.map((p, i) => {
        let def = RR.chars[p.charId];
        // personagem repetido usa cores alternativas
        const dup = cfg.players.slice(0, i).filter((q) => q.charId === p.charId).length;
        if (dup > 0) def = Object.assign({}, def, def.alts[(dup - 1) % def.alts.length]);
        const human = p.type === 'human';
        const ctrl = human ? RR.input.human : new RR.AIController(p.level);
        const f = new RR.Fighter(def, i, ctrl, {
          human,
          label: human ? 'P1' : 'CPU' + ++cpuN,
          pcolor: PCOLORS[i],
          stocks: cfg.mode === 'stock' ? cfg.stocks : Infinity,
        });
        const sp = this.stage.spawns[i];
        f.spawnAt(sp.x, sp.y, sp.x < 0 ? 1 : -1);
        return f;
      });
      this.cam = { x: 0, y: -150, zoom: 0.75 };
      RR.game = this;
    }

    // ---------------- Loop ----------------
    step() {
      this.phaseT++;
      if (this.shake > 0) this.shake *= 0.86;
      if (this.shake < 0.3) this.shake = 0;
      if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - 0.03);

      if (this.phase === 'countdown') {
        if (this.phaseT === 1 || this.phaseT === 61 || this.phaseT === 121) sfx('beep');
        if (this.phaseT >= 181) {
          this.phase = 'play';
          this.phaseT = 0;
          sfx('go');
          this.showMessage('LUTEM!', 50);
        }
        this.drainHuman();
        for (const f of this.fighters) {
          f.vy += 1;
          f.moveAndCollide(this);
        }
        this.updateFx();
        this.updateCamera();
        return;
      }
      if (this.phase === 'cine') {
        this.drainHuman(true);
        this.updateFx();
        this.updateCamera();
        if (--this.cine.t <= 0) {
          const f = this.cine.f;
          this.cine = null;
          this.phase = 'play';
          f.startMove('ult', this);
        }
        return;
      }
      if (this.phase === 'ending') {
        this.updateFx();
        this.updateCamera();
        if (--this.endT <= 0) {
          this.phase = 'done';
          RR.ui && RR.ui.showResults(this);
        }
        return;
      }
      if (this.phase === 'done') return;

      if (this.message && --this.message.t <= 0) this.message = null;
      if (this.hitstop > 0) {
        this.hitstop--;
        this.updateCamera();
        return;
      }
      this.frame++;
      for (const f of this.fighters) f.update(this);
      for (const p of this.projectiles) this.updateProjectile(p);
      this.checkHits();
      this.projectiles = this.projectiles.filter((p) => !p.dead);
      for (const f of this.fighters) this.checkBlast(f);
      if (this.mode === 'time') {
        this.timeLeft--;
        if (this.timeLeft <= 0) return this.endMatch();
      }
      this.checkEnd();
      this.updateFx();
      this.updateCamera();
    }

    drainHuman(keep) {
      // descarta toques durante animações em que o jogador não age
      for (const f of this.fighters) if (f.isHuman) f.inp = f.ctrl.poll(f, this);
    }

    showMessage(text, t, color) {
      this.message = { text, t, max: t, color: color || '#fff' };
    }

    // ---------------- Golpes ----------------
    checkHits() {
      for (const a of this.fighters) {
        if (a.state !== 'attack' || !a.move.hits) continue;
        const m = a.move;
        const t = a.moveT - m.startup;
        if (t < 0 || t >= m.active) continue;
        for (const h of m.hits) {
          if (h.t0 != null && t < h.t0) continue;
          if (h.t1 != null && t >= h.t1) continue;
          const r = a.hitRect(h);
          for (const b of this.fighters) {
            if (b === a || !b.alive || b.intangible()) continue;
            if (!U.overlap(r, b.hurtRect())) continue;
            const key = b.slot + ':' + (h.group || 0);
            const last = a.hitLog.get(key);
            if (h.multi) {
              if (last != null && this.frame - last < h.multi) continue;
            } else if (last != null) continue;
            const dir = h.radial ? U.sign(b.x - a.x) : a.facing;
            if (this.applyHit(a, b, h, dir)) a.hitLog.set(key, this.frame);
          }
        }
      }
    }

    knockback(h, percent, weight) {
      return (h.kb + (percent * h.gr) / 100 + h.dmg * 0.2) * (200 / (100 + weight));
    }

    applyHit(a, b, h, dir) {
      const cx = U.clamp(a.x + dir * 30, b.x - b.w / 2, b.x + b.w / 2);
      const cy = b.y - b.h * 0.55;
      if (b.state === 'shield') {
        b.shieldHP -= h.dmg * 1.6 + 2;
        b.vx = dir * (2 + h.dmg * 0.35);
        this.hitstop = Math.max(this.hitstop, 3);
        this.burst(cx, cy, 'shield', 5);
        sfx('shield');
        if (b.shieldHP <= 0) b.shieldBreak(this);
        return true;
      }
      b.percent = Math.min(999, b.percent + h.dmg);
      a.dmgDealt += h.dmg;
      if (a !== b) {
        a.ult = Math.min(100, a.ult + h.dmg * 0.9);
        b.ult = Math.min(100, b.ult + h.dmg * 0.45);
      }
      b.lastHitBy = a;
      b.lastHitFrame = this.frame;
      b.flash = 8;
      const kb = this.knockback(h, b.percent, b.def.weight);
      this.burst(cx, cy, h.fx || 'neutral', 4 + Math.min(14, h.dmg | 0), 6 + kb * 0.15);
      this.addText(cx, cy - 30, Math.round(h.dmg) + '%', '#fff');
      if (a.isHuman || b.isHuman) U.vibrate(Math.min(90, 15 + h.dmg * 3));

      if (b.hasArmor() && kb < 30) {
        this.hitstop = Math.max(this.hitstop, 3);
        sfx('hit', h.dmg);
        return true;
      }
      if (b.state === 'ledge') b.releaseLedge();
      let ang = h.ang;
      if (b.grounded && ang < 0) ang = 20; // spike no chão vira lançamento baixo
      const rad = U.deg(ang);
      b.vx = Math.cos(rad) * kb * dir;
      b.vy = -Math.sin(rad) * kb;
      if (b.vy < 0 || ang > 0) b.grounded = false;
      b.hidden = false;
      b.setState('hitstun');
      b.hitstun = Math.floor(kb * 0.85) + 4 + (h.freeze || 0);
      b.frozen = h.freeze || 0;
      b.lastKb = kb;
      b.anim.spin = 0;
      b.fastFall = false;
      b.recoveryUsed = false;
      b.specialAirUsed = false;
      b.airDodgeUsed = false;
      this.hitstop = Math.max(this.hitstop, Math.min(14, 3 + Math.floor(h.dmg / 2.5)));
      this.shake = Math.max(this.shake, Math.min(20, kb * 0.35));
      if (kb > 26) {
        sfx('heavyhit');
        this.ring(cx, cy, '#ffffff', 90);
        if (kb > 34) {
          this.hitstop = Math.max(this.hitstop, 16);
          this.flashScreen('#ffffff', 0.25);
        }
      } else sfx('hit', h.dmg);
      return true;
    }

    // ---------------- Projéteis ----------------
    spawnProjectile(owner, o) {
      const p = Object.assign(
        { vx: 0, vy: 0, w: 20, h: 20, life: 60, t: 0, dead: false, pierce: false, fx: 'neutral' },
        o
      );
      p.owner = owner;
      p.hitLog = new Map();
      p.dir = U.sign(p.vx || owner.facing);
      if (p.attached) p.dir = owner.facing;
      this.projectiles.push(p);
      return p;
    }

    projRect(p) {
      if (p.type === 'beam') {
        const f = p.owner;
        const x0 = f.x + p.dir * 30;
        return { x: p.dir > 0 ? x0 : x0 - p.w, y: f.y - f.h * 0.6 - p.h / 2, w: p.w, h: p.h };
      }
      if (p.type === 'wave') return { x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h };
      return { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
    }

    updateProjectile(p) {
      p.t++;
      if (p.t >= p.life) {
        if (p.final && !p.finalDone) {
          p.finalDone = true;
          this.projHits(p, p.final, true);
        }
        p.dead = true;
        return;
      }
      if (p.attached) {
        if (p.owner.state !== 'attack') p.dead = true;
        return this.projHits(p, p.hit);
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.ground) {
        // onda segue o chão; some ao sair da plataforma
        let onGround = false;
        for (const s of this.stage.solids) if (p.x > s.x && p.x < s.x + s.w && Math.abs(p.y - s.y) < 4) onGround = true;
        for (const s of this.stage.plats) if (p.x > s.x && p.x < s.x + s.w && Math.abs(p.y - s.y) < 4) onGround = true;
        if (!onGround) p.dead = true;
        if (p.t % 4 === 0) this.burst(p.x, p.y, 'rock', 1, 3);
      } else if (p.type !== 'blast') {
        for (const s of this.stage.solids) {
          if (U.overlap(this.projRect(p), s)) {
            p.dead = true;
            this.burst(p.x, p.y, p.fx, 6);
          }
        }
        if (p.t % 2 === 0) this.trail(p);
      }
      if (!p.dead) this.projHits(p, p.hit);
    }

    projHits(p, h, isFinal) {
      const r = this.projRect(p);
      for (const b of this.fighters) {
        if (b === p.owner || !b.alive || b.intangible()) continue;
        if (!U.overlap(r, b.hurtRect())) continue;
        const key = b.slot + (isFinal ? ':f' : '');
        const last = p.hitLog.get(key);
        if (h.multi) {
          if (last != null && this.frame - last < h.multi) continue;
        } else if (last != null) continue;
        const dir = p.radial ? U.sign(b.x - p.x) : p.dir;
        if (this.applyHit(p.owner, b, h, dir)) {
          p.hitLog.set(key, this.frame);
          if (!p.pierce) {
            p.dead = true;
            return;
          }
        }
      }
    }

    // ---------------- Ultimate ----------------
    startUlt(f) {
      f.ult = 0;
      if (!f.grounded) f.vy = Math.min(f.vy, 0) * 0.2;
      f.vx = 0;
      this.phase = 'cine';
      this.cine = { f, t: 48, max: 48 };
      sfx('ult');
      U.vibrate(60);
    }

    teleport(f, dx, dy) {
      const steps = 28;
      let lx = f.x, ly = f.y;
      for (let i = 1; i <= steps; i++) {
        const nx = f.x + (dx * i) / steps;
        const ny = f.y + (dy * i) / steps;
        let blocked = false;
        for (const s of this.stage.solids)
          if (nx > s.x - f.w / 2 && nx < s.x + s.w + f.w / 2 && ny > s.y + 1 && ny - f.h < s.y + s.h) blocked = true;
        if (blocked) break;
        lx = nx;
        ly = ny;
      }
      f.x = lx;
      f.y = ly;
    }

    // ---------------- KO / respawn ----------------
    checkBlast(f) {
      if (f.state === 'dead' || f.state === 'out' || f.state === 'respawn') return;
      const b = this.stage.blast;
      if (f.x < b.left || f.x > b.right || f.y - f.h > b.bottom || f.y < b.top) this.ko(f);
    }

    ko(f) {
      const killer = f.lastHitBy && this.frame - f.lastHitFrame < 480 ? f.lastHitBy : null;
      if (killer && killer !== f) killer.kos++;
      else f.sds++;
      f.falls++;
      const b = this.stage.blast;
      const px = U.clamp(f.x, b.left + 40, b.right - 40);
      const py = U.clamp(f.y - f.h / 2, b.top + 40, b.bottom - 40);
      this.fx.push({ type: 'ko', x: px, y: py, life: 50, max: 50, color: f.pcolor, ang: Math.atan2(-150 - py, this.stage.cx - px) });
      this.burst(px, py, 'neutral', 30, 18);
      this.shake = 26;
      this.flashScreen(f.pcolor, 0.3);
      sfx('ko');
      if (f.isHuman || (killer && killer.isHuman)) U.vibrate(f.isHuman ? 160 : 70);
      if (f.ledge) f.releaseLedge();
      f.move = null;
      f.hidden = false;
      f.vx = f.vy = 0;
      if (this.mode === 'stock') f.stocks--;
      if (f.stocks <= 0) {
        f.state = 'out';
        f.elimFrame = this.frame;
      } else {
        f.state = 'dead';
        f.respawnT = 75;
      }
    }

    respawn(f) {
      const r = this.stage.respawn;
      f.spawnAt(r.xs[f.slot], r.y, r.xs[f.slot] < 0 ? 1 : -1);
      f.state = 'respawn';
      f.respawnT = 0;
      sfx('respawn');
      this.ring(f.x, f.y, f.pcolor, 70);
    }

    checkEnd() {
      if (this.mode !== 'stock') return;
      const alive = this.fighters.filter((f) => f.stocks > 0);
      if (alive.length <= 1) this.endMatch();
    }

    endMatch() {
      if (this.phase === 'ending' || this.phase === 'done') return;
      this.phase = 'ending';
      this.endT = 140;
      this.showMessage(this.mode === 'time' ? 'TEMPO!' : 'FIM DE JOGO!', 140, '#ffd166');
      sfx('game');
      this.hitstop = 0;
    }

    ranking() {
      const fs = this.fighters.slice();
      if (this.mode === 'stock') {
        fs.sort((a, b) => {
          const aa = a.stocks > 0 ? 1e9 : a.elimFrame;
          const bb = b.stocks > 0 ? 1e9 : b.elimFrame;
          return bb - aa || b.dmgDealt - a.dmgDealt;
        });
      } else {
        fs.sort((a, b) => b.kos - b.falls - (a.kos - a.falls) || b.dmgDealt - a.dmgDealt);
      }
      return fs;
    }

    // ---------------- Efeitos ----------------
    flashScreen(c, a) {
      this.flashC = c;
      this.flashA = Math.max(this.flashA, a);
    }

    burst(x, y, kind, n, speed) {
      const cols = FX_COLORS[kind] || FX_COLORS.neutral;
      speed = speed || 6;
      for (let i = 0; i < n && this.fx.length < 400; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random() * 0.9);
        this.fx.push({
          type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 14 + Math.random() * 14, max: 28, size: 2 + Math.random() * 4, color: U.pick(cols),
          grav: kind === 'rock' ? 0.5 : 0.05,
        });
      }
    }

    trail(p) {
      const cols = FX_COLORS[p.fx] || FX_COLORS.neutral;
      if (this.fx.length < 400)
        this.fx.push({
          type: 'dot', x: p.x - p.vx * 0.5, y: p.y - p.vy * 0.5, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
          life: 14, max: 14, size: p.h * 0.35, color: U.pick(cols), grav: p.fx === 'fire' ? -0.1 : 0,
        });
    }

    dust(x, y, n) {
      for (let i = 0; i < n && this.fx.length < 400; i++) {
        const dir = i % 2 ? 1 : -1;
        this.fx.push({
          type: 'dot', x: x + dir * 10, y: y - 4, vx: dir * (1 + Math.random() * 3), vy: -Math.random() * 1.5,
          life: 18, max: 18, size: 5 + Math.random() * 5, color: 'rgba(255,255,255,0.55)', grav: 0,
        });
      }
    }

    ring(x, y, color, r) {
      this.fx.push({ type: 'ring', x, y, life: 18, max: 18, r, color });
    }

    addText(x, y, text, color) {
      this.fx.push({ type: 'text', x, y, vy: -2.2, life: 36, max: 36, text, color });
    }

    updateFx() {
      for (const p of this.fx) {
        p.life--;
        if (p.type === 'spark' || p.type === 'dot') {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.92;
          p.vy = p.vy * 0.92 + (p.grav || 0);
        } else if (p.type === 'text') {
          p.y += p.vy;
          p.vy *= 0.93;
        }
      }
      this.fx = this.fx.filter((p) => p.life > 0);
    }

    // ---------------- Câmera ----------------
    updateCamera() {
      const st = this.stage;
      let tx, ty, tz;
      if (this.cine) {
        const f = this.cine.f;
        tx = f.x;
        ty = f.y - f.h * 0.6;
        tz = 1.5;
      } else {
        let minX = st.cx - 380, maxX = st.cx + 380, minY = -260, maxY = 60;
        for (const f of this.fighters) {
          if (f.state === 'dead' || f.state === 'out') continue;
          minX = Math.min(minX, f.x - 60);
          maxX = Math.max(maxX, f.x + 60);
          minY = Math.min(minY, f.y - f.h - 60);
          maxY = Math.max(maxY, f.y + 40);
        }
        const b = st.blast;
        minX = Math.max(minX, b.left + 100);
        maxX = Math.min(maxX, b.right - 100);
        minY = Math.max(minY, b.top + 100);
        maxY = Math.min(maxY, b.bottom - 60);
        const padX = 180, padY = 150;
        const vw = RR.view ? RR.view.w / RR.view.base : 1280;
        const vh = RR.view ? RR.view.h / RR.view.base : 720;
        tz = Math.min(vw / (maxX - minX + padX * 2), vh / (maxY - minY + padY * 2));
        tz = U.clamp(tz, 0.42, 1.05);
        tx = (minX + maxX) / 2;
        ty = (minY + maxY) / 2 - 10;
      }
      const k = this.cine ? 0.15 : 0.08;
      this.cam.x += (tx - this.cam.x) * k;
      this.cam.y += (ty - this.cam.y) * k;
      this.cam.zoom += (tz - this.cam.zoom) * (this.cine ? 0.12 : 0.05);
    }
  }

  RR.Match = Match;
})(window.RR);
