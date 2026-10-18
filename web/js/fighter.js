// Lutador: física, máquina de estados, golpes, escudo, esquivas e borda
(function (RR) {
  const U = RR.U;
  const sfx = (n, p) => RR.audio && RR.audio.play(n, p);

  class Fighter {
    constructor(def, slot, ctrl, opts) {
      this.def = def;
      this.slot = slot;
      this.ctrl = ctrl;
      this.isHuman = !!opts.human;
      this.label = opts.label;
      this.pcolor = opts.pcolor;
      this.w = def.w;
      this.h = def.h;
      this.stocks = opts.stocks;
      this.kos = 0;
      this.falls = 0;
      this.sds = 0;
      this.dmgDealt = 0;
      this.ult = 0;
      this.elimFrame = -1;
      this.hitLog = new Map();
      this.inp = U.blankInput();
      this.spawnAt(0, 0, 1);
    }

    spawnAt(x, y, facing) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.facing = facing;
      this.percent = 0;
      this.state = 'idle';
      this.stateT = 0;
      this.move = null;
      this.moveT = 0;
      this.grounded = false;
      this.platform = null;
      this.jumpsLeft = this.def.jumps;
      this.fastFall = false;
      this.hitstun = 0;
      this.shieldHP = 100;
      this.invuln = 0;
      this.cd = { special: 0 };
      this.recoveryUsed = false;
      this.specialAirUsed = false;
      this.airDodgeUsed = false;
      this.ledge = null;
      this.ledgeCD = 0;
      this.flash = 0;
      this.frozen = 0;
      this.hidden = false;
      this.dropT = 0;
      this.lagT = 0;
      this.jumpT = 99;
      this.lastHitBy = null;
      this.lastHitFrame = -9999;
      this.lastKb = 0;
      this.anim = { run: 0, squash: 1, spin: 0 };
      this.mvar = {};
      this.poison = null;
      this.hitLog.clear();
    }

    setState(s) {
      this.state = s;
      this.stateT = 0;
      if (s !== 'attack') this.move = null;
    }

    get alive() {
      return this.state !== 'dead' && this.state !== 'out';
    }

    hurtRect() {
      return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
    }

    hitRect(h) {
      return {
        x: this.x + h.cx * this.facing - h.w / 2,
        y: this.y + h.cy - h.h / 2,
        w: h.w,
        h: h.h,
      };
    }

    intangible() {
      if (this.invuln > 0 || this.hidden) return true;
      const s = this.state, t = this.stateT;
      if (s === 'respawn' || s === 'dead' || s === 'out') return true;
      if (s === 'roll') return t >= 3 && t <= 18;
      if (s === 'spotdodge') return t >= 3 && t <= 16;
      if (s === 'airdodge') return t >= 3 && t <= 22;
      if (s === 'ledge') return t < 30;
      if (s === 'attack' && this.move.intang) return this.moveT >= this.move.intang[0] && this.moveT <= this.move.intang[1];
      return false;
    }

    hasArmor() {
      return this.state === 'attack' && this.move.armor && this.moveT >= this.move.armor[0] && this.moveT <= this.move.armor[1];
    }

    // ------------------------------------------------------------------
    update(g) {
      const inp = (this.inp = this.ctrl.poll(this, g));
      if (this.state === 'out') return;
      this.stateT++;
      if (this.invuln > 0) this.invuln--;
      if (this.flash > 0) this.flash--;
      if (this.frozen > 0) this.frozen--;
      if (this.cd.special > 0) this.cd.special--;
      if (this.ledgeCD > 0) this.ledgeCD--;
      if (this.dropT > 0) this.dropT--;
      this.jumpT++;
      this.anim.squash += (1 - this.anim.squash) * 0.25;
      if (this.poison) this.tickPoison(g);

      switch (this.state) {
        case 'dead':
          if (--this.respawnT <= 0) g.respawn(this);
          return;
        case 'respawn':
          return this.updRespawn(inp, g);
        case 'ledge':
          return this.updLedge(inp, g);
        case 'hitstun':
          return this.updHitstun(inp, g);
      }

      if (this.state !== 'shield') this.shieldHP = Math.min(100, this.shieldHP + 0.14);

      switch (this.state) {
        case 'idle':
        case 'run':
        case 'air':
          this.tryActions(inp, g);
          break;
        case 'shield':
          this.updShield(inp, g);
          break;
        case 'attack':
          this.updAttack(inp, g);
          break;
        case 'landing':
          if (--this.lagT <= 0) this.setState('idle');
          break;
        case 'roll':
        case 'spotdodge':
        case 'airdodge':
          this.updDodge(inp, g);
          break;
        case 'stunned':
          if (this.stateT >= this.stunT) this.setState(this.grounded ? 'idle' : 'air');
          break;
      }
      if (this.state === 'ledge' || this.state === 'dead' || this.state === 'out') return;

      this.applyControl(inp);
      this.applyPhysics(g);
    }

    // veneno: dano extra aos poucos
    tickPoison(g) {
      const p = this.poison;
      if (!this.alive || this.state === 'respawn') return (this.poison = null);
      if (this.stateT % 9 === 0) g.burst(this.x, this.y - this.h * 0.6, 'shadow', 1, 2);
      if (--p.t > 0) return;
      this.percent = Math.min(999, this.percent + p.dmg);
      if (p.by) p.by.dmgDealt += p.dmg;
      g.addText(this.x, this.y - this.h - 10, '+' + p.dmg + '%', '#e07bff');
      p.t = p.every;
      if (--p.n <= 0) this.poison = null;
    }

    // ---------- Ações a partir de estados livres ----------
    tryActions(inp, g) {
      const d = this.def;
      if (inp.ultP && this.ult >= 100) {
        g.startUlt(this);
        return true;
      }
      if (inp.specialP && this.trySpecial(inp, g)) return true;
      if (inp.attackP) {
        this.startAttack(inp, g);
        return true;
      }
      if (this.grounded) {
        if (inp.shieldH) {
          this.setState('shield');
          return true;
        }
        if (inp.jumpP) {
          this.groundJump(inp);
          return false;
        }
        if (inp.downP && this.platform && this.platform.soft) {
          this.dropT = 14;
          this.grounded = false;
          this.y += 3;
          this.jumpsLeft = d.jumps - 1;
          this.setState('air');
          return false;
        }
        if (Math.abs(inp.mx) > 0.25) {
          this.facing = U.sign(inp.mx);
          if (this.state !== 'run') this.setState('run');
        } else if (this.state !== 'idle') this.setState('idle');
      } else {
        if (this.state !== 'air') this.setState('air');
        if (inp.shieldP && !this.airDodgeUsed) {
          this.airDodgeUsed = true;
          this.setState('airdodge');
          let dx = inp.mx, dy = inp.my;
          const len = Math.hypot(dx, dy);
          if (len > 0.3) {
            this.vx = (dx / len) * 10;
            this.vy = (dy / len) * 10;
            this.mvar.adDir = true;
          } else this.mvar.adDir = false;
          return true;
        }
        if (inp.jumpP && this.jumpsLeft > 0) this.airJump(inp, g);
        if (inp.downP && this.vy > -3) this.fastFall = true;
      }
      return false;
    }

    groundJump(inp) {
      this.vy = -this.def.jump;
      this.grounded = false;
      this.jumpsLeft = this.def.jumps - 1;
      this.jumpT = 0;
      this.fastFall = false;
      this.anim.squash = 0.75;
      this.setState('air');
      this.vx = inp.mx * this.def.air * 0.9 + this.vx * 0.2;
      sfx('jump');
      RR.game && RR.game.dust(this.x, this.y, 6);
    }

    airJump(inp, g) {
      this.jumpsLeft--;
      this.vy = -this.def.djump;
      this.vx = inp.mx * this.def.air;
      this.fastFall = false;
      this.jumpT = 99;
      this.anim.squash = 0.8;
      g.ring(this.x, this.y - 6, this.def.color2, 34);
      sfx('djump');
    }

    startAttack(inp, g) {
      let id;
      if (this.grounded) {
        if (inp.my < -0.5) id = 'upA';
        else if (inp.my > 0.55) id = 'downG';
        else id = 'jab1';
        if (Math.abs(inp.mx) > 0.3) this.facing = U.sign(inp.mx);
      } else {
        if (inp.my < -0.5) id = 'upA';
        else if (inp.my > 0.55) id = 'dair';
        else id = 'nair';
      }
      this.startMove(id, g);
    }

    trySpecial(inp, g) {
      if (inp.my < -0.5) {
        if (this.recoveryUsed) return false;
        this.recoveryUsed = true;
        if (Math.abs(inp.mx) > 0.3) this.facing = U.sign(inp.mx);
        this.startMove('recovery', g);
        return true;
      }
      if (this.cd.special > 0) return false;
      const m = this.def.moves.special;
      if (m.oncePerAir && !this.grounded) {
        if (this.specialAirUsed) return false;
        this.specialAirUsed = true;
      }
      if (Math.abs(inp.mx) > 0.3) this.facing = U.sign(inp.mx);
      this.cd.special = m.cooldown || 0;
      this.startMove('special', g);
      return true;
    }

    startMove(id, g) {
      const m = this.def.moves[id];
      this.setState('attack');
      this.move = m;
      this.moveId = id;
      this.moveT = 0;
      this.mvar = {};
      this.chainQ = false;
      this.hitLog.clear();
      if (m.onStart) m.onStart(this, g);
    }

    endMove() {
      const m = this.move;
      const helpless = m && (m.helpless || this.mvar.fail);
      this.hidden = false;
      if (this.grounded) this.setState('idle');
      else this.setState(helpless ? 'helpless' : 'air');
    }

    updAttack(inp, g) {
      const m = this.move;
      const t = ++this.moveT;
      if (m.step && t === m.startup && this.grounded) this.vx = m.step * this.facing;
      if (m.sfx && t === m.startup) sfx(m.sfx);
      if (m.onFrame) m.onFrame(this, g, t);
      if (this.state !== 'attack') return;
      if (m.chain && inp.attackP) this.chainQ = true;
      if (this.chainQ && this.grounded && t >= m.startup + m.active + 2) {
        this.startMove(m.chain, g);
        return;
      }
      if (this.moveT >= m.startup + m.active + m.recovery) this.endMove();
    }

    updShield(inp, g) {
      this.shieldHP -= 0.28;
      if (this.shieldHP <= 0) return this.shieldBreak(g);
      if (!this.grounded) return this.setState('air');
      if (inp.jumpP) return this.groundJump(inp);
      if (inp.sideP) {
        this.setState('roll');
        this.mvar.dir = inp.sideP;
        sfx('dash');
        return;
      }
      if (inp.downP) return this.setState('spotdodge');
      if (!inp.shieldH) this.setState('idle');
    }

    shieldBreak(g) {
      this.shieldHP = 35;
      this.setState('stunned');
      this.stunT = 160;
      this.vy = -13;
      this.grounded = false;
      sfx('shieldbreak');
      g.burst(this.x, this.y - this.h / 2, 'shield', 20);
    }

    updDodge(inp, g) {
      const t = this.stateT;
      if (this.state === 'roll') {
        this.vx = t < 20 ? this.mvar.dir * 8.5 : 0;
        if (t >= 26) {
          this.facing = -this.mvar.dir;
          this.setState('idle');
        }
      } else if (this.state === 'spotdodge') {
        this.vx = 0;
        if (t >= 22) this.setState('idle');
      } else {
        if (t < 16) {
          if (this.mvar.adDir) {
            this.vx *= 0.9;
            this.vy *= 0.9;
          } else {
            this.vx *= 0.9;
            this.vy = Math.min(this.vy, 2);
          }
        }
        if (t >= 32) this.setState('air');
      }
    }

    updRespawn(inp, g) {
      this.respawnT++;
      this.vx = 0;
      this.vy = 0;
      const wants =
        Math.abs(inp.mx) > 0.3 || inp.jumpP || inp.attackP || inp.specialP || inp.downP || inp.shieldP || inp.ultP;
      if ((this.respawnT > 25 && wants) || this.respawnT > 180) {
        this.setState('air');
        this.invuln = 120;
        this.jumpsLeft = this.def.jumps - 1;
        if (inp.jumpP) {
          this.vy = -this.def.djump;
          sfx('djump');
        }
      }
    }

    // ---------- Borda ----------
    grabLedge(L) {
      L.occ = this;
      this.ledge = L;
      this.setState('ledge');
      this.vx = 0;
      this.vy = 0;
      this.facing = -L.side;
      this.jumpsLeft = this.def.jumps - 1;
      this.recoveryUsed = false;
      this.specialAirUsed = false;
      this.airDodgeUsed = false;
      this.fastFall = false;
      this.hidden = false;
      sfx('ledge');
    }

    releaseLedge() {
      if (this.ledge) this.ledge.occ = null;
      this.ledge = null;
    }

    updLedge(inp, g) {
      const L = this.ledge;
      const d = this.def;
      this.vx = 0;
      this.vy = 0;
      this.x = L.x + L.side * (this.w / 2 + 1);
      this.y = L.y + this.h * 0.72;
      if (this.stateT < 8) return;
      const toward = -L.side;
      if (inp.jumpP || inp.upP) {
        this.releaseLedge();
        this.setState('air');
        this.vy = -d.jump * 1.02;
        this.vx = toward * 2.6;
        this.jumpT = 0;
        sfx('jump');
        return;
      }
      if (inp.mx * toward > 0.5 || inp.attackP || inp.shieldP) {
        this.releaseLedge();
        this.x = L.x + toward * (this.w / 2 + 8);
        this.y = L.y;
        this.vy = 0;
        this.grounded = true;
        this.platform = null;
        this.invuln = Math.max(this.invuln, 14);
        this.facing = toward;
        if (inp.attackP) this.startMove('jab3', g);
        else if (inp.shieldP) {
          this.setState('roll');
          this.mvar.dir = toward;
        } else this.setState('idle');
        return;
      }
      if (inp.my > 0.6 || inp.mx * L.side > 0.5 || this.stateT > 300) {
        this.releaseLedge();
        this.ledgeCD = 45;
        this.setState('air');
      }
    }

    // ---------- Hitstun ----------
    updHitstun(inp, g) {
      const d = this.def;
      this.hitstun--;
      if (this.frozen > 0) {
        this.vx *= 0.8;
        this.vy *= 0.8;
      } else {
        this.vx += inp.mx * 0.1; // leve influência direcional
        this.vx *= 0.97;
        this.vy += this.vy < 0 ? d.grav * 0.5 : d.grav * 0.75;
        if (this.vy > d.fall * 1.25) this.vy = d.fall * 1.25;
      }
      if (this.lastKb > 22) this.anim.spin += 0.32 * U.sign(this.vx || 1);
      const vyb = this.vy;
      const vxb = this.vx;
      this.moveAndCollide(g);
      if (this.wallHit && Math.abs(vxb) > 8) this.vx = -vxb * 0.5;
      if (this.grounded) {
        if (vyb > 7 && this.hitstun > 3) {
          this.vy = -vyb * 0.45;
          this.grounded = false;
          g.dust(this.x, this.y, 8);
          sfx('land');
        } else {
          this.vx *= 0.8;
          this.jumpsLeft = d.jumps;
          if (this.hitstun <= 0) {
            this.anim.spin = 0;
            this.setState('idle');
          }
        }
      } else if (this.hitstun <= 0) {
        this.anim.spin = 0;
        this.setState('air');
      }
    }

    // ---------- Movimento ----------
    applyControl(inp) {
      const d = this.def;
      const s = this.state;
      const m = this.move;
      if (this.grounded) {
        if (s === 'run' || s === 'idle') {
          const target = Math.abs(inp.mx) > 0.25 ? inp.mx * d.walk : 0;
          this.vx += (target - this.vx) * (target === 0 ? 0.35 : 0.3);
        } else if (s === 'roll') {
          // definido em updDodge
        } else if (s === 'attack' && m && m.noDrift) {
          // controlado pelo golpe
        } else {
          this.vx *= 0.82;
        }
        return;
      }
      let ctl = 0;
      if (s === 'air') ctl = 1;
      else if (s === 'helpless') ctl = 0.6;
      else if (s === 'attack' && !m.noDrift) ctl = 0.9;
      if (ctl > 0 && Math.abs(inp.mx) > 0.2) {
        const max = d.air * ctl * Math.abs(inp.mx);
        const acc = d.airAccel * ctl;
        if (inp.mx > 0 && this.vx < max) this.vx = Math.min(this.vx + acc, max);
        else if (inp.mx < 0 && this.vx > -max) this.vx = Math.max(this.vx - acc, -max);
      } else if (s !== 'airdodge' && !(s === 'attack' && m.noDrift)) {
        this.vx *= 0.985;
      }
      // pulo curto se soltar o botão cedo
      if (this.jumpT === 5 && !inp.jumpH && this.vy < 0) this.vy *= 0.55;
    }

    applyPhysics(g) {
      const d = this.def;
      let grav = d.grav;
      if (this.state === 'attack' && this.move.grav != null) grav *= this.move.grav;
      if (this.state === 'airdodge' && this.stateT < 16) grav = this.mvar.adDir ? 0 : grav * 0.3;
      this.vy += grav;
      const maxF = this.fastFall ? d.ff : d.fall;
      if (this.fastFall && this.state === 'air' && this.vy > 0) this.vy = maxF;
      if (this.vy > maxF) this.vy = maxF;

      const wasG = this.grounded;
      this.moveAndCollide(g);

      if (this.grounded && !wasG) this.onLand(g);
      else if (!this.grounded && wasG) {
        if (this.state === 'idle' || this.state === 'run' || this.state === 'shield' || this.state === 'landing') {
          this.jumpsLeft = this.def.jumps - 1;
          this.setState('air');
        }
      }
      if (!this.grounded) this.checkLedge(g);
    }

    onLand(g) {
      const vyl = this.lastVy;
      this.jumpsLeft = this.def.jumps;
      this.recoveryUsed = false;
      this.specialAirUsed = false;
      this.airDodgeUsed = false;
      this.fastFall = false;
      this.anim.squash = 1.2;
      if (vyl > 6) {
        g.dust(this.x, this.y, 4);
        sfx('land');
      }
      const s = this.state;
      if (s === 'air') {
        this.setState('landing');
        this.lagT = 3;
      } else if (s === 'helpless') {
        this.setState('landing');
        this.lagT = 12;
      } else if (s === 'airdodge') {
        this.setState('landing');
        this.lagT = 8;
      } else if (s === 'attack') {
        const m = this.move;
        if (m.onLand && m.onLand(this, g)) return;
        if (m.lc) {
          this.hidden = false;
          this.setState('landing');
          this.lagT = m.landLag || 4;
        }
      } else if (s === 'stunned') {
        this.vx = 0;
      }
    }

    checkLedge(g) {
      const s = this.state;
      if ((s !== 'air' && s !== 'helpless') || this.ledgeCD > 0 || this.vy < 0) return;
      if (this.inp.my > 0.5) return;
      for (const L of g.stage.ledges) {
        if (L.occ && L.occ !== this && L.occ.state === 'ledge') continue;
        const hx = L.x + L.side * (this.w / 2 + 1);
        const hy = L.y + this.h * 0.72;
        if (Math.abs(this.x - hx) < 40 && this.y > hy - 52 && this.y < hy + 44) {
          this.grabLedge(L);
          return;
        }
      }
    }

    moveAndCollide(g) {
      const st = g.stage;
      const hw = this.w / 2;
      this.wallHit = false;
      this.lastVy = this.vy;
      // horizontal
      this.x += this.vx;
      for (const s of st.solids) {
        if (this.y > s.y + 1 && this.y - this.h < s.y + s.h && this.x + hw > s.x && this.x - hw < s.x + s.w) {
          if (this.x < s.x + s.w / 2) this.x = s.x - hw;
          else this.x = s.x + s.w + hw;
          this.wallHit = true;
          if (this.state !== 'hitstun') this.vx = 0;
        }
      }
      // vertical
      const prevY = this.y;
      const prevPlat = this.platform;
      this.y += this.vy;
      this.grounded = false;
      this.platform = null;
      for (const s of st.solids) {
        if (this.x >= s.x - 2 && this.x <= s.x + s.w + 2) {
          if (this.vy >= 0 && prevY <= s.y + 1 && this.y >= s.y) {
            this.y = s.y;
            this.vy = 0;
            this.grounded = true;
            this.platform = s;
          } else if (this.vy < 0 && prevY - this.h >= s.y + s.h - 1 && this.y - this.h < s.y + s.h) {
            this.y = s.y + s.h + this.h;
            this.vy = 0;
          }
        }
      }
      // do chão para a rampa: andando sobre a ponta baixa, sobe nela
      if (this.grounded && this.dropT <= 0) {
        for (const p of st.plats) {
          if (p.y2 == null || this.x <= p.x || this.x >= p.x + p.w) continue;
          const sy = RR.stages.surfaceY(p, this.x);
          if (sy <= this.y && this.y - sy < 6) {
            this.y = sy;
            this.platform = p;
          }
        }
      }
      if (!this.grounded && this.vy >= 0 && this.dropT <= 0) {
        for (const p of st.plats) {
          if (this.x <= p.x - 4 || this.x >= p.x + p.w + 4) continue;
          const sy = RR.stages.surfaceY(p, this.x);
          const syPrev = RR.stages.surfaceY(p, this.x - this.vx);
          // em rampas, quem já estava em cima acompanha a descida
          const stay = p === prevPlat && p.y2 != null && Math.abs(this.y - sy) < 14;
          if ((prevY <= syPrev + 1 && this.y >= sy) || stay) {
            // durante hitstun com muita força, atravessa a plataforma
            if (this.state === 'hitstun' && this.vy > 14) continue;
            this.y = sy;
            this.vy = 0;
            this.grounded = true;
            this.platform = p;
            break;
          }
        }
      }
    }
  }

  RR.Fighter = Fighter;
})(window.RR);
