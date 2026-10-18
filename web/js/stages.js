// Arenas: blocos sólidos, plataformas atravessáveis, blast zones e tema visual
(function (RR) {
  const S = (RR.stages = {});

  // Arena do Vex: imagem pintada; a colisão segue as plataformas do desenho
  // (1 pixel da imagem = 0,8 unidade do mundo; a origem é o centro do chão principal)
  S.gemeos = {
    id: 'gemeos', name: 'Santuário dos Gêmeos', desc: 'Arena do Vex: metade luz, metade sombra.',
    solids: [{ x: -492, y: 0, w: 984, h: 210 }],
    plats: [
      { x: -500, y: -142, w: 256 },
      { x: 252, y: -142, w: 264 },
      { x: -120, y: -178, w: 248 },
    ],
    blast: { left: -1250, right: 1250, top: -900, bottom: 640 },
    spawns: [{ x: -300, y: 0 }, { x: 300, y: 0 }, { x: -110, y: 0 }, { x: 110, y: 0 }],
    respawn: { y: -470, xs: [-200, 200, -70, 70] },
    image: { src: 'img/arena-gemeos.webp', x: -664, y: -530, w: 1338, h: 753 },
    theme: {
      sky: ['#0d0a2e', '#2a1a6e', '#5a3aa8'], split: true,
      platGlow: '#9fd8ff', accent: '#ffd166',
    },
  };

  // Arena da Noxara: plataformas pintadas + fundo cósmico separado (1 px = 0,72 unidade)
  S.escorpiao = {
    id: 'escorpiao', name: 'Abismo do Escorpião', desc: 'Arena da Noxara: ruínas no vazio cósmico.',
    solids: [{ x: -531, y: 0, w: 1062, h: 210 }],
    plats: [
      { x: -495, y: -132, w: 266 },
      { x: 189, y: -132, w: 266 },
      { x: -153, y: -171, w: 266 },
    ],
    blast: { left: -1250, right: 1250, top: -900, bottom: 620 },
    spawns: [{ x: -300, y: 0 }, { x: 300, y: 0 }, { x: -110, y: 0 }, { x: 110, y: 0 }],
    respawn: { y: -450, xs: [-200, 200, -70, 70] },
    image: { src: 'img/arena-escorpiao.webp', x: -621, y: -442, w: 1204, h: 678 },
    bg: { src: 'img/arena-escorpiao-fundo.webp', parallax: 0.04 },
    theme: { sky: ['#12051f', '#3a0f5c', '#8a2bb8'], platGlow: '#d24dff', accent: '#d24dff' },
  };

  // Arena do Astrael: rampas (passarelas inclinadas) e plataformas em alturas diferentes (1 px = 0,8 unidade)
  // plataforma com y2 = rampa: altura y na esquerda e y2 na direita
  S.sagitario = {
    id: 'sagitario', name: 'Observatório Celeste', desc: 'Arena do Astrael: passarelas inclinadas e plataformas altas.',
    solids: [{ x: -500, y: 0, w: 1000, h: 210 }],
    plats: [
      { x: -640, y: -140, w: 192 },
      { x: -448, y: -140, w: 232, y2: 0 },
      { x: -396, y: -192, w: 96 },
      { x: -36, y: -192, w: 220 },
      { x: 136, y: -112, w: 184 },
      { x: 320, y: -112, w: 120, y2: 0 },
      { x: 304, y: -202, w: 252 },
    ],
    blast: { left: -1300, right: 1300, top: -920, bottom: 620 },
    spawns: [{ x: -300, y: 0 }, { x: 300, y: 0 }, { x: -110, y: 0 }, { x: 110, y: 0 }],
    respawn: { y: -480, xs: [-200, 200, -70, 70] },
    image: { src: 'img/arena-sagitario.webp', x: -712, y: -460, w: 1338, h: 753 },
    bg: { src: 'img/arena-sagitario-fundo.webp', parallax: 0.03 },
    theme: { sky: ['#0a1440', '#1d3a8a', '#6fb2ff'], platGlow: '#7fe3ff', accent: '#ffd166' },
  };

  // Arena do Solkar: escadarias dos dois lados (rampas), ilhas no meio e plataformas altas (1 px = 0,8 unidade)
  S.leao = {
    id: 'leao', name: 'Trono Solar', desc: 'Arena do Solkar: escadarias, ilhas flutuantes e o sol coroado.',
    solids: [{ x: -460, y: 0, w: 944, h: 210 }],
    plats: [
      { x: -476, y: -62, w: 120 },
      { x: -356, y: -62, w: 136, y2: 0 },
      { x: 264, y: 0, w: 96, y2: -60 },
      { x: 360, y: -60, w: 104 },
      { x: -228, y: -102, w: 116 },
      { x: 44, y: -106, w: 120 },
      { x: -416, y: -176, w: 184 },
      { x: -108, y: -164, w: 208 },
      { x: 224, y: -176, w: 168 },
    ],
    blast: { left: -1300, right: 1300, top: -920, bottom: 620 },
    spawns: [{ x: -300, y: 0 }, { x: 300, y: 0 }, { x: -110, y: 0 }, { x: 110, y: 0 }],
    respawn: { y: -480, xs: [-200, 200, -70, 70] },
    image: { src: 'img/arena-leao.webp', x: -672, y: -436, w: 1338, h: 753 },
    bg: { src: 'img/arena-leao-fundo.webp', parallax: 0.03 },
    theme: { sky: ['#3a1a08', '#a4521a', '#ffd166'], platGlow: '#ffd166', accent: '#ffb000' },
  };

  // altura da superfície da plataforma no ponto x (rampas são inclinadas)
  S.surfaceY = (p, x) => (p.y2 == null ? p.y : p.y + ((p.y2 - p.y) * Math.min(1, Math.max(0, (x - p.x) / p.w))));

  S.list = ['leao', 'sagitario', 'escorpiao', 'gemeos'];

  S.prepare = function (st) {
    st.ledges = [];
    for (const s of st.solids) {
      s.soft = false;
      st.ledges.push({ x: s.x, y: s.y, side: -1, occ: null });
      st.ledges.push({ x: s.x + s.w, y: s.y, side: 1, occ: null });
    }
    for (const p of st.plats) p.soft = true;
    const s0 = st.solids[0];
    st.left = s0.x;
    st.right = s0.x + s0.w;
    st.cx = s0.x + s0.w / 2;
    return st;
  };
})(window.RR);
