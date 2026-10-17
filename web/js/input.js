// Controles: joystick virtual flutuante + botões de toque + teclado (para testes no PC)
(function (RR) {
  const U = RR.U;
  const BUTTONS = ['jump', 'attack', 'special', 'shield', 'ult'];

  const KEYMAP = {
    KeyJ: 'attack', KeyK: 'special', Space: 'jump', KeyL: 'shield', KeyU: 'ult', KeyO: 'ult',
    KeyZ: 'attack', KeyX: 'special', KeyC: 'jump', KeyV: 'shield', KeyB: 'ult',
  };

  class HumanInput {
    constructor() {
      this.keys = new Set();
      this.stick = { mx: 0, my: 0 };
      this.held = {};
      this.latch = {};
      for (const b of BUTTONS) {
        this.held[b] = false;
        this.latch[b] = false;
      }
      this.keyHeld = {};
      this.prevMx = 0;
      this.prevMy = 0;
    }

    press(b) {
      if (!this.held[b]) this.latch[b] = true;
      this.held[b] = true;
    }

    release(b) {
      this.held[b] = false;
    }

    reset() {
      for (const b of BUTTONS) {
        this.held[b] = false;
        this.latch[b] = false;
        this.keyHeld[b] = false;
      }
      this.keys.clear();
      this.stick.mx = this.stick.my = 0;
    }

    poll() {
      let mx = this.stick.mx, my = this.stick.my;
      const k = this.keys;
      const kx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      const ky = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
      if (kx || ky) {
        mx = kx;
        my = ky;
      }
      const H = (b) => this.held[b] || this.keyHeld[b];
      const o = {
        mx, my,
        jumpP: this.latch.jump, jumpH: H('jump'),
        attackP: this.latch.attack, specialP: this.latch.special,
        shieldH: H('shield'), shieldP: this.latch.shield,
        ultP: this.latch.ult,
        downP: my > 0.6 && this.prevMy <= 0.6,
        upP: my < -0.7 && this.prevMy >= -0.7,
        sideP: Math.abs(mx) > 0.6 && Math.abs(this.prevMx) <= 0.6 ? U.sign(mx) : 0,
      };
      for (const b of BUTTONS) this.latch[b] = false;
      this.prevMx = mx;
      this.prevMy = my;
      return o;
    }
  }

  const human = new HumanInput();
  RR.input = { human };

  // ---------------- Teclado ----------------
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      RR.ui && RR.ui.onBack();
      return;
    }
    human.keys.add(e.code);
    const b = KEYMAP[e.code];
    if (b && !e.repeat) {
      human.latch[b] = true;
      human.keyHeld[b] = true;
    }
    if (RR.match && (e.code === 'Space' || e.code.startsWith('Arrow'))) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    human.keys.delete(e.code);
    const b = KEYMAP[e.code];
    if (b) human.keyHeld[b] = false;
  });
  window.addEventListener('blur', () => human.reset());

  // ---------------- Toque ----------------
  const ICONS = {
    attack: '<b>A</b>',
    special: '<b>B</b>',
    jump: '<svg viewBox="0 0 24 24"><path d="M12 3l7 8h-4v9H9v-9H5z"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z"/></svg>',
    ult: '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z"/></svg>',
  };
  // posição: right/bottom (px) e tamanho, multiplicados pela escala dos controles
  const LAYOUT = {
    attack: { r: 112, b: 46, s: 92 },
    special: { r: 30, b: 150, s: 74 },
    jump: { r: 222, b: 30, s: 74 },
    shield: { r: 26, b: 40, s: 66 },
    ult: { r: 122, b: 158, s: 64 },
  };

  let built = false;
  let els = {};

  RR.input.build = function (root) {
    if (built) return;
    built = true;
    const zone = document.createElement('div');
    zone.id = 'stickZone';
    const base = document.createElement('div');
    base.id = 'stickBase';
    const knob = document.createElement('div');
    knob.id = 'stickKnob';
    base.appendChild(knob);
    root.appendChild(zone);
    root.appendChild(base);
    els = { zone, base, knob, btns: {} };

    let sid = null, ox = 0, oy = 0;
    const R = () => 62 * RR.settings.ctrlSize;
    const place = (x, y) => {
      base.style.left = x + 'px';
      base.style.top = y + 'px';
    };
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (sid !== null) return;
      sid = e.pointerId;
      try { zone.setPointerCapture(sid); } catch (err) {}
      ox = e.clientX;
      oy = e.clientY;
      place(ox, oy);
      base.classList.add('active');
      knob.style.transform = 'translate(-50%,-50%)';
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== sid) return;
      e.preventDefault();
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const r = R();
      const len = Math.hypot(dx, dy);
      if (len > r) {
        // joystick acompanha o dedo se ele passar do limite
        ox += (dx / len) * (len - r);
        oy += (dy / len) * (len - r);
        place(ox, oy);
        dx = e.clientX - ox;
        dy = e.clientY - oy;
      }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      let mx = dx / r, my = dy / r;
      if (Math.hypot(mx, my) < 0.2) mx = my = 0;
      human.stick.mx = U.clamp(mx, -1, 1);
      human.stick.my = U.clamp(my, -1, 1);
    });
    const end = (e) => {
      if (e.pointerId !== sid) return;
      sid = null;
      human.stick.mx = human.stick.my = 0;
      base.classList.remove('active');
      knob.style.transform = 'translate(-50%,-50%)';
      RR.input.layout();
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    for (const b of BUTTONS) {
      const el = document.createElement('div');
      el.className = 'tbtn tbtn-' + b;
      el.innerHTML = ICONS[b] + (b === 'ult' ? '<i class="ultfill"></i>' : '') + (b === 'special' ? '<i class="cdfill"></i>' : '');
      const down = (e) => {
        e.preventDefault();
        el.classList.add('down');
        human.press(b);
      };
      const up = (e) => {
        e.preventDefault();
        el.classList.remove('down');
        human.release(b);
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
      root.appendChild(el);
      els.btns[b] = el;
    }
    RR.input.layout();
  };

  RR.input.layout = function () {
    if (!built) return;
    const k = RR.settings.ctrlSize;
    const op = RR.settings.ctrlOpacity;
    for (const b of BUTTONS) {
      const L = LAYOUT[b];
      const el = els.btns[b];
      el.style.right = L.r * k + 'px';
      el.style.bottom = L.b * k + 'px';
      el.style.width = el.style.height = L.s * k + 'px';
      el.style.fontSize = L.s * k * 0.42 + 'px';
      el.style.opacity = op;
    }
    const s = 124 * k;
    els.base.style.width = els.base.style.height = s + 'px';
    els.knob.style.width = els.knob.style.height = s * 0.45 + 'px';
    els.base.style.opacity = Math.min(1, op + 0.1);
    if (!els.base.classList.contains('active')) {
      els.base.style.left = 130 * k + 'px';
      els.base.style.top = window.innerHeight - 120 * k + 'px';
    }
  };

  // atualiza indicadores (ultimate e recarga do especial)
  RR.input.updateHUD = function (f) {
    if (!built || !f) return;
    const u = els.btns.ult;
    u.style.setProperty('--fill', f.ult / 100);
    u.classList.toggle('ready', f.ult >= 100);
    const m = f.def.moves.special;
    els.btns.special.style.setProperty('--cd', m.cooldown ? f.cd.special / m.cooldown : 0);
  };
})(window.RR);
