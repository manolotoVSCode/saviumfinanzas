"""Icono de la app: el cubo de public/favicon.svg sobre fondo blanco, a 1024 px."""
from pathlib import Path
from PIL import Image, ImageDraw

VERDE = (0x23, 0x90, 0x05)
LADO = 1024
ESCALA = LADO * 0.62 / 184          # el cubo ocupa ~62 % del icono
DESPLAZAMIENTO = (LADO - 184 * ESCALA) / 2
TRAZO = round(10 * ESCALA)

# Mismos trazos que el SVG (viewBox 184×184).
TRAZOS = [
    [(91.5, 10), (172.5, 48), (91.5, 86), (10.5, 48), (91.5, 10)],
    [(10.5, 48), (10.5, 136), (91.5, 175), (172.5, 136), (172.5, 48)],
    [(91.5, 106), (91.5, 175)],
]

def punto(p):
    return (DESPLAZAMIENTO + p[0] * ESCALA, DESPLAZAMIENTO + p[1] * ESCALA)

img = Image.new("RGB", (LADO, LADO), "white")
d = ImageDraw.Draw(img)
for trazo in TRAZOS:
    pts = [punto(p) for p in trazo]
    d.line(pts, fill=VERDE, width=TRAZO, joint="curve")
    for x, y in pts:  # extremos redondeados (stroke-linecap="round")
        r = TRAZO / 2
        d.ellipse((x - r, y - r, x + r, y + r), fill=VERDE)

destino = Path(__file__).resolve().parent.parent / "Savium/Assets.xcassets/AppIcon.appiconset/icono-1024.png"
destino.parent.mkdir(parents=True, exist_ok=True)
img.save(destino)
print(destino)
