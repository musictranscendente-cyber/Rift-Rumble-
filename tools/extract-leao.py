# Recorta os sprites do Solkar (Leão) e gera a arena dele.
# Uso: python3 tools/extract-leao.py
import os
from PIL import Image
from chroma import key
from sprite_tools import extract

ROOT = os.path.join(os.path.dirname(__file__), '..')
R1, R2, R3, R4, R5, R6 = (0, 170), (170, 341), (341, 482), (482, 617), (617, 782), (782, 1024)
row = lambda r, x0, x1: (x0, r[0], x1, r[1])
FRAMES = {
    'idle1': row(R1, 0, 166), 'idle2': row(R1, 166, 320),
    'run1': row(R1, 320, 483), 'run2': row(R1, 483, 640), 'run3': row(R1, 640, 797), 'run4': row(R1, 797, 956),
    'jump': row(R1, 956, 1116), 'land': row(R1, 1116, 1312), 'crouch': row(R1, 1312, 1536),
    'shield': row(R2, 0, 207), 'roll': row(R2, 207, 399), 'hurt': row(R2, 399, 605), 'launched': row(R2, 605, 752),
    'spin': row(R2, 752, 1040), 'ledge': row(R2, 1040, 1189),
    'a1': row(R3, 0, 240), 'a2': row(R3, 240, 464), 'a3': row(R3, 464, 663), 'a4': row(R3, 663, 886),
    'a5': row(R3, 886, 1088), 'a6': row(R3, 1088, 1317), 'a7': row(R3, 1317, 1536),
    'b1': row(R4, 0, 208), 'b2': row(R4, 208, 451), 'b3': row(R4, 451, 638), 'b4': row(R4, 638, 902), 'b5': row(R4, 902, 1110),
    'roarBig': row(R4, 1110, 1363), 'roar': row(R4, 1363, 1536),
    's1': row(R5, 0, 198), 's2': row(R5, 198, 334),
    'r1': row(R5, 334, 450), 'r2': row(R5, 450, 579), 'r3': row(R5, 579, 750), 'r4': row(R5, 750, 878), 'r5': row(R5, 878, 1130),
    'u1': row(R6, 0, 270), 'u2': row(R6, 270, 598), 'u3': row(R6, 598, 1043), 'win': row(R6, 1043, 1264), 'face': row(R6, 1264, 1536),
}
ERASE = [(1158, 250, 1215, 330)]  # bloco de pedra da pose de borda
center = lambda w, h: (w * 0.5, h * 0.5)
ANCHORS = {'roar': lambda w, h: (w * 0.72, h * 0.5), 'roarBig': lambda w, h: (w * 0.72, h * 0.5), 'face': center}

m = extract(os.path.join(ROOT, 'art/source/leao-sheet.png'), FRAMES, os.path.join(ROOT, 'web/img/solkar'), 'solkar', ROOT,
            erase=ERASE, anchors=ANCHORS)
for k, v in m.items():
    print(k, v)

key(Image.open(os.path.join(ROOT, 'art/source/arena-leao.png'))).save(os.path.join(ROOT, 'web/img/arena-leao.webp'), 'WEBP', quality=88, method=6)
Image.open(os.path.join(ROOT, 'art/source/arena-leao-fundo.png')).convert('RGB').save(os.path.join(ROOT, 'web/img/arena-leao-fundo.webp'), 'WEBP', quality=82, method=6)
