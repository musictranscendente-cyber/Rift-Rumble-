// Utilitários gerais e configurações salvas
window.RR = window.RR || {};
(function (RR) {
  const U = (RR.U = {});

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.sign = (v) => (v < 0 ? -1 : 1);
  U.deg = (d) => (d * Math.PI) / 180;
  U.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  U.rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  U.store = {
    get(k, def) {
      try {
        const v = localStorage.getItem('rr_' + k);
        return v == null ? def : JSON.parse(v);
      } catch (e) {
        return def;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem('rr_' + k, JSON.stringify(v));
      } catch (e) {}
    },
  };

  const DEFAULT_SETTINGS = {
    sound: true,
    music: true,
    vibration: true,
    ctrlSize: 1,
    ctrlOpacity: 0.6,
    hitboxes: false,
  };
  RR.settings = Object.assign({}, DEFAULT_SETTINGS, U.store.get('settings', {}));
  U.saveSettings = () => U.store.set('settings', RR.settings);

  U.vibrate = (ms) => {
    if (!RR.settings.vibration) return;
    try {
      if (window.AndroidBridge && window.AndroidBridge.vibrate) {
        window.AndroidBridge.vibrate(ms | 0);
        return;
      }
      if (navigator.vibrate) navigator.vibrate(ms | 0);
    } catch (e) {}
  };

  U.blankInput = () => ({
    mx: 0,
    my: 0,
    jumpP: false,
    jumpH: false,
    attackP: false,
    specialP: false,
    shieldH: false,
    shieldP: false,
    ultP: false,
    downP: false,
    upP: false,
    sideP: 0,
  });
})(window.RR);
