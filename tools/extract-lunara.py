# Lunara (Câncer): quadros extraídos dos vídeos (corrida, parado, golpe, vitória) + folha para o resto.
# Uso: python3 tools/extract-lunara.py   (precisa de ffmpeg)
import json, os, subprocess, tempfile
import numpy as np
from PIL import Image
from chroma import key
from sprite_tools import clean, extract

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
}


def video_frames(name, file, a, b, step, mode='fixed'):
    tmp = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(SRC, file), os.path.join(tmp, '%03d.png')], check=True)
    idx = list(range(a, b + 1, step))
    keyed = [np.asarray(key(Image.open(os.path.join(tmp, f'{i:03d}.png')))).copy() for i in idx]
    keyed = [clean(k, keep_frac=0.02) for k in keyed]
    # mesmo recorte e mesmo ponto de apoio em todos os quadros do vídeo (o personagem fica no lugar)
    boxes = []
    for k in keyed:
        ys, xs = np.nonzero(k[..., 3] > 10)
        boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    x0, y0 = min(bx[0] for bx in boxes), min(bx[1] for bx in boxes)
    x1, y1 = max(bx[2] for bx in boxes), max(bx[3] for bx in boxes)
    # pés: faixa inferior do corpo no primeiro quadro
    body = keyed[0][..., 3] > 200
    ys, xs = np.nonzero(body)
    foot = np.percentile(ys, 99.5)
    band = ys > foot - (foot - ys.min()) * 0.15
    ax = (xs[band].mean() - x0) * R
    ay = (max(bx[3] for bx in boxes) - 4 - y0) * R
    w, h = round((x1 - x0) * R), round((y1 - y0) * R)
    out = {}
    for n, k in enumerate(keyed):
        im = Image.fromarray(k[y0:y1, x0:x1], 'RGBA').resize((w, h), Image.LANCZOS)
        fname = f'{name}{n:02d}'
        im.save(os.path.join(OUT, fname + '.png'), optimize=True)
        a = np.asarray(im)[..., 3] > 140
        rows = np.nonzero(a.any(axis=1))[0]
        top = rows.min()
        fax, fay = ax, ay
        if mode == 'bottom':
            fay = rows.max()
        elif mode == 'jet':
            # de baixo para cima, pula a coluna estreita até chegar ao corpo largo
            widths = a.sum(axis=1)
            wmax = widths.max()
            yb = rows.max()
            while yb > top and widths[yb] < wmax * 0.45:
                yb -= 1
            fay = yb
        out[fname] = {'w': w, 'h': h, 'ax': round(float(fax), 1), 'ay': round(float(fay), 1), 'bodyH': round(float(fay - top), 1)}
    return out


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
json.dump(manifest, open(os.path.join(OUT, 'lunara.json'), 'w'), indent=1)
with open(os.path.join(ROOT, 'web/js/sprites-lunara.js'), 'w') as f:
    f.write('// Gerado por tools/extract-lunara.py: tamanho e ponto de apoio (pés) de cada quadro da Lunara\n')
    f.write('window.RR = window.RR || {};\nRR.spriteData = RR.spriteData || {};\nRR.spriteData.lunara = ' + json.dumps(manifest) + ';\n')
for k in ['vjab200', 'vjab300', 'vspec00', 'vjump00', 'vjump04', 'vrec00', 'vrec08']:
    print(k, manifest[k])
print(len(manifest), 'quadros')

# WebP com transparência: bem menor que PNG
for f in os.listdir(OUT):
    if f.endswith('.png'):
        p = os.path.join(OUT, f)
        Image.open(p).save(p[:-4] + '.webp', 'WEBP', quality=90, method=6)
        os.remove(p)
