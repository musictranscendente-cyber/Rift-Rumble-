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
