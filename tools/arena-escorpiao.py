# Arena da Noxara (Abismo do Escorpião).
# (o personagem agora vem dos vídeos: tools/extract-video-chars.py)
# Uso: python3 tools/arena-escorpiao.py
import os
from PIL import Image
from chroma import key

ROOT = os.path.join(os.path.dirname(__file__), '..')

key(Image.open(os.path.join(ROOT, 'art/source/arena-escorpiao.png'))).save(os.path.join(ROOT, 'web/img/arena-escorpiao.webp'), 'WEBP', quality=88, method=6)
Image.open(os.path.join(ROOT, 'art/source/arena-escorpiao-fundo.png')).convert('RGB').save(os.path.join(ROOT, 'web/img/arena-escorpiao-fundo.webp'), 'WEBP', quality=82, method=6)
