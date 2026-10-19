// Idiomas: português e inglês. O jogo é escrito em português; aqui fica a tradução de cada texto.
// Idioma: o salvo nas opções, senão o do aparelho (português -> PT, qualquer outro -> EN).
// Os textos do HTML são trocados ao carregar; os do código passam por RR.t().
(function (RR) {
  const U = RR.U;
  const EN = {
    // ---------- menus ----------
    'Lute. Lance. Derrube da arena.': 'Fight. Launch. Knock them off the arena.',
    'JOGAR': 'PLAY',
    'COMO JOGAR': 'HOW TO PLAY',
    'OPÇÕES': 'OPTIONS',
    'ESCOLHA SEU LUTADOR': 'CHOOSE YOUR FIGHTER',
    'PRÓXIMO ▶': 'NEXT ▶',
    'Modo': 'Mode',
    'Dificuldade': 'Difficulty',
    'Oponentes': 'Opponents',
    '(toque para trocar)': '(tap to change)',
    'ESCOLHA A ARENA': 'CHOOSE THE ARENA',
    'LUTAR! ▶': 'FIGHT! ▶',
    'PAUSADO': 'PAUSED',
    'CONTINUAR': 'RESUME',
    'REINICIAR': 'RESTART',
    'SAIR PARA O MENU': 'QUIT TO MENU',
    'VITÓRIA!': 'VICTORY!',
    'DERROTA': 'DEFEAT',
    'REVANCHE': 'REMATCH',
    'TROCAR LUTADOR': 'CHANGE FIGHTER',
    'NOVA VERSÃO!': 'NEW VERSION!',
    'ATUALIZAR': 'UPDATE',
    'DEPOIS': 'LATER',
    'O download abre no navegador. Depois é só tocar no arquivo para instalar.': 'The download opens in the browser. Then tap the file to install.',
    'Gire o celular para a horizontal': 'Turn your phone sideways',
    'Pausar': 'Pause',
    '3 Vidas': '3 Lives',
    'Tempo 2min': 'Time 2min',
    'Fácil': 'Easy',
    'Médio': 'Medium',
    'Difícil': 'Hard',
    'Efeitos sonoros': 'Sound effects',
    'Música': 'Music',
    'Vibração': 'Vibration',
    'Mostrar hitboxes (debug)': 'Show hitboxes (debug)',
    'Tamanho dos controles': 'Control size',
    'Opacidade dos controles': 'Control opacity',
    'Idioma': 'Language',
    'LUTADOR': 'FIGHTER',
    'QUEDAS': 'FALLS',
    'DANO': 'DAMAGE',
    // ---------- luta ----------
    'LUTEM!': 'FIGHT!',
    'TEMPO!': 'TIME!',
    'FIM DE JOGO!': 'GAME!',
    'VENCEU!': 'WINS!',
    'FORA': 'OUT',
    // ---------- personagens ----------
    'Velocidade': 'Speed',
    'Força': 'Power',
    'Peso': 'Weight',
    'Alcance': 'Range',
    'Colosso de Pedra': 'Stone Colossus',
    'Pesado': 'Heavyweight',
    'Martelo de Rocha': 'Rock Hammer',
    'Três socos de pedra; o terceiro lança longe.': 'Three stone punches; the third one sends them flying.',
    'Ruptura Sísmica': 'Seismic Rupture',
    'Soca o chão e manda uma onda de rochas e cristais pela plataforma.': 'Punches the ground, sending a wave of rocks and crystals across the stage.',
    'Investida do Touro': 'Bull Rush',
    'Salta para cima e para a frente com os chifres, blindado.': 'Charges up and forward horns first, with armor.',
    'Colosso da Terra': 'Earth Colossus',
    'Esmaga o chão e faz pilares de pedra e cristal emergirem.': 'Smashes the ground and raises pillars of stone and crystal.',
    'Guardiã das Marés': 'Tide Guardian',
    'Tanque': 'Tank',
    'Garras da Maré': 'Tide Claws',
    'Combo de três golpes rápidos com as pinças.': 'Three quick pincer strikes.',
    'Orbe Abissal': 'Abyssal Orb',
    'Dispara uma esfera de água pressurizada.': 'Fires a sphere of pressurized water.',
    'Jato Lunar': 'Lunar Jet',
    'Uma coluna de água a lança para cima.': 'A water column launches her upward.',
    'Imperatriz do Oceano': 'Ocean Empress',
    'Vira uma criatura aquática gigante que golpeia a arena com ondas.': 'Becomes a giant sea creature that crushes the arena with waves.',
    'Rei Leão Solar': 'Solar Lion King',
    'Rei Guerreiro': 'Warrior King',
    'Garras Solares': 'Solar Claws',
    'Combo de três golpes com as garras flamejantes.': 'Three strikes with blazing claws.',
    'Rugido Solar': 'Solar Roar',
    'Rugido de perto: empurra, deixa tonto e devolve projéteis.': 'Close-range roar: pushes, stuns and reflects projectiles.',
    'Ascensão do Leão': 'Lion Ascent',
    'Lança-se para cima envolvido por chamas, com armadura.': 'Launches upward wrapped in flames, with armor.',
    'Queda do Sol': 'Sunfall',
    'Salta para fora da tela e cai como um sol em cima do oponente.': 'Leaps off screen and crashes down like a sun on the opponent.',
    'Arqueiro Estelar': 'Star Archer',
    'Arqueiro': 'Archer',
    'Combo Celeste': 'Celestial Combo',
    'Três disparos rápidos de curta distância com o arco.': 'Bow swing, quick shot and a kick with an arrow.',
    'Flecha Cometa': 'Comet Arrow',
    'Segure para carregar: toque = flecha rápida; carga cheia = cometa que atravessa todos.': 'Hold to charge: tap = quick arrow; full charge = comet that pierces everyone.',
    'Ascensão Estelar': 'Stellar Ascent',
    'Explosão de energia que o impulsiona para cima.': 'A burst of starlight that launches him upward.',
    'Chuva de Constelações': 'Constellation Rain',
    'Flechas cósmicas caem do céu sobre a área à frente.': 'Cosmic arrows rain from the sky on the area ahead.',
    'Assassina do Escorpião': 'Scorpion Assassin',
    'Assassina': 'Assassin',
    'Combo Ferrão': 'Stinger Combo',
    'Três golpes rápidos com as garras e a cauda.': 'Three fast strikes with claws and tail.',
    'Bote do Escorpião': 'Scorpion Strike',
    'Agarrão: prende, crava o ferrão (veneno) e arremessa para trás.': 'Grab: holds, stings (poison) and throws behind.',
    'Espiral do Escorpião': 'Scorpion Spiral',
    'Gira a cauda e se impulsiona para cima.': 'Spins her tail to propel herself upward.',
    'Dança do Eclipse': 'Eclipse Dance',
    'A arena escurece; ela salta entre os oponentes cortando e termina com o ferrão.': 'The arena goes dark; she slashes between opponents and finishes with her stinger.',
    'Gêmeos de Luz e Sombra': 'Twins of Light and Shadow',
    'Gêmeos': 'Twins',
    'Combo Gêmeo': 'Twin Combo',
    'Três golpes; no 2º e 3º os dois gêmeos atacam juntos.': 'Three strikes; on the 2nd and 3rd both twins attack together.',
    'Passo Gêmeo': 'Twin Step',
    'Some num lampejo e reaparece atrás do oponente, chutando.': 'Vanishes in a flash and reappears behind the opponent, kicking.',
    'Espiral Gêmea': 'Twin Spiral',
    'Os gêmeos sobem girando e puxam quem estiver perto.': 'The twins spin upward, pulling in anyone nearby.',
    'Dragões Gêmeos': 'Twin Dragons',
    'Dois dragões, de luz e de sombra, atravessam a arena inteira.': 'Two dragons, of light and shadow, sweep across the whole arena.',
    // ---------- arenas ----------
    'Platô de Esmeralda': 'Emerald Plateau',
    'Arena do Bront: disco aberto e baixo sobre as ilhas flutuantes.': "Bront's arena: a wide, low disc above the floating isles.",
    'Santuário da Maré Lunar': 'Lunar Tide Sanctuary',
    'Arena da Lunara: pedestal da lua e rochas com cachoeiras.': "Lunara's arena: a moon pedestal and waterfall rocks.",
    'Trono Solar': 'Solar Throne',
    'Arena do Solkar: escadarias, ilhas flutuantes e o sol coroado.': "Solkar's arena: stairways, floating isles and the crowned sun.",
    'Observatório Celeste': 'Celestial Observatory',
    'Arena do Astrael: passarelas inclinadas e plataformas altas.': "Astrael's arena: sloped walkways and high platforms.",
    'Abismo do Escorpião': 'Scorpion Abyss',
    'Arena da Noxara: ruínas no vazio cósmico.': "Noxara's arena: ruins in the cosmic void.",
    'Santuário dos Gêmeos': 'Twins Sanctuary',
    'Arena do Vex: metade luz, metade sombra.': "Vex's arena: half light, half shadow.",
  };

  // "Como jogar" tem formatação (negrito), então troca o bloco inteiro
  const HOWTO_EN = `
      <h3>Goal</h3>
      <p>There's no health bar: every hit raises your <b>damage %</b>. The higher it is, the farther you fly. Knock your opponents off the arena!</p>
      <h3>Keyboard (PC)</h3>
      <ul>
        <li><b>WASD / Arrow keys</b>: move. Down on a thin platform: drop through. Down in the air: fast fall.</li>
        <li><b>Space</b>: jump (double jump). <b>J</b>: attack (tap for combo; with up/down: high/low attack).</li>
        <li><b>K</b>: special. <b>Up + K</b>: recovery (to get back to the arena). Astrael: hold K to charge.</li>
        <li><b>L</b>: shield (with left/right: roll; down: dodge; in the air: air dodge). <b>U</b>: ULTIMATE when the bar is full. <b>Esc</b>: pause.</li>
      </ul>
      <h3>Touch (phone)</h3>
      <p>Joystick on the left to move · <b>A</b> attack · <b>B</b> special · <b>Arrow</b> jump · <b>Shield</b> defend · <b>Star</b> ultimate (fills by dealing and taking damage).</p>
      <h3>Ledges and respawn</h3>
      <p>Fall near an edge to <b>grab</b> it. Then: forward climbs, jump leaps, attack climbs attacking. When knocked out, you return on a high platform at 0% and stay <b>invincible for 2 s</b> (blinking).</p>`;

  const saved = U.store.get('lang', null);
  RR.lang = saved === 'pt' || saved === 'en' ? saved : /^pt/i.test(navigator.language || '') ? 'pt' : 'en';
  RR.t = (s) => (RR.lang === 'en' && EN[s] != null ? EN[s] : s);
  RR.setLang = function (l) {
    U.store.set('lang', l);
    location.reload();
  };

  if (RR.lang !== 'en') return;

  // dados do jogo
  for (const id of RR.chars.list) {
    const c = RR.chars[id];
    c.title = RR.t(c.title);
    c.arche = RR.t(c.arche);
    for (const s of c.skills) {
      s.name = RR.t(s.name);
      s.desc = RR.t(s.desc);
    }
    c.stats = Object.fromEntries(Object.entries(c.stats).map(([k, v]) => [RR.t(k), v]));
    for (const m of Object.values(c.moves)) if (m.name) m.name = RR.t(m.name);
  }
  for (const id of RR.stages.list) {
    const s = RR.stages[id];
    s.name = RR.t(s.name);
    s.desc = RR.t(s.desc);
  }

  // textos do HTML
  if (typeof document === 'undefined') return;
  document.documentElement.lang = 'en';
  const howto = document.querySelector('#screen-howto .panel');
  if (howto) howto.innerHTML = HOWTO_EN;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const k = n.nodeValue.trim();
    if (k && EN[k] != null) n.nodeValue = n.nodeValue.replace(k, EN[k]);
  }
  for (const el of document.querySelectorAll('[aria-label]')) el.setAttribute('aria-label', RR.t(el.getAttribute('aria-label')));
})(window.RR);
