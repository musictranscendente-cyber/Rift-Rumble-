# Lunara (Câncer): quadros extraídos dos vídeos (corrida, parado, golpe, vitória) + folha para o resto.
# Uso: python3 tools/extract-lunara.py   (precisa de ffmpeg)
import json, os, subprocess, tempfile
import numpy as np
from PIL import Image
from chroma import key
from sprite_tools import extract
import video_tools as vt

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'art/source/lunara')
OUT = os.path.join(ROOT, 'web/img/lunara')
R = 0.42  # redução dos quadros de vídeo (o personagem tem ~350 px de altura no vídeo)

# vídeo: (arquivo, primeiro quadro, último quadro, passo) — escolhidos para formar um ciclo que fecha
VIDEOS = {
    'vrun': ('run.mp4', 20, 43, 2),     # ciclo de corrida: se repete a cada 23 quadros
    'vidle': ('idle.mp4', 20, 95, 5),   # respiração: ciclo de ~76 quadros
    'vjab': ('jab.mp4', 6, 56, 3),      # um golpe completo: preparação, soco com jato d'água e volta
    'vwin': ('win.mp4', 84, 144, 3),    # comemoração (parte final, já sem a aproximação da câmera)
    'vjab2': ('jab2.mp4', 7, 61, 3),    # golpe 2: giro com arco d'água
    'vjab3': ('jab3.mp4', 13, 79, 3),   # golpe 3: pinças para cima e batida com onda
    'vspec': ('special.mp4', 31, 85, 3),  # Orbe Abissal: carrega e dispara
    'vjump': ('jump.mp4', 40, 64, 3, 'bottom'),  # no ar: o apoio acompanha o corpo (a física já faz subir)
    'vrec': ('rec.mp4', 25, 85, 4, 'jet'),       # Jato Lunar: apoio onde o corpo encontra a coluna d'água
    'vsp': ('special2.mp4', 7, 139, 4, 'medfoot'),          # Orbe Abissal novo: giro, carga nas duas pinças e explosão
    'vorb': ('orb.mp4', 31, 79, 3, 'center'),    # orbe girando (projétil)
}


def video_frames(name, file, a, b, step, mode='fixed'):
    return vt.video_frames(os.path.join(SRC, file), OUT, name, a, b, step, mode, R, key)


# folha: (x0, y0, x1, y1)
SHEET = {
    'stance': (0, 160, 175, 308), 'swipe': (175, 160, 395, 308), 'spin': (395, 160, 610, 308),
    'up': (610, 160, 805, 308), 'wave': (805, 160, 1030, 308), 'claw': (1030, 160, 1210, 308),
    'cast': (0, 315, 195, 440), 'orbA': (1150, 315, 1272, 440), 'orbB': (1272, 315, 1400, 440), 'splash': (1400, 315, 1536, 440),
    'jump': (190, 445, 335, 592), 'rise1': (575, 445, 745, 592), 'rise2': (745, 445, 905, 592),
    'low': (905, 445, 1095, 592), 'fall': (1095, 445, 1270, 592), 'dive': (1270, 445, 1536, 592),
    'charge': (0, 595, 215, 762), 'u1': (415, 595, 640, 762), 'u2': (640, 595, 1045, 762), 'u3': (1270, 595, 1536, 762),
    'hurt': (0, 762, 135, 865), 'dizzy': (135, 762, 282, 865), 'ko': (282, 762, 452, 865), 'bubble': (452, 762, 605, 865),
    'dash': (740, 762, 965, 865), 'face': (0, 865, 160, 1010),
}
center = lambda w, h: (w * 0.5, h * 0.5)
ANCH = {'orbA': lambda w, h: (w * 0.72, h * 0.5), 'orbB': lambda w, h: (w * 0.72, h * 0.5), 'face': center, 'splash': lambda w, h: (w * 0.5, h)}

os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(os.path.join(OUT, f))
manifest = extract(os.path.join(SRC, 'lunara-sheet.png'), SHEET, OUT, 'lunara', ROOT, anchors=ANCH)
for name, args in VIDEOS.items():
    manifest.update(video_frames(name, *args))
# Imperatriz do Oceano (ultimate): tornado, caranguejo gigante e ondas; o vídeo corta nas bordas, então esfuma
manifest.update(vt.video_frames(os.path.join(SRC, 'ult.mp4'), OUT, 'vult', 5, 141, 3, 'first', 0.5, vt.key_fx))
json.dump(manifest, open(os.path.join(OUT, 'lunara.json'), 'w'), indent=1)
with open(os.path.join(ROOT, 'web/js/sprites-lunara.js'), 'w') as f:
    f.write('// Gerado por tools/extract-lunara.py: tamanho e ponto de apoio (pés) de cada quadro da Lunara\n')
    f.write('window.RR = window.RR || {};\nRR.spriteData = RR.spriteData || {};\nRR.spriteData.lunara = ' + json.dumps(manifest) + ';\n')
for k in ['vsp00', 'vsp16', 'vorb00']:
    print(k, manifest[k])
print(len(manifest), 'quadros')

# arena da Lunara: plataformas (sem o verde) e fundo
key(Image.open(os.path.join(ROOT, 'art/source/arena-cancer.png'))).save(os.path.join(ROOT, 'web/img/arena-cancer.webp'), 'WEBP', quality=88, method=6)
Image.open(os.path.join(ROOT, 'art/source/arena-cancer-fundo.png')).convert('RGB').save(os.path.join(ROOT, 'web/img/arena-cancer-fundo.webp'), 'WEBP', quality=82, method=6)

# WebP com transparência: bem menor que PNG
vt.to_webp(OUT)
