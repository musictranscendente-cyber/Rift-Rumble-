# Funções comuns para recortar sprites de folhas com fundo verde.
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage
from chroma import key


def clean(rgba, keep_frac=0.12):
    """Remove pedaços de quadros vizinhos (tocando a borda) e caixas de texto escuras."""
    a = rgba[..., 3] > 40
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=2))
    total = a.sum()
    keep = np.zeros_like(a)
    H, W = a.shape
    for i, sl in enumerate(ndimage.find_objects(lab)):
        comp = (lab[sl] == i + 1) & a[sl]
        area = comp.sum()
        if area < 25:
            continue
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        rgb = rgba[sl][..., :3][comp].astype(int)
        if np.median(rgb.max(axis=1)) < 70 and area / (h * w) > 0.8 and w > 2 * h:
            continue
        touches = sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == H or sl[1].stop == W
        if touches and area < total * keep_frac:
            continue
        keep[sl] |= lab[sl] == i + 1
    out = rgba.copy()
    out[..., 3] = np.where(keep, out[..., 3], 0)
    return out


def body_anchor(rgba, sat_max=70):
    """Centro horizontal e pés do corpo (pixels opacos pouco saturados)."""
    rgb = rgba[..., :3].astype(int)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    body = (rgba[..., 3] > 200) & (sat < sat_max)
    if body.sum() < 50:
        body = rgba[..., 3] > 200
    ys, xs = np.nonzero(body)
    foot, top = float(np.percentile(ys, 99.5)), float(np.percentile(ys, 0.5))
    # centro horizontal pela faixa dos pés (caudas e asas não puxam o ponto de apoio)
    band = ys > foot - (foot - top) * 0.18
    return float(xs[band].mean()), foot, top


def extract(src, frames, out_dir, sprite_id, root, erase=(), anchors=None):
    """frames: {nome: (x0, y0, x1, y1)}; erase: retângulos a apagar; anchors: {nome: (ax, ay)} manuais."""
    os.makedirs(out_dir, exist_ok=True)
    sheet = key(Image.open(src)).copy()
    px = sheet.load()
    for (x0, y0, x1, y1) in erase:
        for yy in range(y0, y1):
            for xx in range(x0, x1):
                r, g, b, a = px[xx, yy]
                px[xx, yy] = (r, g, b, 0)
    manifest = {}
    for name, box in frames.items():
        rgba = clean(np.asarray(sheet.crop(box)).copy())
        ys, xs = np.nonzero(rgba[..., 3] > 10)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        rgba = rgba[y0:y1, x0:x1]
        ax, ay, top = body_anchor(rgba)
        if anchors and name in anchors:
            ax, ay = anchors[name](rgba.shape[1], rgba.shape[0])
        Image.fromarray(rgba, 'RGBA').save(os.path.join(out_dir, name + '.png'), optimize=True)
        manifest[name] = {'w': int(x1 - x0), 'h': int(y1 - y0), 'ax': round(ax, 1), 'ay': round(ay, 1), 'bodyH': round(ay - top, 1)}
    json.dump(manifest, open(os.path.join(out_dir, sprite_id + '.json'), 'w'), indent=1)
    with open(os.path.join(root, f'web/js/sprites-{sprite_id}.js'), 'w') as f:
        f.write(f'// Gerado pelas ferramentas de sprite: tamanho e ponto de apoio (pés) de cada quadro de {sprite_id}\n')
        f.write(f'window.RR = window.RR || {{}};\nRR.spriteData = RR.spriteData || {{}};\nRR.spriteData.{sprite_id} = ' + json.dumps(manifest) + ';\n')
    return manifest
