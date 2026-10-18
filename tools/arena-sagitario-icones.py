# Arena do Astrael (Observatório Celeste) e ícones do app a partir da logo.
# (o personagem agora vem dos vídeos: tools/extract-video-chars.py)
# Uso: python3 tools/arena-sagitario-icones.py
import os
from PIL import Image
from chroma import key

ROOT = os.path.join(os.path.dirname(__file__), '..')

key(Image.open(os.path.join(ROOT, 'art/source/arena-sagitario.png'))).save(os.path.join(ROOT, 'web/img/arena-sagitario.webp'), 'WEBP', quality=88, method=6)
Image.open(os.path.join(ROOT, 'art/source/arena-sagitario-fundo.png')).convert('RGB').save(os.path.join(ROOT, 'web/img/arena-sagitario-fundo.webp'), 'WEBP', quality=82, method=6)

# logo: ícones do app (imagem inteira reduzida, sem cortar)
logo = Image.open(os.path.join(ROOT, 'art/source/logo-icone.png')).convert('RGBA')
for dpi, size in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    logo.resize((size, size), Image.LANCZOS).save(os.path.join(ROOT, f'android/res/mipmap-{dpi}/ic_launcher.png'), optimize=True)
logo.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'android/icon-512.png'), optimize=True)
# ícone adaptativo (Android 8+): camada de frente de 108dp onde só o centro aparece (~72dp, recortado no
# formato do celular). A logo ocupa esse centro e o fundo tem a cor da moldura dourada, sem placa branca.
for dpi, size in {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}.items():
    fg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    inner = round(size * 76 / 108)
    fg.alpha_composite(logo.resize((inner, inner), Image.LANCZOS), ((size - inner) // 2, (size - inner) // 2))
    fg.save(os.path.join(ROOT, f'android/res/mipmap-{dpi}/ic_launcher_foreground.png'), optimize=True)
