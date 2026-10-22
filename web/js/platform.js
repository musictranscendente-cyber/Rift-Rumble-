// Plataforma onde o jogo roda: app Android, CrazyGames (SDK com anúncios) ou navegador comum.
// No CrazyGames o index.html carrega o SDK deles antes deste arquivo (tools/build-web.sh crazygames).
// Sem o SDK tudo aqui vira "não faz nada", e o jogo segue igual.
(function (RR) {
  const P = (RR.platform = { name: window.AndroidBridge ? 'android' : 'web' });
  let sdk = null;
  let playing = false;
  let adBusy = false;

  P.init = async function () {
    const cg = window.CrazyGames && window.CrazyGames.SDK;
    if (!cg) return;
    try {
      // não deixa o jogo esperando para sempre se o SDK não responder
      await Promise.race([cg.init(), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 5000))]);
      sdk = cg;
      P.name = 'crazygames';
    } catch (e) {
      sdk = null;
      return;
    }
    // progresso salvo pelo Data Module do SDK (nuvem para quem tem conta; funciona dentro do iframe)
    let dataOk = false;
    try {
      sdk.data.setItem('rr_check', '1');
      dataOk = sdk.data.getItem('rr_check') === '1';
    } catch (e) {}
    if (dataOk) {
      // traz o que já estava no localStorage (quem jogou antes desta versão não perde o nível)
      try {
        for (const k of ['prog', 'help', 'cfg', 'settings', 'lang']) {
          const v = localStorage.getItem('rr_' + k);
          if (v != null && sdk.data.getItem('rr_' + k) == null) sdk.data.setItem('rr_' + k, v);
        }
      } catch (e) {}
      RR.storeBackend = sdk.data;
      Object.assign(RR.settings, RR.U.store.get('settings', {}));
    }
    // o menu já está pronto para jogar: avisa que o carregamento acabou (o resto das imagens vem durante o uso)
    call(() => sdk.game.loadingStart());
    call(() => sdk.game.loadingStop());
    // botão de mudo do site
    const applyMute = () => call(() => RR.audio.setMuted(sdk.game.settings && sdk.game.settings.muteAudio));
    applyMute();
    call(() => sdk.game.addSettingsChangeListener(applyMute));
    if (wantPlay) P.gameplayStart();
  };

  const call = (fn) => {
    try {
      fn();
    } catch (e) {
      // o SDK não pode derrubar o jogo
    }
  };

  // avisa quando a luta começa e para (o CrazyGames usa isso para saber quando pode mostrar anúncio)
  let wantPlay = false; // luta começou antes do SDK terminar de iniciar
  P.gameplayStart = function () {
    wantPlay = true;
    if (!sdk || playing) return;
    playing = true;
    call(() => sdk.game.gameplayStart());
  };
  P.gameplayStop = function () {
    wantPlay = false;
    if (!sdk || !playing) return;
    playing = false;
    call(() => sdk.game.gameplayStop());
  };
  // momento feliz (vitória)
  P.happy = function () {
    if (sdk) call(() => sdk.game.happytime());
  };

  // anúncio entre partidas; done() é chamado quando acaba (ou na hora, sem SDK / se der erro)
  P.midgame = function (done) {
    if (!sdk || adBusy) return done();
    adBusy = true;
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      adBusy = false;
      RR.audio.resume();
      done();
    };
    try {
      sdk.ad.requestAd('midgame', {
        adStarted: () => RR.audio.suspend(),
        adFinished: end,
        adError: end,
      });
    } catch (e) {
      end();
    }
  };
})(window.RR);
