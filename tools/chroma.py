# Remove o fundo verde (chroma key) e corrige o vazamento de verde nas bordas.
import numpy as np
from PIL import Image

def key(img, lo=40, hi=110):
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = g - np.maximum(r, b)
    alpha = np.clip(1 - (green - lo) / (hi - lo), 0, 1)
    # tira o verde que sobra nas bordas
    spill = np.maximum(r, b)
    g2 = np.where(g > spill, spill + (g - spill) * alpha * 0.3, g)
    out = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def key_magenta(img, lo=70, hi=120):
    """Fundo magenta (para personagens com verde no corpo). Sombras roxas no chão também somem."""
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    k = np.minimum(r, b) - g
    alpha = np.clip(1 - (k - lo) / (hi - lo), 0, 1)
    # tira o rosa que sobra nas bordas
    b2 = np.where(alpha < 1, np.minimum(b, np.maximum(g, b * alpha)), b)
    r2 = np.where(alpha < 1, np.minimum(r, np.maximum(g, r * (0.5 + 0.5 * alpha))), r)
    out = np.dstack([r2, g, b2, alpha * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')
