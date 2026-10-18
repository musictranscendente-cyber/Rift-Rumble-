# Arena do Vex (Santuário dos Gêmeos), sem fundo verde e em WebP para ficar leve.
# (o personagem agora vem dos vídeos: tools/extract-video-chars.py)
# Uso: python3 tools/arena-gemeos.py
import os
from PIL import Image
from chroma import key

ROOT = os.path.join(os.path.dirname(__file__), '..')

arena = key(Image.open(os.path.join(ROOT, 'art/source/arena-gemeos.png')))
arena.save(os.path.join(ROOT, 'web/img/arena-gemeos.webp'), 'WEBP', quality=88, method=6)
print('arena', arena.size)
