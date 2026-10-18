# Quadros de animação a partir de vídeo (fundo de cor sólida, câmera parada).
import os, subprocess, tempfile
import numpy as np
from PIL import Image
from sprite_tools import clean


def key_auto(img, lo=55, hi=110, klo=70, khi=120):
    """Fundo magenta com degradê: compara com a cor da borda de cada quadro e com o 'rosa puro'."""
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((a - bg) ** 2).sum(axis=2))
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    k = np.minimum(r, b) - g
    alpha = np.minimum(np.clip((dist - lo) / (hi - lo), 0, 1), np.clip(1 - (k - klo) / (khi - klo), 0, 1))
    # sombra roxa escura no chão (quase sem verde, vermelho e azul juntos)
    shadow = (g < 30) & (np.minimum(r, b) > 35) & (np.minimum(r, b) > 2.5 * g + 20)
    alpha = np.where(shadow, 0, alpha)
    b2 = np.where(alpha < 1, np.minimum(b, np.maximum(g, b * alpha)), b)
    r2 = np.where(alpha < 1, np.minimum(r, np.maximum(g, r * (0.5 + 0.5 * alpha))), r)
    return Image.fromarray(np.dstack([r2, g, b2, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA')


def video_frames(video, out_dir, name, a, b, step, mode, R, keyfn, body_h=None):
    """Extrai os quadros a..b (passo step), mesmo recorte para todos.
    mode: 'fixed' (pés fixos), 'medfoot' (pés pela mediana), 'bottom' (base de cada quadro),
          'jet' (base do corpo largo), 'center' (centro, para projéteis), 'follow' (centro e base de cada quadro),
          'first' (pés do primeiro quadro, para efeitos que crescem e passam dos pés)."""
    tmp = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-i', video, os.path.join(tmp, '%03d.png')], check=True)
    idx = list(range(a, b + 1, step))
    keyed = [clean(np.asarray(keyfn(Image.open(os.path.join(tmp, f'{i:03d}.png')))).copy(), keep_frac=0.02) for i in idx]
    boxes = []
    for k in keyed:
        ys, xs = np.nonzero(k[..., 3] > 10)
        boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    x0, y0 = min(bx[0] for bx in boxes), min(bx[1] for bx in boxes)
    x1, y1 = max(bx[2] for bx in boxes), max(bx[3] for bx in boxes)
    body = keyed[0][..., 3] > 200
    ys, xs = np.nonzero(body)
    foot = np.percentile(ys, 99.5)
    band = ys > foot - (foot - ys.min()) * 0.15
    ax = (xs[band].mean() - x0) * R
    ay = (y1 - 4 - y0) * R
    if mode == 'first':
        # pés onde estavam no primeiro quadro (efeitos grandes depois não mexem no apoio)
        ay = (foot - y0) * R
    if mode == 'medfoot':
        feet = [np.nonzero((k[..., 3] > 200).sum(axis=1) > 25)[0].max() for k in keyed]
        ay = (float(np.median(feet)) - y0) * R
    w, h = round((x1 - x0) * R), round((y1 - y0) * R)
    out = {}
    for n, k in enumerate(keyed):
        im = Image.fromarray(k[y0:y1, x0:x1], 'RGBA').resize((w, h), Image.LANCZOS)
        fname = f'{name}{n:02d}'
        im.save(os.path.join(out_dir, fname + '.png'), optimize=True)
        al = np.asarray(im)[..., 3] > 140
        rows = np.nonzero(al.any(axis=1))[0]
        top = rows.min()
        fax, fay = ax, ay
        if mode == 'center':
            fax, fay = w * 0.7, h * 0.5
        elif mode == 'bottom':
            fay = rows.max()
        elif mode == 'top':
            # ponto de apoio = topo do corpo + altura do corpo parado (poeira embaixo não conta)
            fay = top + body_h
            cols = np.nonzero(al[top:top + int(body_h * 0.5)].sum(axis=0) > 3)[0]
            fax = (cols.min() + cols.max()) / 2
        elif mode in ('jet', 'follow'):
            widths = al.sum(axis=1)
            wmax = widths.max()
            yb = rows.max()
            while yb > top and widths[yb] < wmax * 0.45:
                yb -= 1
            fay = yb
            if mode == 'follow':
                cols = np.nonzero(al[top:yb + 1].sum(axis=0) > 3)[0]
                fax = (cols.min() + cols.max()) / 2
        out[fname] = {'w': w, 'h': h, 'ax': round(float(fax), 1), 'ay': round(float(fay), 1), 'bodyH': round(float(fay - top), 1)}
    return out


def to_webp(out_dir):
    for f in os.listdir(out_dir):
        if f.endswith('.png'):
            p = os.path.join(out_dir, f)
            Image.open(p).save(p[:-4] + '.webp', 'WEBP', quality=90, method=6)
            os.remove(p)


def key_fx(img, top=60, side=70, bottom=20):
    """Fundo verde com efeitos brilhantes: tira o brilho verde que sobra e esfuma as bordas do quadro,
    para o que o vídeo cortou (ondas nas laterais, pinças no topo) sumir suave em vez de virar uma linha reta."""
    from chroma import key
    k = np.asarray(key(img, lo=30, hi=90)).astype(np.float32)
    r, g, b, a = (k[..., i] for i in range(4))
    g = np.minimum(g, np.maximum(r, b) + 12)
    H, W = a.shape
    y, x = np.arange(H)[:, None], np.arange(W)[None, :]
    fade = np.clip(y / top, 0, 1) * np.clip((H - 1 - y) / bottom, 0, 1) * np.clip(x / side, 0, 1) * np.clip((W - 1 - x) / side, 0, 1)
    return Image.fromarray(np.dstack([r, g, b, a * fade]).clip(0, 255).astype(np.uint8), 'RGBA')
