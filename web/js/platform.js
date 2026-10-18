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
      await cg.init();
      sdk = cg;
      P.name = 'crazygames';
    } catch (e) {
      sdk = null;
    }
  };

  const call = (fn) => {
    try {
      fn();
    } catch (e) {
      // o SDK não pode derrubar o jogo
    }
  };

  // avisa quando a luta começa e para (o CrazyGames usa isso para saber quando pode mostrar anúncio)
  P.gameplayStart = function () {
    if (!sdk || playing) return;
    playing = true;
    call(() => sdk.game.gameplayStart());
  };
  P.gameplayStop = function () {
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
