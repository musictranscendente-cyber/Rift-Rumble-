// Arenas: blocos sólidos, plataformas atravessáveis, blast zones e tema visual
(function (RR) {
  const S = (RR.stages = {});

  S.ruinas = {
    id: 'ruinas', name: 'Ruínas Celestes', desc: 'Clássica: 3 plataformas flutuantes.',
    solids: [{ x: -450, y: 0, w: 900, h: 230 }],
    plats: [
      { x: -330, y: -150, w: 200 },
      { x: 130, y: -150, w: 200 },
      { x: -100, y: -290, w: 200 },
    ],
    blast: { left: -1150, right: 1150, top: -860, bottom: 620 },
    spawns: [{ x: -260, y: 0 }, { x: 260, y: 0 }, { x: -90, y: 0 }, { x: 90, y: 0 }],
    respawn: { y: -470, xs: [-170, 170, -60, 60] },
    theme: {
      sky: ['#140f3a', '#3b2a78', '#c0569a'],
      far: '#2a2160', mid: '#3d2f80', top: '#8be0a4', topDark: '#3f9e6a', body: '#5a4a8f', bodyDark: '#2f2560',
      plat: '#c9b8ff', platGlow: '#8f6bff', accent: '#ffd166',
    },
  };

  S.vulcao = {
    id: 'vulcao', name: 'Fenda Vulcânica', desc: 'Arena larga com 2 plataformas e lava.',
    solids: [{ x: -560, y: 0, w: 1120, h: 210 }],
    plats: [
      { x: -390, y: -165, w: 220 },
      { x: 170, y: -165, w: 220 },
    ],
    blast: { left: -1250, right: 1250, top: -860, bottom: 600 },
    spawns: [{ x: -300, y: 0 }, { x: 300, y: 0 }, { x: -110, y: 0 }, { x: 110, y: 0 }],
    respawn: { y: -440, xs: [-200, 200, -70, 70] },
    theme: {
      sky: ['#1a0606', '#4a1208', '#b8380e'],
      far: '#2b0d08', mid: '#45150a', top: '#ff9a3c', topDark: '#b8440e', body: '#3b2a26', bodyDark: '#1f1412',
      plat: '#ffcf9a', platGlow: '#ff6a00', accent: '#ff6a00', lava: true,
    },
  };

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

  S.list = ['escorpiao', 'gemeos', 'ruinas', 'vulcao'];

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
