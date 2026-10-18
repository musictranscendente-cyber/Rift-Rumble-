// Atualização automática: ao abrir, procura uma versão mais nova nos Releases do GitHub
(function (RR) {
  const REPO = 'musictranscendente-cyber/Rift-Rumble-';
  const up = (RR.update = {});

  RR.openUrl = function (url) {
    if (window.AndroidBridge && window.AndroidBridge.openUrl) window.AndroidBridge.openUrl(url);
    else window.open(url, '_blank');
  };

  up.check = async function () {
    const v = RR.VERSION;
    if (!v || !v.code) return; // versão de desenvolvimento (navegador)
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { cache: 'no-store' });
      if (!r.ok) return;
      const rel = await r.json();
      const code = parseInt(String(rel.tag_name || '').replace(/\D/g, ''), 10);
      const apk = (rel.assets || []).find((a) => /\.apk$/i.test(a.name));
      if (apk && code > v.code) show(rel, apk.browser_download_url);
    } catch (e) {
      // sem internet: segue jogando a versão instalada
    }
  };

  function show(rel, url) {
    const el = document.getElementById('screen-update');
    el.querySelector('#updName').textContent = rel.name || rel.tag_name;
    const notes = String(rel.body || '').split('\n').filter((l) => l.trim() && !/^Co-Authored|^Claude-Session/.test(l)).slice(0, 6);
    el.querySelector('#updNotes').textContent = notes.join('\n');
    el.querySelector('#updGo').onclick = () => {
      RR.audio.play('click');
      RR.openUrl(url);
      el.classList.remove('show');
    };
    el.querySelector('#updLater').onclick = () => {
      RR.audio.play('click');
      el.classList.remove('show');
    };
    el.classList.add('show');
  }
})(window.RR);
