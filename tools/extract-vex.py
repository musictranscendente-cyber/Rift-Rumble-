# Recorta os sprites do Vex da folha de personagem (fundo verde) e gera web/img/vex/*.png + vex.json
# Uso: python3 tools/extract-vex.py
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage
from chroma import key

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'art/source/vex-sheet.png')
OUT = os.path.join(ROOT, 'web/img/vex')

# nome: (x0, y0, x1, y1) na folha original
FRAMES = {
    'idle':      (757, 46, 862, 250),    # Vex claro de lado
    'idle_dark': (1085, 46, 1198, 250),  # Vex escuro de lado
    'front':     (636, 46, 760, 250),
    'c1a': (8, 641, 122, 785), 'c1b': (118, 641, 264, 785), 'c1c': (262, 641, 352, 785), 'c1d': (338, 641, 505, 785),
    'c2a': (505, 641, 705, 785), 'c2b': (700, 641, 936, 785),
    'c3a': (938, 641, 1118, 785), 'c3b': (1108, 641, 1310, 785),
    'spA': (8, 812, 309, 955), 'spB': (306, 812, 606, 955),
    'rec1': (612, 780, 858, 958), 'rec2': (852, 795, 1110, 976), 'rec3': (1110, 775, 1302, 976),
    'ult1': (10, 960, 347, 1190), 'ult2': (345, 950, 770, 1192), 'ult3': (752, 958, 1000, 1192),
    'win': (1008, 970, 1290, 1160),
}

# setas de anotação da folha (coordenadas originais) a apagar
ERASE = [(759, 786, 860, 828), (805, 820, 850, 890), (1050, 780, 1095, 845), (1245, 775, 1300, 845)]

def clean(rgba):
    a = rgba[..., 3] > 40
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=2))
    total = a.sum()
    keep = np.zeros_like(a)
    H, W = a.shape
    for i, sl in enumerate(ndimage.find_objects(lab)):
        comp = (lab[sl] == i + 1) & a[sl]
        area = comp.sum()
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        rgb = rgba[sl][..., :3][comp].astype(int)
        dark = np.median(rgb.max(axis=1)) < 70 if area else False
        # caixa de texto: retângulo escuro quase cheio
        if dark and area / (h * w) > 0.8 and w > 2 * h:
            continue
        touches = sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == H or sl[1].stop == W
        if touches and area < total * 0.12:
            continue  # pedaço de quadro vizinho
        if area < 25:
            continue
        keep[sl] |= lab[sl] == i + 1
    out = rgba.copy()
    out[..., 3] = np.where(keep, out[..., 3], 0)
    return out

def body_anchor(rgba):
    # corpo = pixels opacos pouco saturados (branco/preto); efeitos são saturados
    rgb = rgba[..., :3].astype(int)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    body = (rgba[..., 3] > 200) & (sat < 70)
    ys, xs = np.nonzero(body)
    return float(xs.mean()), float(np.percentile(ys, 99.5)), float(np.percentile(ys, 0.5))

sheet = key(Image.open(SRC)).copy()
px = sheet.load()
for (ex0, ey0, ex1, ey1) in ERASE:
    for yy in range(ey0, ey1):
        for xx in range(ex0, ex1):
            r, g, b, a = px[xx, yy]
            px[xx, yy] = (r, g, b, 0)
manifest = {}
for name, box in FRAMES.items():
    rgba = clean(np.asarray(sheet.crop(box)).copy())
    ys, xs = np.nonzero(rgba[..., 3] > 10)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgba = rgba[y0:y1, x0:x1]
    ax, ay, top = body_anchor(rgba)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(OUT, name + '.png'), optimize=True)
    manifest[name] = {'w': int(x1 - x0), 'h': int(y1 - y0), 'ax': round(ax, 1), 'ay': round(ay, 1), 'bodyH': round(ay - top, 1)}
    print(name, manifest[name])
json.dump(manifest, open(os.path.join(OUT, 'vex.json'), 'w'), indent=1)

# Especial: separa o corpo (lançando) do orbe (vira o projétil)
for src, cut, body, orb in [('spA', 158, 'castA', 'orbA'), ('spB', 160, 'castB', 'orbB')]:
    im = Image.open(os.path.join(OUT, src + '.png'))
    m = manifest[src]
    b = im.crop((0, 0, cut, im.height))
    o = im.crop((cut, 0, im.width, im.height))
    o = o.crop(o.getbbox())
    b.save(os.path.join(OUT, body + '.png'), optimize=True)
    o.save(os.path.join(OUT, orb + '.png'), optimize=True)
    manifest[body] = dict(m, w=b.width)
    # âncora do orbe = centro da esfera (lado direito da imagem)
    manifest[orb] = {'w': o.width, 'h': o.height, 'ax': round(o.width * 0.68, 1), 'ay': round(o.height * 0.5, 1), 'bodyH': o.height}
    os.remove(os.path.join(OUT, src + '.png'))
    del manifest[src]

json.dump(manifest, open(os.path.join(OUT, 'vex.json'), 'w'), indent=1)
with open(os.path.join(ROOT, 'web/js/sprites-vex.js'), 'w') as f:
    f.write('// Gerado por tools/extract-vex.py: tamanho e ponto de apoio (pés) de cada quadro do Vex\n')
    f.write('window.RR = window.RR || {};\nRR.spriteData = RR.spriteData || {};\nRR.spriteData.vex = ' + json.dumps(manifest) + ';\n')

# Arena dos Gêmeos (sem fundo verde), em WebP para ficar leve
arena = key(Image.open(os.path.join(ROOT, 'art/source/arena-gemeos.png')))
arena.save(os.path.join(ROOT, 'web/img/arena-gemeos.webp'), 'WEBP', quality=88, method=6)
print('arena', arena.size)
