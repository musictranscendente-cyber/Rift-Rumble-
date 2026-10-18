// Arte em estilo cartoon: contorno grosso, sombreamento em tons (cel shading),
// personagens com articulações e cenários em camadas com paralaxe.
(function (RR) {
  const A = (RR.art = {});
  const TAU = Math.PI * 2;
  const OL = '#1b1230'; // cor do contorno
  const O = 3.5; // espessura do contorno (unidades do mundo)

  // ---------------- Cores ----------------
  const rgb = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const mix = (h, t, k) => {
    const a = rgb(h), b = rgb(t);
    return '#' + a.map((c, i) => Math.round(c + (b[i] - c) * k).toString(16).padStart(2, '0')).join('');
  };
  const dk = (h, k) => mix(h, '#000000', k);
  const lt = (h, k) => mix(h, '#ffffff', k);
  const rgba = (h, a) => {
    const [r, g, b] = rgb(h);
    return `rgba(${r},${g},${b},${a})`;
  };
  A.mix = mix;
  A.dk = dk;
  A.lt = lt;

  // números pseudoaleatórios fixos (o cenário não muda a cada quadro)
  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  // ---------------- Primitivas com contorno ----------------
  function outline(ctx, fill, w) {
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.lineWidth = w || O;
    ctx.strokeStyle = OL;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // preenche com sombra na parte de trás/de baixo e luz na frente/em cima
  function cel(ctx, path, base, k, hl) {
    ctx.save();
    path();
    ctx.clip();
    ctx.fillStyle = dk(base, 0.3);
    ctx.fillRect(-2000, -2000, 4000, 4000);
    ctx.translate(k, -k * 0.6);
    path();
    ctx.fillStyle = base;
    ctx.fill();
    if (hl) {
      ctx.fillStyle = rgba(lt(base, 0.6), 0.55);
      ctx.beginPath();
      ctx.ellipse(hl[0], hl[1], hl[2], hl[3], hl[4] || 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    path();
    outline(ctx, null);
  }

  // membro com cotovelo/joelho: retorna a ponta
  function limb(ctx, x, y, a, bend, l1, l2, w, col) {
    const kx = x + Math.sin(a) * l1, ky = y + Math.cos(a) * l1;
    const a2 = a + bend;
    const ex = kx + Math.sin(a2) * l2, ey = ky + Math.cos(a2) * l2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = OL;
    ctx.lineWidth = w + O * 2;
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.stroke();
    // brilho fino no lado da frente
    ctx.strokeStyle = rgba(lt(col, 0.5), 0.35);
    ctx.lineWidth = w * 0.25;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y);
    ctx.lineTo(kx + w * 0.2, ky);
    ctx.stroke();
    return { kx, ky, ex, ey, a2 };
  }

  function ball(ctx, x, y, r, col) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    outline(ctx, col);
    ctx.fillStyle = rgba(lt(col, 0.6), 0.5);
    ctx.beginPath();
    ctx.arc(x + r * 0.25, y - r * 0.3, r * 0.35, 0, TAU);
    ctx.fill();
  }

  function boot(ctx, L, r, col) {
    ctx.beginPath();
    ctx.ellipse(L.ex + r * 0.45, L.ey + r * 0.1, r * 1.35, r * 0.85, 0, 0, TAU);
    outline(ctx, col);
  }

  function eye(ctx, x, y, s, p, iris) {
    if (p.eyes === 'x') {
      ctx.strokeStyle = OL;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - s, y - s);
      ctx.lineTo(x + s, y + s);
      ctx.moveTo(x + s, y - s);
      ctx.lineTo(x - s, y + s);
      ctx.stroke();
      return;
    }
    if (p.eyes === 'blink') {
      ctx.strokeStyle = OL;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - s, y + 1);
      ctx.quadraticCurveTo(x, y + s * 0.6, x + s, y + 1);
      ctx.stroke();
      return;
    }
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.85, s * 1.15, 0, 0, TAU);
    outline(ctx, '#ffffff', 2.5);
    ctx.fillStyle = iris || '#2a1a4a';
    ctx.beginPath();
    ctx.ellipse(x + s * 0.25, y + s * 0.1, s * 0.5, s * 0.72, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + s * 0.4, y - s * 0.25, s * 0.22, 0, TAU);
    ctx.fill();
  }

  function brow(ctx, x, y, s, angry) {
    ctx.strokeStyle = OL;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - s, y - (angry ? s * 0.5 : 0));
    ctx.lineTo(x + s, y + (angry ? s * 0.3 : 0));
    ctx.stroke();
  }

  // proporções comuns
  function frame(d, p) {
    const H = d.h, W = d.w;
    const cr = (p.crouch || 0) * H * 0.18;
    const bob = p.bob || 0;
    const f = {
      H, W, cr,
      hipY: -H * 0.32 + cr,
      shY: -H * 0.6 + cr + bob,
      headY: -H * 0.8 + cr + bob,
      thigh: H * 0.165 - cr * 0.45,
      shin: H * 0.155 - cr * 0.4,
      ua: H * 0.15,
      fa: H * 0.14,
      elbow: p.elbow != null ? p.elbow : 0.55,
    };
    f.kneeF = -(0.2 + Math.max(0, p.legF || 0) * 0.55 + (p.crouch || 0) * 1.4);
    f.kneeB = -(0.2 + Math.max(0, p.legB || 0) * 0.55 + (p.crouch || 0) * 1.4);
    return f;
  }

  // ---------------- KAEL ----------------
  function kael(ctx, d, p, t, C) {
    const F = frame(d, p), H = F.H, W = F.W;
    const tunic = C(d.color), acc = C(d.color2), pants = C(d.dark), skin = C('#ffd9b8');
    const hair = C(dk(d.color, 0.3)), bootC = C('#4a2c1c'), steel = C('#e3ebf5');
    const hr = H * 0.2, hx = W * 0.06, hy = F.headY;

    // perna e braço de trás
    const lb = limb(ctx, -W * 0.1, F.hipY, p.legB, F.kneeB, F.thigh, F.shin, W * 0.22, dk(pants, 0.25));
    boot(ctx, lb, W * 0.13, dk(bootC, 0.2));
    const ab = limb(ctx, -W * 0.16, F.shY + 6, p.armB, F.elbow, F.ua, F.fa, W * 0.17, dk(tunic, 0.3));
    ball(ctx, ab.ex, ab.ey, W * 0.1, dk(skin, 0.15));

    // capa curta
    const wave = Math.sin(t * 0.18) * 5;
    ctx.beginPath();
    ctx.moveTo(-W * 0.18, F.shY - 2);
    ctx.quadraticCurveTo(-W * 0.75, F.shY + 14 + wave, -W * 0.85 + wave * 0.5, F.hipY + 8);
    ctx.lineTo(-W * 0.45, F.hipY - 4);
    ctx.quadraticCurveTo(-W * 0.3, F.shY + 20, -W * 0.05, F.shY + 6);
    ctx.closePath();
    outline(ctx, dk(tunic, 0.4));

    const lf = limb(ctx, W * 0.08, F.hipY, p.legF, F.kneeF, F.thigh, F.shin, W * 0.22, pants);
    boot(ctx, lf, W * 0.13, bootC);

    // túnica
    const tw = W * 0.66;
    cel(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-tw * 0.5, F.shY - 2);
      ctx.quadraticCurveTo(0, F.shY - 10, tw * 0.5, F.shY - 2);
      ctx.lineTo(tw * 0.64, F.hipY + 12);
      ctx.quadraticCurveTo(0, F.hipY + 20, -tw * 0.64, F.hipY + 12);
      ctx.closePath();
    }, tunic, 6, [tw * 0.15, F.shY + 10, tw * 0.18, 8]);
    // cinto
    ctx.beginPath();
    ctx.rect(-tw * 0.56, F.hipY - 3, tw * 1.12, 8);
    outline(ctx, dk(acc, 0.35), 2.5);
    ctx.beginPath();
    ctx.rect(tw * 0.05, F.hipY - 5, 11, 12);
    outline(ctx, acc, 2.5);

    // ombreira
    ctx.beginPath();
    ctx.ellipse(W * 0.1, F.shY + 6, W * 0.16, W * 0.1, -0.2, 0, TAU);
    outline(ctx, acc);

    // cabeça
    cel(ctx, () => {
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0, TAU);
    }, skin, 4);
    // cabelo espetado
    const hp = [[-1.05, 0.3], [-1.5, -0.3], [-1.0, -0.5], [-1.2, -1.2], [-0.45, -0.95], [-0.2, -1.6], [0.3, -1.02],
      [0.9, -1.35], [0.82, -0.72], [1.2, -0.5], [0.95, -0.2], [0.35, -0.5], [-0.15, -0.3], [-0.5, 0.15]];
    cel(ctx, () => {
      ctx.beginPath();
      hp.forEach(([x, y], i) => (i ? ctx.lineTo(hx + x * hr, hy + y * hr) : ctx.moveTo(hx + x * hr, hy + y * hr)));
      ctx.closePath();
    }, hair, 4, [hx + hr * 0.1, hy - hr * 0.9, hr * 0.35, hr * 0.12, -0.4]);
    // faixa
    ctx.beginPath();
    ctx.moveTo(-hr * 0.95 + hx, hy - hr * 0.3);
    ctx.lineTo(hx + hr * 0.98, hy - hr * 0.42);
    ctx.lineWidth = 7 + O * 2;
    ctx.strokeStyle = OL;
    ctx.stroke();
    ctx.lineWidth = 7;
    ctx.strokeStyle = acc;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.95, hy - hr * 0.3);
    ctx.quadraticCurveTo(hx - hr * 1.6, hy - hr * 0.1 + wave * 0.6, hx - hr * 2.0, hy + hr * 0.2 + wave);
    ctx.lineWidth = 3.5 + O * 2;
    ctx.strokeStyle = OL;
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = dk(acc, 0.15);
    ctx.stroke();
    // rosto
    eye(ctx, hx + hr * 0.48, hy + hr * 0.05, hr * 0.24, p);
    if (p.eyes === 'open') brow(ctx, hx + hr * 0.48, hy - hr * 0.3, hr * 0.26, true);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.45, hy + hr * 0.6);
    ctx.lineTo(hx + hr * 0.72, hy + hr * 0.55);
    ctx.stroke();

    // braço da frente + espada
    const af = limb(ctx, W * 0.14, F.shY + 6, p.armF, F.elbow, F.ua, F.fa, W * 0.17, tunic);
    sword(ctx, af.ex, af.ey, af.a2 + (p.glow ? 0 : 1.1), 66, steel, acc, p.glow);
    ball(ctx, af.ex, af.ey, W * 0.1, skin);
  }

  function sword(ctx, x, y, a, len, steel, guard, glow) {
    const dx = Math.sin(a), dy = Math.cos(a);
    const px = -dy, py = dx;
    // cabo
    ctx.beginPath();
    ctx.moveTo(x - dx * 14, y - dy * 14);
    ctx.lineTo(x, y);
    ctx.lineWidth = 6 + O * 2;
    ctx.strokeStyle = OL;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#6b4226';
    ctx.stroke();
    // lâmina
    const bx = x + dx * 6, by = y + dy * 6;
    ctx.beginPath();
    ctx.moveTo(bx + px * 5, by + py * 5);
    ctx.lineTo(bx + dx * len * 0.86 + px * 4, by + dy * len * 0.86 + py * 4);
    ctx.lineTo(bx + dx * len, by + dy * len);
    ctx.lineTo(bx + dx * len * 0.86 - px * 4, by + dy * len * 0.86 - py * 4);
    ctx.lineTo(bx - px * 5, by - py * 5);
    ctx.closePath();
    if (glow) {
      ctx.save();
      ctx.lineWidth = 16;
      ctx.strokeStyle = 'rgba(255,140,42,0.45)';
      ctx.stroke();
      ctx.restore();
    }
    outline(ctx, steel, 3);
    ctx.strokeStyle = glow ? '#ff8c2a' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + px * 2 + dx * 6, by + py * 2 + dy * 6);
    ctx.lineTo(bx + dx * len * 0.84 + px * 1.5, by + dy * len * 0.84 + py * 1.5);
    ctx.stroke();
    // guarda
    ctx.beginPath();
    ctx.moveTo(bx + px * 12, by + py * 12);
    ctx.lineTo(bx - px * 12, by - py * 12);
    ctx.lineWidth = 6 + O * 2;
    ctx.strokeStyle = OL;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = guard;
    ctx.stroke();
  }

  function dagger(ctx, x, y, a, len, steel) {
    const dx = Math.sin(a), dy = Math.cos(a);
    const px = -dy, py = dx;
    ctx.beginPath();
    ctx.moveTo(x + px * 4, y + py * 4);
    ctx.lineTo(x + dx * len, y + dy * len);
    ctx.lineTo(x - px * 4, y - py * 4);
    ctx.closePath();
    outline(ctx, steel, 2.5);
  }

  // ---------------- ZYRA ----------------
  function zyra(ctx, d, p, t, C) {
    const F = frame(d, p), H = F.H, W = F.W;
    const suit = C(d.color), dark = C(d.dark), wrap = C(d.color2), scarf = C('#ff4d6d'), skin = C('#f3c9a5');
    const steel = C('#dffcff');
    const hr = H * 0.19, hx = W * 0.06, hy = F.headY;

    const lb = limb(ctx, -W * 0.08, F.hipY, p.legB, F.kneeB, F.thigh, F.shin, W * 0.2, dk(suit, 0.3));
    boot(ctx, lb, W * 0.11, dk(dark, 0.2));
    const ab = limb(ctx, -W * 0.14, F.shY + 6, p.armB, F.elbow, F.ua, F.fa, W * 0.15, dk(suit, 0.3));
    dagger(ctx, ab.ex, ab.ey, ab.a2, 26, dk(steel, 0.15));
    ball(ctx, ab.ex, ab.ey, W * 0.1, dk(dark, 0.1));

    // cachecol longo
    const pts = [];
    for (let i = 0; i <= 7; i++) {
      const k = i / 7;
      pts.push([-4 - i * 13, F.shY - 2 + Math.sin(t * 0.25 + i * 0.9) * 6 * k + i * 2.5, 9 - k * 4]);
    }
    ctx.beginPath();
    pts.forEach(([x, y, w], i) => (i ? ctx.lineTo(x, y - w / 2) : ctx.moveTo(x, y - w / 2)));
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + pts[i][2] / 2);
    ctx.closePath();
    outline(ctx, scarf, 3);

    const lf = limb(ctx, W * 0.08, F.hipY, p.legF, F.kneeF, F.thigh, F.shin, W * 0.2, suit);
    boot(ctx, lf, W * 0.11, dark);
    // faixas nas canelas
    ctx.strokeStyle = wrap;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lf.kx - 6, lf.ky + 8);
    ctx.lineTo(lf.kx + 6, lf.ky + 12);
    ctx.stroke();

    const tw = W * 0.56;
    cel(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-tw * 0.5, F.shY - 2);
      ctx.quadraticCurveTo(0, F.shY - 8, tw * 0.5, F.shY - 2);
      ctx.lineTo(tw * 0.42, F.hipY + 8);
      ctx.lineTo(-tw * 0.42, F.hipY + 8);
      ctx.closePath();
    }, suit, 5, [tw * 0.15, F.shY + 8, tw * 0.15, 7]);
    // faixa diagonal
    ctx.beginPath();
    ctx.moveTo(-tw * 0.45, F.shY + 2);
    ctx.lineTo(tw * 0.4, F.hipY);
    ctx.lineWidth = 6 + O;
    ctx.strokeStyle = OL;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = wrap;
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(-tw * 0.48, F.hipY - 2, tw * 0.96, 7);
    outline(ctx, dark, 2.5);

    // cabeça: capuz, abertura do rosto e máscara
    cel(ctx, () => {
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0, TAU);
    }, dark, 4, [hx - hr * 0.2, hy - hr * 0.6, hr * 0.4, hr * 0.15]);
    const fx = hx + hr * 0.38, fw = hr * 0.62, fh = hr * 0.42;
    ctx.beginPath();
    ctx.ellipse(fx, hy - hr * 0.05, fw, fh, 0, 0, TAU);
    outline(ctx, skin, 2.5);
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.4, hy + hr * 0.12);
    ctx.quadraticCurveTo(fx, hy + hr * 0.02, hx + hr * 1.02, hy + hr * 0.12);
    ctx.lineTo(hx + hr * 0.85, hy + hr * 0.7);
    ctx.quadraticCurveTo(hx + hr * 0.2, hy + hr * 1.05, hx - hr * 0.4, hy + hr * 0.6);
    ctx.closePath();
    outline(ctx, suit, 3);
    eye(ctx, hx + hr * 0.52, hy - hr * 0.12, hr * 0.22, p, '#0b5c49');
    if (p.eyes === 'open') brow(ctx, hx + hr * 0.5, hy - hr * 0.45, hr * 0.24, true);
    // bandana com pontas
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.98, hy - hr * 0.5);
    ctx.lineTo(hx + hr * 0.9, hy - hr * 0.62);
    ctx.lineWidth = 6 + O * 2;
    ctx.strokeStyle = OL;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = scarf;
    ctx.stroke();
    const kw = Math.sin(t * 0.3) * 4;
    for (const off of [0, 7]) {
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.98, hy - hr * 0.5);
      ctx.lineTo(hx - hr * 1.7, hy - hr * 0.4 + off + kw);
      outline(ctx, null, 5);
      ctx.strokeStyle = scarf;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const af = limb(ctx, W * 0.14, F.shY + 6, p.armF, F.elbow, F.ua, F.fa, W * 0.15, suit);
    dagger(ctx, af.ex, af.ey, af.a2, 30, steel);
    ball(ctx, af.ex, af.ey, W * 0.1, dark);
  }

  // ---------------- GORAK ----------------
  function gorak(ctx, d, p, t, C) {
    const F = frame(d, p), H = F.H, W = F.W;
    const rock = C(d.color), dark = C(d.dark), glow = C(d.color2), moss = C('#6fbf4a');
    const thigh = H * 0.12, shin = H * 0.12, ua = H * 0.15, fa = H * 0.15;
    const hipY = -H * 0.25 + F.cr;

    const lb = limb(ctx, -W * 0.18, hipY, p.legB, F.kneeB * 0.6, thigh, shin, W * 0.3, dk(rock, 0.35));
    boot(ctx, lb, W * 0.14, dk(dark, 0.2));
    const ab = limb(ctx, -W * 0.32, F.shY + 8, p.armB, F.elbow * 0.6, ua, fa, W * 0.25, dk(rock, 0.35));
    fist(ctx, ab.ex, ab.ey, H * 0.1, dk(rock, 0.3), dark);

    const lf = limb(ctx, W * 0.14, hipY, p.legF, F.kneeF * 0.6, thigh, shin, W * 0.3, rock);
    boot(ctx, lf, W * 0.14, dark);

    // corpo de pedra irregular
    const cy = (F.shY + hipY) / 2 - 4;
    const bp = [[-0.55, -0.62], [-0.15, -0.8], [0.35, -0.74], [0.62, -0.42], [0.6, 0.15], [0.42, 0.6], [-0.05, 0.72], [-0.48, 0.55], [-0.66, 0.05]];
    const bw = W * 0.95, bh = (hipY - F.shY) * 1.25;
    cel(ctx, () => {
      ctx.beginPath();
      bp.forEach(([x, y], i) => (i ? ctx.lineTo(x * bw, cy + y * bh) : ctx.moveTo(x * bw, cy + y * bh)));
      ctx.closePath();
    }, rock, 9, [bw * 0.12, cy - bh * 0.45, bw * 0.2, bh * 0.1, -0.3]);
    // placas e rachaduras brilhantes
    ctx.strokeStyle = dk(rock, 0.45);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.4, cy + bh * 0.1);
    ctx.lineTo(-bw * 0.1, cy + bh * 0.25);
    ctx.lineTo(bw * 0.05, cy + bh * 0.55);
    ctx.stroke();
    const pulse = 0.6 + 0.4 * Math.sin(t * 0.12);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(glow, 0.35 * pulse);
    ctx.lineWidth = 10;
    const crack = () => {
      ctx.beginPath();
      ctx.moveTo(-bw * 0.05, cy - bh * 0.55);
      ctx.lineTo(bw * 0.12, cy - bh * 0.2);
      ctx.lineTo(-bw * 0.02, cy + bh * 0.05);
      ctx.lineTo(bw * 0.22, cy + bh * 0.35);
      ctx.moveTo(bw * 0.12, cy - bh * 0.2);
      ctx.lineTo(bw * 0.38, cy - bh * 0.1);
    };
    crack();
    ctx.stroke();
    ctx.strokeStyle = lt(glow, 0.3);
    ctx.lineWidth = 3.5;
    crack();
    ctx.stroke();
    ctx.restore();
    // musgo nos ombros
    for (const [mx, my] of [[-0.45, -0.62], [-0.2, -0.78]]) {
      ctx.beginPath();
      ctx.arc(mx * bw, cy + my * bh, 7, Math.PI, 0);
      outline(ctx, moss, 2.5);
    }

    // cabeça pequena encaixada
    const hr = H * 0.13, hx = W * 0.14, hy = F.headY + hr * 0.95;
    cel(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(hx - hr, hy + hr * 0.6);
      ctx.lineTo(hx - hr * 1.05, hy - hr * 0.4);
      ctx.lineTo(hx - hr * 0.4, hy - hr * 1.05);
      ctx.lineTo(hx + hr * 0.6, hy - hr * 0.95);
      ctx.lineTo(hx + hr * 1.1, hy - hr * 0.2);
      ctx.lineTo(hx + hr * 0.9, hy + hr * 0.7);
      ctx.closePath();
    }, lt(rock, 0.08), 5);
    // sobrancelha de pedra
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.2, hy - hr * 0.45);
    ctx.lineTo(hx + hr * 1.12, hy - hr * 0.25);
    ctx.lineTo(hx + hr * 1.05, hy - hr * 0.05);
    ctx.lineTo(hx - hr * 0.1, hy - hr * 0.2);
    ctx.closePath();
    outline(ctx, dk(rock, 0.3), 2.5);
    if (p.eyes === 'x') eye(ctx, hx + hr * 0.55, hy + hr * 0.2, hr * 0.28, p);
    else {
      const h = p.eyes === 'blink' ? 1.5 : hr * 0.22;
      ctx.fillStyle = rgba(glow, 0.35);
      ctx.beginPath();
      ctx.ellipse(hx + hr * 0.6, hy + hr * 0.1, hr * 0.45, hr * 0.32, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(hx + hr * 0.6, hy + hr * 0.1, hr * 0.26, h, 0, 0, TAU);
      ctx.fill();
    }

    // ombros
    ctx.beginPath();
    ctx.ellipse(W * 0.38, F.shY + 2, W * 0.24, W * 0.2, 0.3, 0, TAU);
    outline(ctx, lt(rock, 0.05));
    const af = limb(ctx, W * 0.4, F.shY + 8, p.armF, F.elbow * 0.6, ua, fa, W * 0.25, rock);
    fist(ctx, af.ex, af.ey, H * 0.105, rock, dark);
  }

  function fist(ctx, x, y, r, col, dark) {
    ctx.beginPath();
    ctx.moveTo(x - r, y - r * 0.3);
    ctx.lineTo(x - r * 0.6, y - r);
    ctx.lineTo(x + r * 0.5, y - r * 0.95);
    ctx.lineTo(x + r, y - r * 0.1);
    ctx.lineTo(x + r * 0.7, y + r * 0.85);
    ctx.lineTo(x - r * 0.5, y + r * 0.9);
    ctx.closePath();
    outline(ctx, col);
    ctx.strokeStyle = dk(col, 0.4);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.1, y - r * 0.6);
    ctx.lineTo(x + r * 0.1, y + r * 0.2);
    ctx.stroke();
  }

  // ---------------- LUMI ----------------
  function lumi(ctx, d, p, t, C) {
    const F = frame(d, p), H = F.H, W = F.W;
    const robe = C(d.color), trim = C(d.color2), dark = C(d.dark), skin = C('#ffe2cc');
    const hair = C('#eef4ff'), wood = C('#8a5a34'), star = C('#ffd166');
    const hr = H * 0.2, hx = W * 0.06, hy = F.headY;

    // pés aparecendo embaixo do manto
    const footY = -H * 0.12 + F.cr * 0.4;
    limb(ctx, -W * 0.12, footY, (p.legB || 0) * 0.4, 0, H * 0.07, 1, W * 0.18, dark);
    ctx.beginPath();
    ctx.ellipse(-W * 0.06 + Math.sin((p.legB || 0) * 0.4) * H * 0.07, footY + H * 0.08, W * 0.16, W * 0.1, 0, 0, TAU);
    outline(ctx, dk(dark, 0.2));
    limb(ctx, W * 0.1, footY, (p.legF || 0) * 0.4, 0, H * 0.07, 1, W * 0.18, dark);
    ctx.beginPath();
    ctx.ellipse(W * 0.16 + Math.sin((p.legF || 0) * 0.4) * H * 0.07, footY + H * 0.08, W * 0.16, W * 0.1, 0, 0, TAU);
    outline(ctx, dark);

    // cabelo longo atrás
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.8, hy - hr * 0.2);
    ctx.quadraticCurveTo(hx - hr * 1.6, hy + hr * 1.2 + Math.sin(t * 0.1) * 3, hx - hr * 0.9, hy + hr * 2.0);
    ctx.lineTo(hx - hr * 0.2, hy + hr * 0.8);
    ctx.closePath();
    outline(ctx, dk(hair, 0.12));

    const ab = limb(ctx, -W * 0.14, F.shY + 6, p.armB, F.elbow, F.ua, F.fa, W * 0.22, dk(robe, 0.3));
    ball(ctx, ab.ex, ab.ey, W * 0.1, dk(skin, 0.15));

    // manto
    const bot = -H * 0.1 + F.cr * 0.3;
    const sway = Math.sin(t * 0.08) * 3;
    const robePath = () => {
      ctx.beginPath();
      ctx.moveTo(-W * 0.28, F.shY - 3);
      ctx.quadraticCurveTo(0, F.shY - 9, W * 0.3, F.shY - 3);
      ctx.quadraticCurveTo(W * 0.5, (F.shY + bot) / 2, W * 0.62 + sway, bot);
      ctx.quadraticCurveTo(W * 0.3, bot + 8, 0, bot + 2);
      ctx.quadraticCurveTo(-W * 0.3, bot + 8, -W * 0.62 + sway, bot);
      ctx.quadraticCurveTo(-W * 0.5, (F.shY + bot) / 2, -W * 0.28, F.shY - 3);
      ctx.closePath();
    };
    cel(ctx, robePath, robe, 6, [W * 0.12, F.shY + 14, W * 0.12, 10]);
    // barra e abertura frontal
    ctx.save();
    robePath();
    ctx.clip();
    ctx.fillStyle = trim;
    ctx.fillRect(-W, bot - 9, W * 2, 20);
    ctx.fillRect(W * 0.14, F.shY, 5, bot - F.shY);
    ctx.restore();
    robePath();
    outline(ctx, null);
    // gola
    ctx.beginPath();
    ctx.ellipse(hx + 2, F.shY - 1, W * 0.3, 6, 0, 0, TAU);
    outline(ctx, trim, 2.5);

    // cabeça
    cel(ctx, () => {
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0, TAU);
    }, skin, 4);
    // franja
    ctx.beginPath();
    ctx.moveTo(hx - hr * 1.0, hy + hr * 0.2);
    ctx.quadraticCurveTo(hx - hr * 0.9, hy - hr * 0.9, hx + hr * 0.2, hy - hr * 0.95);
    ctx.quadraticCurveTo(hx + hr * 0.9, hy - hr * 0.85, hx + hr * 1.0, hy - hr * 0.1);
    ctx.quadraticCurveTo(hx + hr * 0.55, hy - hr * 0.45, hx + hr * 0.15, hy - hr * 0.35);
    ctx.quadraticCurveTo(hx - hr * 0.3, hy - hr * 0.2, hx - hr * 0.55, hy + hr * 0.3);
    ctx.closePath();
    outline(ctx, hair, 3);
    eye(ctx, hx + hr * 0.5, hy + hr * 0.12, hr * 0.27, p, '#3b2a7a');
    if (p.eyes === 'open') {
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(hx + hr * 0.75, hy - hr * 0.2);
      ctx.lineTo(hx + hr * 0.95, hy - hr * 0.32);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,120,150,0.35)';
    ctx.beginPath();
    ctx.ellipse(hx + hr * 0.25, hy + hr * 0.5, hr * 0.18, hr * 0.1, 0, 0, TAU);
    ctx.fill();

    // chapéu de mago
    const by = hy - hr * 0.7;
    const tip = Math.sin(t * 0.07) * 4;
    cel(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.95, by);
      ctx.quadraticCurveTo(hx - hr * 0.3, by - hr * 1.4, hx - hr * 0.6 + tip, by - hr * 2.4);
      ctx.quadraticCurveTo(hx - hr * 1.3 + tip, by - hr * 2.5, hx - hr * 1.6 + tip, by - hr * 1.9);
      ctx.quadraticCurveTo(hx - hr * 0.1, by - hr * 1.95, hx + hr * 0.95, by);
      ctx.closePath();
    }, dk(robe, 0.15), 5);
    ctx.beginPath();
    ctx.ellipse(hx, by, hr * 1.7, hr * 0.36, -0.06, 0, TAU);
    outline(ctx, dk(robe, 0.25));
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.88, by - hr * 0.2);
    ctx.quadraticCurveTo(hx, by - hr * 0.45, hx + hr * 0.88, by - hr * 0.2);
    ctx.lineWidth = 6 + O;
    ctx.strokeStyle = OL;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = trim;
    ctx.stroke();
    starShape(ctx, hx - hr * 0.35, by - hr * 1.15, 7, star);

    // braço da frente + cajado
    const af = limb(ctx, W * 0.14, F.shY + 6, p.armF, F.elbow, F.ua, F.fa, W * 0.22, robe);
    const dx = Math.sin(af.a2), dy = Math.cos(af.a2);
    const ux = dy, uy = -dx;
    const tx = af.ex + ux * 66, ty = af.ey + uy * 66;
    ctx.beginPath();
    ctx.moveTo(af.ex - ux * 28, af.ey - uy * 28);
    ctx.lineTo(tx, ty);
    ctx.lineWidth = 6 + O * 2;
    ctx.strokeStyle = OL;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = wood;
    ctx.stroke();
    const gl = 14 + Math.sin(t * 0.15) * 3;
    ctx.fillStyle = rgba(trim, 0.3);
    ctx.beginPath();
    ctx.arc(tx, ty, gl, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tx, ty - 12);
    ctx.lineTo(tx + 7, ty);
    ctx.lineTo(tx, ty + 12);
    ctx.lineTo(tx - 7, ty);
    ctx.closePath();
    outline(ctx, trim, 3);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(tx - 2, ty - 4, 2.2, 0, TAU);
    ctx.fill();
    ball(ctx, af.ex, af.ey, W * 0.1, skin);
  }

  function starShape(ctx, x, y, r, col) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    outline(ctx, col, 2);
  }
  A.starShape = starShape;

  const MODELS = { kael, zyra, gorak, lumi };

  // desenha o personagem com os pés em (0,0), olhando para +x
  A.drawModel = function (ctx, d, p, time, tint) {
    if (d.sprite) return RR.sprites.draw(ctx, d, p, time || 0, tint);
    const C = tint ? (c) => mix(c, tint, tint === '#ffffff' ? 0.8 : 0.55) : (c) => c;
    ctx.save();
    ctx.rotate(p.lean || 0);
    (MODELS[d.id] || kael)(ctx, d, p, time || 0, C);
    ctx.restore();
  };

  // ================= CENÁRIOS =================
  const bgCache = {};
  function deco(st) {
    if (bgCache[st.id]) return bgCache[st.id];
    const r = rng(st.id.length * 977 + 13);
    const o = { stars: [], far: [], mid: [], islands: [], clouds: [], smoke: [] };
    for (let i = 0; i < 80; i++) o.stars.push({ x: r(), y: r() * 0.65, s: r() * 1.8 + 0.5, p: r() * TAU });
    for (let i = 0; i <= 14; i++) o.far.push(0.35 + r() * 0.45);
    for (let i = 0; i <= 10; i++) o.mid.push(0.2 + r() * 0.5);
    for (let i = 0; i < 4; i++) o.islands.push({ x: i / 4 + r() * 0.12, y: 0.32 + r() * 0.25, s: 0.6 + r() * 0.6 });
    for (let i = 0; i < 7; i++) o.clouds.push({ x: r(), y: 0.12 + r() * 0.45, s: 0.6 + r() * 0.9, sp: 0.05 + r() * 0.1 });
    for (let i = 0; i < 9; i++) o.smoke.push({ x: r(), p: r(), s: 0.6 + r() * 0.8 });
    return (bgCache[st.id] = o);
  }

  function ridge(ctx, pts, W, H, base, amp, offX, fill, line) {
    const n = pts.length - 1;
    const span = W * 1.5;
    const step = span / n;
    const off = -(((offX % span) + span) % span);
    ctx.beginPath();
    ctx.moveTo(-10, H + 10);
    for (let k = 0; k <= n * 2 + 1; k++) {
      const x = off + k * step;
      if (x > W + step * 2) break;
      ctx.lineTo(x, H * base - pts[k % (n + 1)] * H * amp);
    }
    ctx.lineTo(W + 10, H + 10);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (line) {
      ctx.strokeStyle = line;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  function puff(ctx, x, y, s, fill, line) {
    ctx.beginPath();
    ctx.arc(x, y, 30 * s, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(x + 32 * s, y - 22 * s, 32 * s, Math.PI, Math.PI * 1.9);
    ctx.arc(x + 75 * s, y - 12 * s, 26 * s, Math.PI * 1.2, Math.PI * 0.1);
    ctx.arc(x + 95 * s, y + 6 * s, 22 * s, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (line) {
      ctx.strokeStyle = line;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  A.drawBackground = function (ctx, g, W, H, time) {
    const st = g.stage, th = st.theme, dc = deco(st);
    const cx = g.cam.x * (RR.view ? RR.view.base : 1);
    const cy = g.cam.y * (RR.view ? RR.view.base : 1);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, th.sky[0]);
    sky.addColorStop(0.55, th.sky[1]);
    sky.addColorStop(1, th.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    if (th.split) return drawSplitSky(ctx, g, W, H, time, dc);
    if (!th.lava) {
      for (const s of dc.stars) {
        ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.45 * Math.sin(time * 0.04 + s.p)})`;
        ctx.fillRect(((s.x * W - cx * 0.02) % W + W) % W, s.y * H * 0.8, s.s, s.s);
      }
      // lua
      const mx = W * 0.78 - cx * 0.01, my = H * 0.24;
      const mr = H * 0.11;
      ctx.fillStyle = 'rgba(255,230,250,0.12)';
      ctx.beginPath();
      ctx.arc(mx, my, mr * 1.7, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, TAU);
      ctx.fillStyle = '#fff1f8';
      ctx.fill();
      ctx.strokeStyle = 'rgba(27,18,48,0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,170,220,0.5)';
      for (const [ox, oy, rr] of [[-0.3, -0.2, 0.2], [0.25, 0.15, 0.14], [-0.05, 0.4, 0.1]]) {
        ctx.beginPath();
        ctx.arc(mx + ox * mr, my + oy * mr, rr * mr, 0, TAU);
        ctx.fill();
      }
      ridge(ctx, dc.far, W, H, 0.78, 0.38, cx * 0.04, '#4a3a8e', 'rgba(27,18,48,0.45)');
      for (const c of dc.clouds) {
        const x = (((c.x * W * 1.4 - cx * 0.07 + time * c.sp) % (W * 1.4)) + W * 1.4) % (W * 1.4) - W * 0.2;
        puff(ctx, x, c.y * H - cy * 0.02, c.s * (H / 400), 'rgba(255,214,240,0.22)', null);
      }
      // ilhas flutuantes ao longe
      for (const is of dc.islands) {
        const s = is.s * (H / 420) * 0.5;
        const x = ((((is.x * W * 1.6 - cx * 0.12) % (W * 1.6)) + W * 1.6) % (W * 1.6)) - W * 0.3;
        const y = is.y * H - cy * 0.05 + Math.sin(time * 0.02 + is.x * 9) * 4;
        ctx.beginPath();
        ctx.moveTo(x - 60 * s, y);
        ctx.lineTo(x + 60 * s, y);
        ctx.lineTo(x + 30 * s, y + 30 * s);
        ctx.lineTo(x, y + 60 * s);
        ctx.lineTo(x - 28 * s, y + 32 * s);
        ctx.closePath();
        ctx.fillStyle = '#41337f';
        ctx.fill();
        ctx.strokeStyle = 'rgba(27,18,48,0.35)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = '#4f6a8e';
        ctx.fillRect(x - 60 * s, y - 4 * s, 120 * s, 6 * s);
        ctx.fillStyle = '#41337f';
        ctx.fillRect(x + 18 * s, y - 34 * s, 10 * s, 30 * s);
        ctx.fillStyle = 'rgba(159,243,255,0.25)';
        ctx.fillRect(x - 40 * s, y + 4 * s, 4 * s, 70 * s);
      }
      ridge(ctx, dc.mid, W, H, 0.98, 0.32, cx * 0.2, '#2f2568', 'rgba(27,18,48,0.7)');
      const fog = ctx.createLinearGradient(0, H * 0.7, 0, H);
      fog.addColorStop(0, 'rgba(192,86,154,0)');
      fog.addColorStop(1, 'rgba(192,86,154,0.35)');
      ctx.fillStyle = fog;
      ctx.fillRect(0, H * 0.7, W, H * 0.3);
    } else {
      // vulcão ao fundo
      const vx = W * 0.62 - cx * 0.05, vy = H * 0.86;
      const glow = ctx.createRadialGradient(vx, H * 0.38, 10, vx, H * 0.38, H * 0.5);
      glow.addColorStop(0, 'rgba(255,140,40,0.55)');
      glow.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      for (const s of dc.smoke) {
        const k = (s.p + time * 0.0015) % 1;
        ctx.fillStyle = `rgba(40,12,10,${0.5 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(vx + (s.x - 0.5) * 80 + k * 90, H * 0.4 - k * H * 0.45, (20 + k * 70) * s.s * (H / 400), 0, TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(vx - H * 0.75, vy);
      ctx.lineTo(vx - H * 0.12, H * 0.4);
      ctx.lineTo(vx - H * 0.05, H * 0.43);
      ctx.lineTo(vx + H * 0.06, H * 0.41);
      ctx.lineTo(vx + H * 0.13, H * 0.4);
      ctx.lineTo(vx + H * 0.8, vy);
      ctx.closePath();
      ctx.fillStyle = '#3a110a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,5,5,0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
      // rios de lava
      ctx.strokeStyle = '#ff7a1a';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      for (const [a, b] of [[-0.04, -0.2], [0.05, 0.25], [0.0, 0.05]]) {
        ctx.beginPath();
        ctx.moveTo(vx + a * H, H * 0.42);
        ctx.quadraticCurveTo(vx + (a + b * 0.5) * H, H * 0.58, vx + (a + b) * H, H * 0.78);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.ellipse(vx + 0.005 * H, H * 0.41, H * 0.09, H * 0.02, 0, 0, TAU);
      ctx.fill();
      ridge(ctx, dc.far, W, H, 0.9, 0.3, cx * 0.12, '#2a0d08', 'rgba(10,3,3,0.85)');
      for (const s of dc.stars) {
        const y = (((s.y + 0.3) * H - time * (0.5 + s.s * 0.4)) % H + H) % H;
        ctx.fillStyle = rgba('#ffa040', 0.4 + 0.4 * Math.sin(time * 0.05 + s.p));
        ctx.fillRect(((s.x * W - cx * 0.03) % W + W) % W, y, s.s * 1.6, s.s * 1.6);
      }
      // mar de lava
      const ly = H * 0.88 - cy * 0.03;
      const lg = ctx.createLinearGradient(0, ly, 0, H);
      lg.addColorStop(0, '#ff8a1a');
      lg.addColorStop(1, '#ffd166');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, ly + Math.sin(x * 0.03 + time * 0.06) * 4);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#7a1f05';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  // céu metade dia (esquerda) e metade noite estrelada (direita), dividido no centro da arena
  function drawSplitSky(ctx, g, W, H, time, dc) {
    const base = RR.view ? RR.view.base * g.cam.zoom : 1;
    const sx = (0 - g.cam.x) * base + W / 2; // x na tela do centro da arena
    const day = ctx.createLinearGradient(0, 0, 0, H);
    day.addColorStop(0, '#2f7fe0');
    day.addColorStop(0.6, '#8fd0ff');
    day.addColorStop(1, '#e6f6ff');
    ctx.fillStyle = day;
    ctx.fillRect(0, 0, Math.max(0, sx), H);
    const night = ctx.createLinearGradient(0, 0, 0, H);
    night.addColorStop(0, '#0d0a2e');
    night.addColorStop(0.6, '#2a1a6e');
    night.addColorStop(1, '#6a3ab8');
    ctx.fillStyle = night;
    ctx.fillRect(Math.max(0, sx), 0, W, H);
    const cx = g.cam.x * (RR.view ? RR.view.base : 1);
    for (const c of dc.clouds) {
      const x = (((c.x * W - cx * 0.05 + time * c.sp) % W) + W) % W;
      if (x + 100 < sx) puff(ctx, x, c.y * H + H * 0.3, c.s * (H / 380), 'rgba(255,255,255,0.55)', null);
    }
    for (const s of dc.stars) {
      const x = ((s.x * W - cx * 0.02) % W + W) % W;
      if (x > sx) {
        ctx.fillStyle = `rgba(255,230,255,${0.4 + 0.5 * Math.sin(time * 0.05 + s.p)})`;
        ctx.fillRect(x, s.y * H, s.s * 1.3, s.s * 1.3);
      }
    }
    // costura de luz entre os dois lados
    const seam = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0);
    seam.addColorStop(0, 'rgba(159,216,255,0)');
    seam.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    seam.addColorStop(1, 'rgba(255,95,210,0)');
    ctx.fillStyle = seam;
    ctx.fillRect(sx - 30, 0, 60, H);
  }

  // ---------------- Palco (coordenadas do mundo) ----------------
  function islandPath(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + s.w, s.y);
    ctx.quadraticCurveTo(s.x + s.w + 4, s.y + s.h * 0.25, s.x + s.w - 30, s.y + s.h * 0.42);
    ctx.lineTo(s.x + s.w * 0.78, s.y + s.h * 0.62);
    ctx.lineTo(s.x + s.w * 0.66, s.y + s.h * 0.86);
    ctx.lineTo(s.x + s.w * 0.52, s.y + s.h);
    ctx.lineTo(s.x + s.w * 0.4, s.y + s.h * 0.82);
    ctx.lineTo(s.x + s.w * 0.25, s.y + s.h * 0.68);
    ctx.lineTo(s.x + 30, s.y + s.h * 0.42);
    ctx.quadraticCurveTo(s.x - 4, s.y + s.h * 0.25, s.x, s.y);
    ctx.closePath();
  }

  function pillar(ctx, x, y, h, col, broken) {
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.lineTo(x - 14, y - h);
    if (broken) {
      ctx.lineTo(x - 4, y - h - 10);
      ctx.lineTo(x + 4, y - h + 4);
      ctx.lineTo(x + 14, y - h - 6);
    } else ctx.lineTo(x + 14, y - h);
    ctx.lineTo(x + 16, y);
    ctx.closePath();
    outline(ctx, col, 4);
    ctx.strokeStyle = dk(col, 0.25);
    ctx.lineWidth = 2.5;
    for (const k of [-6, 6]) {
      ctx.beginPath();
      ctx.moveTo(x + k, y - 6);
      ctx.lineTo(x + k, y - h + 8);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.rect(x - 22, y - 12, 44, 12);
    outline(ctx, dk(col, 0.1), 3.5);
  }

  function crystal(ctx, x, y, s, col, time) {
    const a = 0.25 + 0.15 * Math.sin(time * 0.06 + x);
    ctx.fillStyle = rgba(col, a);
    ctx.beginPath();
    ctx.arc(x, y - 22 * s, 30 * s, 0, TAU);
    ctx.fill();
    for (const [ox, h, w] of [[-10, 34, 9], [4, 48, 11], [16, 26, 8]]) {
      ctx.beginPath();
      ctx.moveTo(x + ox * s - w * s, y);
      ctx.lineTo(x + ox * s, y - h * s);
      ctx.lineTo(x + ox * s + w * s, y);
      ctx.closePath();
      outline(ctx, col, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(x + ox * s - w * s * 0.3, y - 4);
      ctx.lineTo(x + ox * s, y - h * s + 6);
      ctx.lineTo(x + ox * s + w * s * 0.1, y - 4);
      ctx.fill();
    }
  }

  A.drawStage = function (ctx, g, time) {
    const st = g.stage, th = st.theme;
    if (st.image) {
      const im = RR.sprites.image(st.image.src);
      if (RR.sprites.ready(im)) ctx.drawImage(im, st.image.x, st.image.y, st.image.w, st.image.h);
      return;
    }
    const lava = !!th.lava;
    for (const s of st.solids) {
      // decoração atrás dos lutadores
      if (!lava) {
        pillar(ctx, s.x + 95, s.y, 160, '#b9a8e8', true);
        pillar(ctx, s.x + s.w - 120, s.y, 110, '#b9a8e8', true);
        crystal(ctx, s.x + s.w - 60, s.y, 1, '#9ff3ff', time);
        crystal(ctx, s.x + 170, s.y, 0.7, '#ffb3e6', time);
      } else {
        for (const [ox, h] of [[70, 120], [110, 70], [s.w - 80, 140], [s.w - 125, 80]]) {
          ctx.beginPath();
          ctx.moveTo(s.x + ox - 22, s.y);
          ctx.lineTo(s.x + ox - 4, s.y - h);
          ctx.lineTo(s.x + ox + 22, s.y);
          ctx.closePath();
          outline(ctx, '#2b1b26', 4);
          ctx.strokeStyle = rgba('#ff7a1a', 0.7);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(s.x + ox - 6, s.y - 8);
          ctx.lineTo(s.x + ox - 3, s.y - h * 0.7);
          ctx.stroke();
        }
      }

      // corpo da ilha
      cel(ctx, () => islandPath(ctx, s), th.body, 14);
      // camadas de rocha
      ctx.save();
      islandPath(ctx, s);
      ctx.clip();
      ctx.strokeStyle = dk(th.body, 0.3);
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      const r = rng(Math.floor(s.w));
      for (let row = 0; row < 4; row++) {
        const y = s.y + 45 + row * 40;
        for (let x = s.x + 20 + r() * 60; x < s.x + s.w - 20; x += 90 + r() * 70) {
          ctx.beginPath();
          ctx.moveTo(x, y + r() * 10);
          ctx.quadraticCurveTo(x + 25, y - 6, x + 50 + r() * 20, y + r() * 8);
          ctx.stroke();
        }
      }
      if (lava) {
        // rachaduras de lava
        const pulse = 0.65 + 0.35 * Math.sin(time * 0.05);
        ctx.strokeStyle = rgba('#ff8a1a', 0.35 * pulse);
        ctx.lineWidth = 12;
        const cracks = () => {
          ctx.beginPath();
          ctx.moveTo(s.x + s.w * 0.2, s.y + 30);
          ctx.lineTo(s.x + s.w * 0.26, s.y + 80);
          ctx.lineTo(s.x + s.w * 0.22, s.y + 120);
          ctx.moveTo(s.x + s.w * 0.6, s.y + 26);
          ctx.lineTo(s.x + s.w * 0.55, s.y + 70);
          ctx.lineTo(s.x + s.w * 0.62, s.y + 130);
          ctx.moveTo(s.x + s.w * 0.85, s.y + 30);
          ctx.lineTo(s.x + s.w * 0.8, s.y + 75);
        };
        cracks();
        ctx.stroke();
        ctx.strokeStyle = '#ffb347';
        ctx.lineWidth = 4;
        cracks();
        ctx.stroke();
      }
      ctx.restore();
      islandPath(ctx, s);
      outline(ctx, null, 5);

      // raízes / gotas de lava embaixo
      if (!lava) {
        ctx.strokeStyle = '#3f9e6a';
        ctx.lineWidth = 4;
        for (const [k, len] of [[0.18, 70], [0.3, 40], [0.7, 60], [0.83, 35]]) {
          const x = s.x + s.w * k;
          ctx.beginPath();
          ctx.moveTo(x, s.y + 20);
          ctx.quadraticCurveTo(x + 10, s.y + 20 + len * 0.6 + Math.sin(time * 0.03 + k * 9) * 4, x - 4, s.y + 20 + len);
          outline(ctx, null, 7);
          ctx.strokeStyle = '#5fbf7a';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      } else {
        for (const k of [0.05, 0.95]) {
          const x = s.x + s.w * k;
          const drop = (time * 2 + k * 100) % 160;
          ctx.fillStyle = '#ff8a1a';
          ctx.beginPath();
          ctx.ellipse(x, s.y + s.h * 0.4 + drop, 5, 9, 0, 0, TAU);
          outline(ctx, '#ff8a1a', 2.5);
        }
      }

      // superfície
      ctx.beginPath();
      ctx.moveTo(s.x - 6, s.y - 3);
      ctx.lineTo(s.x + s.w + 6, s.y - 3);
      ctx.lineTo(s.x + s.w + 6, s.y + 14);
      for (let x = s.x + s.w; x > s.x; x -= 30) {
        const k = (x / 30) % 2 === 0 ? 1 : 0;
        ctx.quadraticCurveTo(x - 8, s.y + 26 + k * 6, x - 15, s.y + 16);
        ctx.quadraticCurveTo(x - 22, s.y + 12, x - 30, s.y + 16);
      }
      ctx.lineTo(s.x - 6, s.y + 14);
      ctx.closePath();
      outline(ctx, lava ? '#4a2a26' : th.top, 4);
      ctx.fillStyle = lava ? '#ff8a1a' : lt(th.top, 0.45);
      ctx.fillRect(s.x - 4, s.y - 1, s.w + 8, 3);
      if (!lava) {
        // tufos de grama
        for (let x = s.x + 30; x < s.x + s.w - 20; x += 75) {
          ctx.beginPath();
          ctx.moveTo(x - 7, s.y - 2);
          ctx.lineTo(x - 3, s.y - 13);
          ctx.lineTo(x, s.y - 4);
          ctx.lineTo(x + 4, s.y - 15);
          ctx.lineTo(x + 7, s.y - 2);
          outline(ctx, th.top, 2.5);
        }
      }
    }

    // plataformas flutuantes
    for (const p of st.plats) {
      const glow = 0.5 + 0.5 * Math.sin(time * 0.05 + p.x);
      const slab = lava ? '#3a2a30' : '#a998e0';
      ctx.fillStyle = rgba(th.platGlow, 0.18 * glow);
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + 30, p.w * 0.45, 18, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.w, p.y);
      ctx.lineTo(p.x + p.w - 14, p.y + 18);
      ctx.lineTo(p.x + p.w * 0.6, p.y + 30);
      ctx.lineTo(p.x + p.w * 0.35, p.y + 28);
      ctx.lineTo(p.x + 14, p.y + 18);
      ctx.closePath();
      outline(ctx, slab, 4);
      ctx.beginPath();
      ctx.rect(p.x - 3, p.y - 3, p.w + 6, 9);
      outline(ctx, lava ? '#5a3a40' : th.top, 3.5);
      // runas brilhando
      ctx.fillStyle = rgba(lava ? '#ff8a1a' : th.platGlow, 0.5 + 0.5 * glow);
      for (const k of [0.3, 0.5, 0.7]) {
        ctx.beginPath();
        ctx.arc(p.x + p.w * k, p.y + 16, 3.5, 0, TAU);
        ctx.fill();
      }
    }
  };

  // ---------------- Projéteis ----------------
  A.drawProjectile = function (ctx, p, g, time) {
    if (p.type === 'orb') return RR.sprites.drawOrb(ctx, p, time);
    ctx.save();
    if (p.type === 'fireball') {
      const r = 16 + Math.sin(time * 0.7) * 1.5;
      const dir = p.vx >= 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(p.x + dir * r, p.y);
      ctx.quadraticCurveTo(p.x + dir * r, p.y - r, p.x, p.y - r);
      ctx.lineTo(p.x - dir * r * 2.2, p.y - r * 0.9 + Math.sin(time * 0.9) * 3);
      ctx.lineTo(p.x - dir * r * 1.2, p.y - r * 0.2);
      ctx.lineTo(p.x - dir * r * 2.6, p.y + r * 0.3 + Math.sin(time * 1.1) * 3);
      ctx.lineTo(p.x - dir * r * 1.1, p.y + r * 0.6);
      ctx.lineTo(p.x - dir * r * 1.8, p.y + r + Math.sin(time * 0.8) * 3);
      ctx.lineTo(p.x, p.y + r);
      ctx.quadraticCurveTo(p.x + dir * r, p.y + r, p.x + dir * r, p.y);
      ctx.closePath();
      outline(ctx, '#ff7a1a', 3);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(p.x + dir * 3, p.y, r * 0.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff6d0';
      ctx.beginPath();
      ctx.arc(p.x + dir * 5, p.y - 3, r * 0.28, 0, TAU);
      ctx.fill();
    } else if (p.type === 'shard') {
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(0, -9);
      ctx.lineTo(-15, 0);
      ctx.lineTo(0, 9);
      ctx.closePath();
      outline(ctx, '#bdf6ff', 3);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(14, -1);
      ctx.lineTo(0, -5);
      ctx.lineTo(-6, -1);
      ctx.fill();
    } else if (p.type === 'wave') {
      const k = 1 - p.t / p.life;
      for (let i = -1; i <= 1; i++) {
        const hh = (42 - Math.abs(i) * 12) * (0.6 + 0.4 * Math.sin(p.t * 0.5 + i)) * (0.4 + k * 0.6) + 10;
        ctx.beginPath();
        ctx.moveTo(p.x + i * 16 - 13, p.y);
        ctx.lineTo(p.x + i * 16 - 2, p.y - hh);
        ctx.lineTo(p.x + i * 16 + 5, p.y - hh * 0.8);
        ctx.lineTo(p.x + i * 16 + 13, p.y);
        ctx.closePath();
        outline(ctx, i === 0 ? '#b88a5c' : '#a67c52', 3);
      }
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(p.x - 26, p.y - 3, 52, 3);
    } else if (p.type === 'beam') {
      const r = g.projRect(p);
      const k = p.t / p.life;
      const hh = r.h * (k < 0.85 ? 1 : (1 - k) / 0.15) * (0.9 + 0.1 * Math.sin(time * 0.8));
      const cy = r.y + r.h / 2;
      ctx.fillStyle = 'rgba(143,107,255,0.35)';
      ctx.fillRect(r.x, cy - hh * 0.65, r.w, hh * 1.3);
      ctx.beginPath();
      ctx.rect(r.x, cy - hh / 2, r.w, hh);
      outline(ctx, '#9ff3ff', 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(r.x, cy - hh * 0.2, r.w, hh * 0.4);
      const ox = p.dir > 0 ? r.x : r.x + r.w;
      ctx.beginPath();
      ctx.arc(ox, cy, hh * 0.7, 0, TAU);
      outline(ctx, '#ffffff', 4);
    } else if (p.type === 'blast') {
      const k = p.t / p.life;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 70, (p.w / 2) * (0.4 + k * 0.7), 40 + k * 30, 0, 0, TAU);
      ctx.lineWidth = 22 * (1 - k) + 4;
      ctx.strokeStyle = OL;
      ctx.stroke();
      ctx.lineWidth = 16 * (1 - k) + 2;
      ctx.strokeStyle = '#ffb347';
      ctx.stroke();
    }
    ctx.restore();
  };

  // estrela de impacto (efeito de golpe)
  A.drawImpact = function (ctx, x, y, r, k, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(k * 0.6);
    const R = r * (1.2 - k * 0.5);
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const rr = i % 2 ? R * 0.42 : R;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.globalAlpha = Math.min(1, k * 2);
    outline(ctx, color, 4);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  };
})(window.RR);
