# Recorta os sprites do Astrael (Sagitário), a arena dele e gera os ícones do app a partir da logo.
# Uso: python3 tools/extract-sagitario.py
import os
from PIL import Image
from chroma import key
from sprite_tools import extract

ROOT = os.path.join(os.path.dirname(__file__), '..')
R1, R2, R3, R4, R5, R6 = (0, 165), (165, 332), (332, 463), (463, 608), (608, 776), (776, 1024)
row = lambda r, x0, x1: (x0, r[0], x1, r[1])
FRAMES = {
    'idle1': row(R1, 0, 154), 'idle2': row(R1, 154, 305),
    'run1': row(R1, 305, 446), 'run2': row(R1, 446, 585), 'run3': row(R1, 585, 728), 'run4': row(R1, 728, 880),
    'jump': row(R1, 880, 1043), 'fall': row(R1, 1043, 1193), 'land': row(R1, 1193, 1362), 'crouch': row(R1, 1362, 1536),
    'shield': row(R2, 0, 200), 'roll': row(R2, 200, 400), 'hurt': row(R2, 400, 597), 'launched': row(R2, 597, 767),
    'spin': row(R2, 767, 1051), 'ledge': row(R2, 1211, 1372),
    'a1': row(R3, 0, 229), 'a2': row(R3, 229, 452), 'a3': row(R3, 452, 666), 'a4': row(R3, 666, 862),
    'a5': row(R3, 862, 1080), 'a6': row(R3, 1080, 1309), 'a7': row(R3, 1309, 1536),
    'b1': row(R4, 0, 228), 'b2': row(R4, 228, 445), 'b3': row(R4, 445, 680), 'b4': row(R4, 680, 891), 'b5': row(R4, 891, 1080),
    'comet': row(R4, 1305, 1536),
    's1': row(R5, 0, 208), 's2': row(R5, 208, 346),
    'r1': row(R5, 346, 466), 'r2': row(R5, 466, 606), 'r3': row(R5, 606, 792), 'r4': row(R5, 792, 921), 'r5': row(R5, 921, 1123),
    'volley': row(R5, 1123, 1304),
    'u1': row(R6, 0, 234), 'u2': row(R6, 234, 617), 'u3': row(R6, 617, 1078), 'win': row(R6, 1078, 1280), 'face': row(R6, 1280, 1536),
}
ERASE = [(1305, 200, 1372, 332)]  # bloco de pedra da pose de borda
center = lambda w, h: (w * 0.5, h * 0.5)
ANCHORS = {'comet': lambda w, h: (w * 0.75, h * 0.5), 'volley': lambda w, h: (w * 0.75, h * 0.5), 'face': center}

m = extract(os.path.join(ROOT, 'art/source/sagitario-sheet.png'), FRAMES, os.path.join(ROOT, 'web/img/astrael'), 'astrael', ROOT,
            erase=ERASE, anchors=ANCHORS)
for k, v in m.items():
    print(k, v)

key(Image.open(os.path.join(ROOT, 'art/source/arena-sagitario.png'))).save(os.path.join(ROOT, 'web/img/arena-sagitario.webp'), 'WEBP', quality=88, method=6)
Image.open(os.path.join(ROOT, 'art/source/arena-sagitario-fundo.png')).convert('RGB').save(os.path.join(ROOT, 'web/img/arena-sagitario-fundo.webp'), 'WEBP', quality=82, method=6)

# logo: ícones do app (imagem inteira reduzida, sem cortar) e emblema da tela inicial
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
logo.resize((420, 420), Image.LANCZOS).save(os.path.join(ROOT, 'web/img/logo.webp'), 'WEBP', quality=90, method=6)
