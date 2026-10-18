# Bront (Touro): todas as animações tiradas dos vídeos (fundo magenta, por causa dos cristais verdes).
# Uso: python3 tools/extract-bront.py   (precisa de ffmpeg)
import json, os
import numpy as np
from PIL import Image
import video_tools as vt

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'art/source/bront')
OUT = os.path.join(ROOT, 'web/img/bront')
R = 0.3  # o Bront ocupa ~520 px de altura no vídeo

# nome: (vídeo, primeiro quadro, último, passo, modo do ponto de apoio)
VIDEOS = {
    'brun': ('run.mp4', 62, 83, 2, 'medfoot'),       # ciclo de corrida (~22 quadros)
    'bidle': ('idle.mp4', 66, 141, 5, 'medfoot'),    # respiração
    'bjab': ('jab.mp4', 30, 96, 3, 'medfoot'),       # soco reto
    'bjab2': ('jab2.mp4', 67, 118, 3, 'medfoot'),    # gancho com arco verde
    'bjab3': ('jab3.mp4', 30, 105, 3, 'medfoot'),  # martelo de rocha
    'bspec': ('special.mp4', 19, 79, 3, 'medfoot'),  # Ruptura Sísmica
    'bjump': ('jump.mp4', 37, 67, 4, 'bottom'),    # no ar
    'brec': ('rec.mp4', 40, 104, 4, 'top'),     # Investida do Touro
    'bwin': ('win.mp4', 61, 144, 4, 'medfoot'),      # comemoração
    'bult': ('win2.mp4', 19, 88, 3, 'medfoot'),    # Colosso da Terra (antes do chão aparecer)
}

os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(os.path.join(OUT, f))
manifest = {}
for name, (file, a, b, step, mode) in VIDEOS.items():
    body_h = manifest['bidle00']['bodyH'] if 'bidle00' in manifest else None
    manifest.update(vt.video_frames(os.path.join(SRC, file), OUT, name, a, b, step, mode, R, vt.key_auto, body_h))

# rosto para o placar: parte de cima do primeiro quadro parado
im = Image.open(os.path.join(OUT, 'bidle00.png'))
a = np.asarray(im)[..., 3] > 100
ys, xs = np.nonzero(a)
top = ys.min()
face = im.crop((int(xs.min() + (xs.max() - xs.min()) * 0.25), top, int(xs.max()), int(top + (ys.max() - top) * 0.55)))
face.save(os.path.join(OUT, 'face.png'))
manifest['face'] = {'w': face.width, 'h': face.height, 'ax': face.width / 2, 'ay': face.height / 2, 'bodyH': face.height}

vt.to_webp(OUT)
json.dump(manifest, open(os.path.join(OUT, 'bront.json'), 'w'), indent=1)
with open(os.path.join(ROOT, 'web/js/sprites-bront.js'), 'w') as f:
    f.write('// Gerado por tools/extract-bront.py: tamanho e ponto de apoio (pés) de cada quadro do Bront\n')
    f.write('window.RR = window.RR || {};\nRR.spriteData = RR.spriteData || {};\nRR.spriteData.bront = ' + json.dumps(manifest) + ';\n')
import collections
print(collections.Counter(k.rstrip('0123456789') for k in manifest))
