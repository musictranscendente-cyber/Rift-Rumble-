// IA dos bots: 0 = fácil, 1 = médio, 2 = difícil
(function (RR) {
  const U = RR.U;

  const LEVELS = [
    { react: 26, aggr: 0.35, shield: 0.01, accuracy: 0.55, combo: 0.2, ult: 0.01 },
    { react: 14, aggr: 0.6, shield: 0.04, accuracy: 0.75, combo: 0.55, ult: 0.03 },
    { react: 6, aggr: 0.85, shield: 0.1, accuracy: 0.92, combo: 0.9, ult: 0.08 },
  ];

  class AIController {
    constructor(level) {
      this.level = level;
      this.p = LEVELS[level];
      this.decideT = 0;
      this.holdShield = 0;
      this.holdJump = 0;
      this.mx = 0;
      this.wait = 0;
      this.target = null;
      this.prevMy = 0;
    }

    poll(f, g) {
      const o = RR.U.blankInput();
      if (!f.alive) return o;
      const st = g.stage;
      const p = this.p;

      if (f.state === 'respawn') {
        if (f.respawnT > 30 + this.level * -8 + Math.random() * 40) o.mx = U.sign(st.cx - f.x);
        return o;
      }
      if (f.state === 'ledge') {
        if (f.stateT > 10 + p.react + Math.random() * 30) {
          const r = Math.random();
          if (r < 0.5) o.mx = -f.ledge.side;
          else if (r < 0.8) o.jumpP = true;
          else o.attackP = true;
        }
        return o;
      }
      if (this.holdJump > 0) {
        this.holdJump--;
        o.jumpH = true;
      }

      // ---- Recuperação: fora do palco ----
      const offstage = f.x < st.left - 5 || f.x > st.right + 5 || f.y > st.solids[0].y + 5;
      if (offstage && !f.grounded) return this.recover(f, g, o);

      // ---- Alvo ----
      if (!this.target || !this.target.alive || this.target.state === 'respawn' || Math.random() < 0.005)
        this.target = this.pickTarget(f, g);
      const t = this.target;
      if (!t) {
        o.mx = Math.abs(f.x - st.cx) > 100 ? U.sign(st.cx - f.x) : 0;
        return o;
      }
      const dx = t.x - f.x;
      const dy = t.y - f.y;
      const adx = Math.abs(dx);
      const dir = U.sign(dx);
      const ai = f.def.ai;

      // ---- Defesa ----
      if (this.holdShield > 0) {
        this.holdShield--;
        o.shieldH = true;
        if (this.holdShield === 0 && Math.random() < 0.3) o.jumpP = true;
        return o;
      }
      if (f.grounded && (f.state === 'idle' || f.state === 'run')) {
        const threat =
          (t.state === 'attack' && t.moveT < t.move.startup + t.move.active && adx < 160 && Math.abs(dy) < 100) ||
          g.projectiles.some((pr) => pr.owner !== f && Math.abs(pr.x - f.x) < 170 && Math.abs(pr.y - (f.y - f.h / 2)) < 90 && U.sign(f.x - pr.x) === U.sign(pr.vx || pr.dir));
        if (threat && Math.random() < p.shield * 4) {
          if (Math.random() < 0.25 + this.level * 0.15) {
            o.shieldH = true;
            o.shieldP = true;
            this.holdShield = 10 + Math.floor(Math.random() * 14);
            if (this.level === 2 && Math.random() < 0.3) {
              o.sideP = -dir;
              o.mx = -dir;
            }
          } else {
            o.jumpP = true;
            this.holdJump = 6;
          }
          return o;
        }
      }

      // ---- Continuação de combo ----
      if (f.state === 'attack' && f.move.chain && Math.random() < p.combo) o.attackP = true;

      // ---- Decisão ----
      if (--this.decideT <= 0) {
        this.decideT = p.react + Math.floor(Math.random() * p.react);
        this.decide(f, g, t, o, dx, dy, adx, dir, ai);
      }

      // ---- Movimento ----
      let want = ai.pref;
      let mx = 0;
      if (adx > want + 20) mx = dir;
      else if (adx < want - 60 && ai.pref > 150) mx = -dir;
      else if (Math.random() < 0.05) mx = dir * 0.4;
      if (Math.random() > p.aggr && adx < 400) mx *= 0.4;
      // não cair do palco andando
      if (f.grounded && f.platform && !f.platform.soft) {
        if (f.x + mx * 40 < st.left + 20 || f.x + mx * 40 > st.right - 20) mx = 0;
      }
      if (o.mx === 0) o.mx = mx;

      // pular para alcançar alvo acima
      if (f.grounded && dy < -110 && adx < 260 && Math.random() < 0.06) {
        o.jumpP = true;
        this.holdJump = 10;
      }
      if (!f.grounded && f.vy > 0 && dy < -60 && f.jumpsLeft > 0 && adx < 200 && Math.random() < 0.04) o.jumpP = true;
      // descer da plataforma
      if (f.grounded && f.platform && f.platform.soft && dy > 80 && Math.random() < 0.05) {
        o.my = 1;
        o.downP = true;
      }
      return o;
    }

    decide(f, g, t, o, dx, dy, adx, dir, ai) {
      const p = this.p;
      const free = f.state === 'idle' || f.state === 'run' || f.state === 'air';
      if (!free) return;
      if (Math.random() > p.accuracy) return;
      const inRange = adx < ai.range + 20 && Math.abs(dy) < 70;

      if (f.ult >= 100 && adx < ai.ultRange && Math.abs(dy) < 120 && Math.random() < p.ult * 6) {
        o.mx = dir * 0.4;
        f.facing = dir;
        o.ultP = true;
        return;
      }
      if (inRange && t.state !== 'respawn') {
        o.attackP = true;
        o.mx = dir * 0.5;
        if (dy < -55) o.my = -1;
        else if (!f.grounded && dy > 50) o.my = 1;
        return;
      }
      if (adx < 90 && dy < -60 && dy > -220) {
        if (f.grounded && Math.random() < 0.5) {
          o.jumpP = true;
          this.holdJump = 8;
        } else {
          o.attackP = true;
          o.my = -1;
        }
        return;
      }
      if (f.cd.special === 0 && adx < ai.specialRange && Math.abs(dy) < 90 && Math.random() < 0.45) {
        o.specialP = true;
        o.mx = dir;
        return;
      }
    }

    recover(f, g, o) {
      const st = g.stage;
      const edgeX = f.x < st.cx ? st.left : st.right;
      const toward = U.sign(edgeX - f.x) || U.sign(st.cx - f.x);
      const below = f.y > st.solids[0].y;
      const under = f.x > st.left - 30 && f.x < st.right + 30 && f.y - f.h > st.solids[0].y;
      if (f.state === 'hitstun' || f.state === 'attack' || f.state === 'airdodge') {
        o.mx = toward;
        return o;
      }
      // embaixo do bloco: primeiro sair para o lado
      o.mx = under ? (f.x < st.cx ? -1 : 1) : toward;
      if (f.state === 'helpless') return o;
      const lowEnough = f.y > st.solids[0].y - 40;
      if (f.jumpsLeft > 0 && f.vy > -2 && lowEnough && !under) {
        o.jumpP = true;
        this.holdJump = 12;
        return o;
      }
      const dist = Math.abs(edgeX - f.x);
      if (f.jumpsLeft === 0 && !f.recoveryUsed && (f.vy > 2 || below) && f.y > st.solids[0].y - 30 && !under) {
        o.my = -1;
        o.mx = dist > 60 ? toward : 0;
        o.specialP = true;
        return o;
      }
      return o;
    }

    pickTarget(f, g) {
      let best = null, bd = 1e9;
      for (const o of g.fighters) {
        if (o === f || !o.alive || o.state === 'respawn') continue;
        let d = Math.hypot(o.x - f.x, o.y - f.y);
        if (o.isHuman) d *= 0.8;
        d *= 0.7 + Math.random() * 0.6;
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
      return best;
    }
  }

  RR.AIController = AIController;
})(window.RR);
