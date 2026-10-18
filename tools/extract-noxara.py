# Recorta os sprites da Noxara (Escorpião) e gera a arena dela.
# Uso: python3 tools/extract-noxara.py
import os
from PIL import Image
from chroma import key
from sprite_tools import extract

ROOT = os.path.join(os.path.dirname(__file__), '..')
R1, R2, R3, R4, R5, R6 = (0, 162), (165, 322), (325, 464), (467, 606), (608, 763), (766, 1024)
row = lambda r, x0, x1: (x0, r[0], x1, r[1])
FRAMES = {
    # linha 1: movimento
    'idle1': row(R1, 0, 165), 'idle2': row(R1, 165, 320),
    'run1': row(R1, 320, 465), 'run2': row(R1, 465, 600), 'run3': row(R1, 600, 740), 'run4': row(R1, 740, 890),
    'jump': row(R1, 890, 1035), 'fall': row(R1, 1035, 1200), 'land': row(R1, 1200, 1370), 'crouch': row(R1, 1370, 1536),
    # linha 2: defesa / dano / borda
    'shield': row(R2, 0, 190), 'roll': row(R2, 190, 390), 'hurt': row(R2, 390, 590), 'launched': row(R2, 590, 870),
    'ledge': (870, 165, 1034, 322),
    # linha 3: combo A
    'a1': row(R3, 0, 240), 'a2': row(R3, 240, 490), 'a3': row(R3, 490, 735),
    'a4': row(R3, 735, 995), 'a5': row(R3, 995, 1245), 'a6': row(R3, 1245, 1536),
    # linha 4: A + direção e projétil
    'b1': row(R4, 0, 235), 'b2': row(R4, 235, 475), 'b3': row(R4, 475, 715), 'b4': row(R4, 715, 935), 'b5': row(R4, 935, 1130),
    'blade1': row(R4, 1130, 1295), 'blade2': row(R4, 1295, 1415), 'impact': row(R4, 1415, 1536),
    # linha 5: especial, recuperação
    's1': row(R5, 0, 185), 's2': row(R5, 185, 345), 's3': row(R5, 345, 500),
    'r1': row(R5, 500, 655), 'r2': row(R5, 655, 840), 'r3': row(R5, 840, 1010),
    'bladeBig': row(R5, 1010, 1235), 'slam': row(R5, 1235, 1536),
    # linha 6: ultimate, vitória, rosto
    'u1': row(R6, 0, 255), 'u2': row(R6, 255, 625), 'u3': row(R6, 625, 1115), 'win': row(R6, 1115, 1330), 'face': row(R6, 1330, 1536),
}
center = lambda w, h: (w * 0.5, h * 0.5)
ANCHORS = {'blade1': lambda w, h: (w * 0.7, h * 0.5), 'blade2': lambda w, h: (w * 0.7, h * 0.5),
           'bladeBig': lambda w, h: (w * 0.75, h * 0.5), 'impact': center, 'face': center}

m = extract(os.path.join(ROOT, 'art/source/noxara-sheet.png'), FRAMES, os.path.join(ROOT, 'web/img/noxara'), 'noxara', ROOT, anchors=ANCHORS)
for k, v in m.items():
    print(k, v)

# arena (sem fundo verde) e fundo (imagem inteira, sem recorte)
key(Image.open(os.path.join(ROOT, 'art/source/arena-escorpiao.png'))).save(os.path.join(ROOT, 'web/img/arena-escorpiao.webp'), 'WEBP', quality=88, method=6)
Image.open(os.path.join(ROOT, 'art/source/arena-escorpiao-fundo.png')).convert('RGB').save(os.path.join(ROOT, 'web/img/arena-escorpiao-fundo.webp'), 'WEBP', quality=82, method=6)
