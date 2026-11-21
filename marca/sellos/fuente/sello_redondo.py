"""Genera el sello redondo de Brote en SVG con el texto en curvas (sin depender de fuentes).
Uso: python3 marca/sellos/fuente/sello_redondo.py
"""
import io, math, os, re
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TEXTO = 'CRECE CON VOS · ROPA DE 0 A 8 AÑOS · CÓRDOBA · '
SIZE, R_TEXT = 30, 190          # unidades del viewBox 500x500 (= 50 mm)

f = instantiateVariableFont(TTFont(os.path.join(ROOT, 'brote', 'fuente', 'inter.ttf')), {'opsz': 14, 'wght': 500})
buf = io.BytesIO(); f.save(buf)
upem = f['head'].unitsPerEm; s = SIZE / upem
gs = f.getGlyphSet(); cmap = f.getBestCmap(); hmtx = f['hmtx']
# Letra por letra desde el mapa de caracteres: así la Ñ y la Ó salen enteras (sin separar el acento).
glyphs = [(cmap[ord(c)], hmtx[cmap[ord(c)]][0] * s) for c in TEXTO]
natural = sum(a for _, a in glyphs)
circ = 2 * math.pi * R_TEXT
extra = (circ - natural) / len(glyphs)   # reparte el espacio sobrante para cerrar el círculo

paths, dist = [], 0.0
for name, adv in glyphs:
    mid = dist + adv / 2
    ang = mid / R_TEXT - math.pi / 2         # empieza arriba, sentido horario
    cx, cy = 250 + R_TEXT * math.cos(ang), 250 + R_TEXT * math.sin(ang)
    rot = math.degrees(ang) + 90
    pen = SVGPathPen(gs)
    gs[name].draw(TransformPen(pen, (s, 0, 0, -s, -adv / 2, SIZE * 0.36)))
    d = pen.getCommands()
    if d:
        paths.append(f'<path transform="translate({cx:.2f} {cy:.2f}) rotate({rot:.2f})" d="{d}"/>')
    dist += adv + extra

logo = open(os.path.join(ROOT, 'brote', 'svg', 'brote-logo-sin-bajada.svg')).read()
logo = logo.replace('#2F4A3A', '#000000')
w, h = map(float, re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', logo).groups())
lw = 290; lh = lw * h / w
logo = re.sub(r'<svg [^>]*>', f'<svg x="{250 - lw / 2:.2f}" y="{250 - lh / 2 - 6:.2f}" width="{lw}" height="{lh:.2f}" viewBox="0 0 {w} {h}">', logo, count=1)

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="50mm" height="50mm" viewBox="0 0 500 500">'
       f'<circle cx="250" cy="250" r="242" fill="none" stroke="#000" stroke-width="9"/>'
       f'<circle cx="250" cy="250" r="226" fill="none" stroke="#000" stroke-width="3"/>'
       f'<g fill="#000">{"".join(paths)}</g>{logo}</svg>\n')
out = os.path.join(HERE, 'sello-redondo-50mm.svg')
open(out, 'w').write(svg)
print(out)
