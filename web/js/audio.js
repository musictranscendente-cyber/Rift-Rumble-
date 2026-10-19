// Efeitos sonoros e música sintetizados com WebAudio (sem arquivos externos)
(function (RR) {
  const A = (RR.audio = {});
  let ctx = null;
  let master, sfxGain, musicGain, noiseBuf;
  let muted = false; // mudo pedido pelo site (CrazyGames)

  A.init = function () {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.7;
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  };

  A.setMuted = function (m) {
    muted = !!m;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.05);
  };

  A.suspend = () => ctx && ctx.state === 'running' && ctx.suspend();
  A.resume = () => ctx && ctx.state === 'suspended' && ctx.resume();

  function tone(type, f0, f1, dur, vol, delay, dest) {
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest || sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, freq, q, type, freq1, at, dest) {
    const t = at || ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.setValueAtTime(freq, t);
    if (freq1) f.frequency.exponentialRampToValueAtTime(freq1, t + dur);
    f.Q.value = q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest || sfxGain);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  A.play = function (name, p) {
    if (!ctx || !RR.settings.sound) return;
    if (RR.match && RR.match.demo && name !== 'click') return; // demo dos menus fica em silêncio
    p = p || 0;
    switch (name) {
      case 'jump': tone('sine', 300, 620, 0.12, 0.16); break;
      case 'djump': tone('sine', 460, 920, 0.12, 0.13); break;
      case 'swing': noise(0.11, 0.22, 900, 1.2, 'bandpass', 3200); break;
      case 'hit': {
        const v = Math.min(1, 0.45 + p / 20);
        noise(0.12 + p * 0.008, 0.5 * v, 1400, 0.8, 'lowpass', 300);
        tone('square', 190, 60, 0.1 + p * 0.008, 0.22 * v);
        break;
      }
      case 'heavyhit':
        noise(0.4, 0.75, 2400, 0.7, 'lowpass', 150);
        tone('sawtooth', 130, 35, 0.4, 0.35);
        break;
      case 'shield': tone('triangle', 900, 650, 0.08, 0.14); break;
      case 'shieldbreak':
        tone('square', 600, 90, 0.5, 0.22);
        noise(0.4, 0.4, 3000, 1, 'highpass');
        break;
      case 'land': noise(0.06, 0.12, 400, 1, 'lowpass'); break;
      case 'fire':
        noise(0.25, 0.3, 1500, 0.5, 'bandpass', 400);
        tone('sawtooth', 220, 110, 0.2, 0.08);
        break;
      case 'ice':
        tone('triangle', 1800, 2400, 0.1, 0.11);
        tone('sine', 2600, 1800, 0.15, 0.07, 0.03);
        break;
      case 'wind':
      case 'dash': noise(0.22, 0.3, 600, 1, 'bandpass', 4200); break;
      case 'rock':
        noise(0.3, 0.5, 320, 0.6, 'lowpass', 80);
        tone('sine', 95, 40, 0.3, 0.35);
        break;
      case 'teleport':
        tone('sine', 1200, 300, 0.18, 0.14);
        tone('sine', 300, 1500, 0.18, 0.11, 0.12);
        break;
      case 'ult':
        tone('sawtooth', 110, 880, 0.7, 0.22);
        noise(0.7, 0.3, 500, 1, 'bandpass', 5000);
        break;
      case 'ko':
        noise(0.9, 0.75, 3000, 0.5, 'lowpass', 90);
        tone('sawtooth', 320, 30, 0.9, 0.3);
        break;
      case 'beep': tone('square', 660, 0, 0.14, 0.14); break;
      case 'go': tone('square', 990, 0, 0.35, 0.16); tone('square', 1320, 0, 0.35, 0.1, 0.05); break;
      case 'click': tone('triangle', 800, 1250, 0.05, 0.12); break;
      case 'respawn': tone('sine', 400, 1200, 0.3, 0.13); break;
      case 'ledge': tone('triangle', 500, 720, 0.06, 0.1); break;
      case 'game':
        tone('square', 523, 0, 0.18, 0.14);
        tone('square', 659, 0, 0.18, 0.14, 0.18);
        tone('square', 784, 0, 0.5, 0.14, 0.36);
        break;
    }
  };

  // ---------- Música procedural ----------
  const BPM = 132;
  const STEP = 60 / BPM / 4;
  const BASS = [0, -1, 12, -1, 0, 0, 10, -1, 0, -1, 12, -1, 3, -1, 5, 7];
  const ROOTS = [0, -4, -2, -5]; // Lá menor, Fá, Sol, Mi menor
  const THIRDS = [3, 4, 4, 3];
  let timer = null;
  let nextT = 0;
  let step = 0;
  let musicVol = 0;

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function note(type, f, t, dur, vol, cutoff) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = cutoff;
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl);
    fl.connect(g);
    g.connect(musicGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function playStep(s, t) {
    const bar = Math.floor(s / 16) % 4;
    const root = 45 + ROOTS[bar];
    const b = BASS[s % 16];
    if (b >= 0) note('sawtooth', midi(root + b), t, STEP * 0.9, 0.16, 700);
    if (s % 4 === 0) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.14);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(g);
      g.connect(musicGain);
      o.start(t);
      o.stop(t + 0.16);
    }
    if (s % 8 === 4) noise(0.12, 0.22, 1800, 0.7, 'highpass', 0, t, musicGain);
    if (s % 2 === 1) noise(0.03, 0.06, 8000, 1, 'highpass', 0, t, musicGain);
    if (s % 2 === 0) {
      const third = THIRDS[bar];
      const arp = [0, third, 7, 12, 7 + 12, 12, 7, third];
      const n = arp[(s / 2) % 8];
      note('square', midi(root + 24 + n), t, STEP * 0.8, 0.045, 2600);
    }
  }

  function schedule() {
    if (!ctx) return;
    while (nextT < ctx.currentTime + 0.25) {
      playStep(step, nextT);
      nextT += STEP;
      step = (step + 1) % 64;
    }
  }

  A.music = function (vol) {
    musicVol = vol;
    if (!ctx) return;
    const v = RR.settings.music ? vol : 0;
    musicGain.gain.setTargetAtTime(v, ctx.currentTime, 0.3);
    if (v > 0 && !timer) {
      nextT = ctx.currentTime + 0.06;
      timer = setInterval(schedule, 60);
    } else if (v === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  A.refresh = () => A.music(musicVol);
})(window.RR);
