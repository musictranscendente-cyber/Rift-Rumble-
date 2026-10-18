# Solkar, Astrael, Vex e Noxara: todas as animações tiradas dos vídeos do Grok (fundo verde).
# Cada vídeo pode ter o personagem num tamanho diferente: o primeiro quadro (pose parada) é medido
# e a escala de cada vídeo é ajustada para o personagem ficar sempre do mesmo tamanho no jogo.
# Uso: python3 tools/extract-video-chars.py [id ...]   (precisa de ffmpeg)
import json, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image
from sprite_tools import clean
import video_tools as vt

ROOT = os.path.join(os.path.dirname(__file__), '..')
MAXH = 140  # altura máxima do personagem nos quadros salvos (px)
ULT_R = 0.75  # ultimates (quadros enormes) com menos resolução: o APK fica bem menor

# prefixo: (vídeo, primeiro quadro, último, passo, modo do ponto de apoio); prefixos terminados em 'ult' usam ULT_R
CHARS = {
    'solkar': {
        'height': 92,  # altura do personagem parado no jogo (unidades do mundo)
        'face': (0.45, 0.0, 1.0, 0.62),  # recorte do rosto no quadro parado (frações da caixa)
        'videos': {
            'srun': ('run.mp4', 107, 132, 2, 'medfoot'),
            'sidle': ('idle.mp4', 84, 125, 3, 'medfoot'),
            'sjab': ('jab.mp4', 20, 92, 3, 'medfoot'),       # garra com arco de fogo
            'sjab2': ('jab2.mp4', 7, 52, 3, 'medfoot'),      # garra de volta
            'sjab3': ('jab3.mp4', 28, 76, 3, 'medfoot'),     # gancho de fogo
            'sjump': ('jump.mp4', 40, 68, 4, 'bottom'),
            'sspec': ('special.mp4', 7, 64, 3, 'medfoot'),   # Rugido Solar
            'srec': ('rec.mp4', 40, 112, 4, 'top'),          # Ascensão do Leão
            'swin': ('win.mp4', 55, 145, 4, 'medfoot'),
            'sult': ('ult.mp4', 1, 112, 3, 'first'),         # salto, bola de fogo e explosão (antes da poeira tingir o fundo)
        },
    },
    'astrael': {
        'height': 86,
        'face': (0.15, 0.0, 0.8, 0.5),
        'videos': {
            'arun': ('run.mp4', 96, 123, 2, 'medfoot'),
            'aidle': ('idle.mp4', 32, 86, 4, 'medfoot'),
            'ajab': ('jab.mp4', 7, 34, 2, 'medfoot'),        # golpe com o arco
            'ajab2': ('jab2.mp4', 7, 36, 2, 'medfoot'),      # tiro rápido
            'ajab3': ('jab3.mp4', 13, 92, 3, 'medfoot'),     # chute + flecha
            'ajump': ('jump.mp4', 43, 92, 4, 'bottom'),
            'achg': ('special.mp4', 7, 88, 3, 'medfoot'),    # puxando a corda (carga)
            'arel': ('special.mp4', 88, 115, 2, 'medfoot'),  # solta o cometa
            'arec': ('rec.mp4', 7, 100, 4, 'top'),
            'awin': ('win.mp4', 37, 110, 3, 'medfoot'),
            'ault': ('ult.mp4', 1, 145, 3, 'first'),         # flecha para o céu e chuva de flechas
        },
    },
    'vex': {
        'height': 74,
        'face': (0.0, 0.0, 0.5, 0.8),
        'videos': {
            'xrun': ('run.mp4', 111, 126, 2, 'medfoot'),
            'xidle': ('idle.mp4', 28, 75, 3, 'medfoot'),
            'xjab': ('jab.mp4', 1, 30, 2, 'medfoot'),        # soco de luz
            'xjab2': ('jab2.mp4', 7, 60, 3, 'medfoot'),      # chute do gêmeo da sombra
            'xjab3': ('jab3.mp4', 31, 80, 3, 'medfoot'),     # golpe juntos
            'xjump': ('jump.mp4', 25, 100, 4, 'bottom'),
            'xspec': ('special.mp4', 1, 90, 3, 'medfoot'),   # some e reaparece chutando
            'xrec': ('rec.mp4', 19, 100, 4, 'top'),          # espiral dupla
            'xwin': ('win.mp4', 1, 97, 3, 'medfoot'),        # antes da câmera aproximar
            'xult': ('ult.mp4', 1, 140, 3, 'first'),         # dragões
        },
    },
    'noxara': {
        'height': 80,
        'face': (0.4, 0.3, 0.95, 0.9),
        'videos': {
            'nrun': ('run.mp4', 127, 138, 1, 'medfoot'),
            'nidle': ('idle.mp4', 51, 135, 5, 'medfoot'),
            'njab': ('jab.mp4', 7, 30, 2, 'medfoot'),        # garras duplas
            'njab2': ('jab2.mp4', 19, 55, 3, 'medfoot'),     # corte girando
            'njab3': ('jab3.mp4', 13, 88, 3, 'medfoot'),     # ferrão com névoa
            'njump': ('jump.mp4', 25, 64, 3, 'bottom'),
            'nspec': ('special.mp4', 7, 118, 3, 'medfoot'),  # bote, prende, ferroadas e arremesso
            'nrec': ('rec.mp4', 13, 100, 4, 'top'),
            'nwin': ('win.mp4', 31, 145, 4, 'medfoot'),
            'nult': ('ult.mp4', 1, 142, 3, 'first'),         # eclipse, cortes e ferrão final
        },
    },
}


def first_height(path):
    """Altura do personagem no primeiro quadro do vídeo (px), sem respingos soltos."""
    tmp = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-frames:v', '1', os.path.join(tmp, 'f.png')], check=True)
    k = clean(np.asarray(vt.key_fx(Image.open(os.path.join(tmp, 'f.png')))).copy(), keep_frac=0.02)
    rows = np.nonzero((k[..., 3] > 200).sum(axis=1) > 3)[0]
    return float(rows.max() - rows.min())


def extract(cid, cfg):
    src = os.path.join(ROOT, 'art/source', cid)
    out = os.path.join(ROOT, 'web/img', cid)
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    manifest, scale = {}, {}
    for name, (file, a, b, step, mode) in cfg['videos'].items():
        path = os.path.join(src, file)
        h0 = first_height(path)
        R = min(1.0, MAXH / h0) * (ULT_R if name.endswith('ult') else 1)
        manifest.update(vt.video_frames(path, out, name, a, b, step, mode, R, vt.key_fx, h0 * R))
        scale[name] = round(cfg['height'] / (h0 * R), 4)
        print(cid, name, 'h0', round(h0), 'R', round(R, 3), 'escala', scale[name])

    # rosto para o placar e a seleção: pedaço do primeiro quadro parado
    idle = next(n for n in cfg['videos'] if n.endswith('idle'))
    im = Image.open(os.path.join(out, idle + '00.png'))
    ys, xs = np.nonzero(np.asarray(im)[..., 3] > 100)
    x0, y0, x1, y1 = cfg['face']
    W, H = xs.max() - xs.min(), ys.max() - ys.min()
    face = im.crop((int(xs.min() + W * x0), int(ys.min() + H * y0), int(xs.min() + W * x1), int(ys.min() + H * y1)))
    face.save(os.path.join(out, 'face.png'))
    manifest['face'] = {'w': face.width, 'h': face.height, 'ax': face.width / 2, 'ay': face.height / 2, 'bodyH': face.height}

    vt.to_webp(out, 82)
    counts = {}
    for k in manifest:
        p = k if k == 'face' else k[:-2]  # nome = prefixo + número de 2 dígitos
        counts[p] = counts.get(p, 0) + 1
    data = dict(manifest, __scale=scale, __count=counts)
    json.dump(data, open(os.path.join(out, cid + '.json'), 'w'), indent=1)
    with open(os.path.join(ROOT, f'web/js/sprites-{cid}.js'), 'w') as f:
        f.write(f'// Gerado por tools/extract-video-chars.py: tamanho, ponto de apoio, escala e quantidade de quadros de cada animação\n')
        f.write('window.RR = window.RR || {};\nRR.spriteData = RR.spriteData || {};\nRR.spriteData.' + cid + ' = ' + json.dumps(data) + ';\n')
    print(cid, counts)


for cid in sys.argv[1:] or CHARS:
    extract(cid, CHARS[cid])
