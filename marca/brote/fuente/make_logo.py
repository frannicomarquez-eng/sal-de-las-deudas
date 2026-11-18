"""Genera los archivos finales del logo Brote (concepto B) con el texto convertido a curvas."""
import sys, os, io
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import uharfbuzz as hb

FONTS, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)


def load(path, axes):
    f = instantiateVariableFont(TTFont(path), axes)
    buf = io.BytesIO(); f.save(buf)
    return f, buf.getvalue()

# Mismo archivo, peso y tamaño óptico que muestra el lienzo (Safari/iPhone), verificado superponiendo la captura.
fr_font, fr_bytes = load(os.path.join(FONTS, 'fraunces_safari.ttf'), {'opsz': 144, 'wght': 300})
in_font, in_bytes = load(os.path.join(FONTS, 'inter.ttf'), {'opsz': 14, 'wght': 400})


def text_path(font, data, text, size, tracking_em=0.0):
    """Devuelve (d, width, ascent, descent) con baseline en y=0."""
    upem = font['head'].unitsPerEm
    face = hb.Face(data); hbf = hb.Font(face)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(hbf, buf, {'kern': True, 'liga': True})
    gs = font.getGlyphSet(); order = font.getGlyphOrder()
    s = size / upem; track = tracking_em * upem
    x = 0; parts = []
    infos, poss = buf.glyph_infos, buf.glyph_positions
    for i, (inf, pos) in enumerate(zip(infos, poss)):
        name = order[inf.codepoint]
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, (s, 0, 0, -s, (x + pos.x_offset) * s, -pos.y_offset * s))
        gs[name].draw(tp)
        parts.append(pen.getCommands())
        x += pos.x_advance + (track if i < len(infos) - 1 else 0)
    return ' '.join(parts), x * s


def sprout(cx, top, size, color, stroke):
    s = size / 64.0
    return (f'<g transform="translate({cx - 32 * s:.2f} {top:.2f}) scale({s:.4f})" fill="none" stroke="{color}" '
            f'stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round">'
            '<path d="M32 60 C32 49 32 40 32 31"/>'
            '<path d="M32 37 C22 37 13 31 11 19 C23 17 30 25 32 37 Z"/>'
            '<path d="M32 31 C34 19 42 10 55 10 C55 24 46 32 32 31 Z"/></g>')

WORD_SIZE = 136
TRACK = -0.027  # espaciado medido sobre la captura del diseño elegido
word_d, word_w = text_path(fr_font, fr_bytes, 'Brote', WORD_SIZE, TRACK)
TAG_SIZE, TAG_TRACK = 13, 0.36
tag_d, tag_w = text_path(in_font, in_bytes, 'CRECE CON VOS', TAG_SIZE, TAG_TRACK)
tag_box = tag_w + TAG_TRACK * TAG_SIZE  # el navegador suma el espaciado también después de la última letra
cap = fr_font['OS/2'].sCapHeight * WORD_SIZE / fr_font['head'].unitsPerEm


def metrics(font, size):
    h = font['hhea']; u = font['head'].unitsPerEm
    return h.ascent * size / u, -h.descent * size / u, h.lineGap * size / u


def full_logo(main, tag_color, line_color, tagline=True, pad=36):
    """Replica el artboard B: brote 72px, espacio 18, palabra 136px (line-height 1), espacio 18, bajada."""
    row_w = 40 + 14 + tag_box + 14 + 40
    W = max(word_w, row_w) + 2 * pad
    cx = W / 2
    y = pad
    out = [sprout(cx, y, 72, main, 2.2)]
    y += 72 + 18
    A, D, _ = metrics(fr_font, WORD_SIZE)
    base = y + (WORD_SIZE - (A + D)) / 2 + A
    out.append(f'<path transform="translate({cx - word_w / 2:.2f} {base:.2f})" fill="{main}" d="{word_d}"/>')
    y += WORD_SIZE
    if tagline:
        y += 18
        a, d, g = metrics(in_font, TAG_SIZE)
        lh = a + d + g
        tb = y + g / 2 + a
        x0 = cx - row_w / 2
        tx = x0 + 40 + 14
        out.append(f'<path transform="translate({tx:.2f} {tb:.2f})" fill="{tag_color}" d="{tag_d}"/>')
        ly = y + lh / 2
        out.append(f'<rect x="{x0:.2f}" y="{ly - 0.5:.2f}" width="40" height="1" fill="{line_color}"/>')
        out.append(f'<rect x="{x0 + row_w - 40:.2f}" y="{ly - 0.5:.2f}" width="40" height="1" fill="{line_color}"/>')
        y += lh
    H = y + pad
    return W, H, ''.join(out)


def svg(W, H, body, bg=None):
    rect = f'<rect width="100%" height="100%" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" '
            f'viewBox="0 0 {W:.2f} {H:.2f}">{rect}{body}</svg>\n')

GREEN, SAGE, CREAM, BLACK = '#2F4A3A', '#8FAE8B', '#F6F2EA', '#1A1A1A'
files = {}
W, H, b = full_logo(GREEN, '#5C6B60', SAGE); files['brote-logo-verde.svg'] = svg(W, H, b)
W, H, b = full_logo(CREAM, '#D9E2D6', '#8FAE8B'); files['brote-logo-crema.svg'] = svg(W, H, b)
W, H, b = full_logo(BLACK, BLACK, BLACK); files['brote-logo-negro.svg'] = svg(W, H, b)
W, H, b = full_logo(GREEN, '#5C6B60', SAGE, tagline=False); files['brote-logo-sin-bajada.svg'] = svg(W, H, b)
W, H, b = full_logo(CREAM, '#D9E2D6', '#8FAE8B', tagline=False); files['brote-logo-sin-bajada-crema.svg'] = svg(W, H, b)
files['brote-isotipo.svg'] = svg(120, 120, sprout(60, 4, 112, GREEN, 2.2))
# Avatar Instagram 1080x1080
K, SP, G = 1.8, 170, 34
block = SP * 60 / 64 + G + cap * K
top = 540 - block / 2 - 10
av = (sprout(540, top, SP, CREAM, 2.0) +
      f'<path transform="translate({540 - word_w * K / 2:.2f} {top + SP * 60 / 64 + G + cap * K:.2f}) scale({K})" fill="{CREAM}" d="{word_d}"/>')
files['brote-avatar-instagram.svg'] = svg(1080, 1080, av, GREEN)
for n, c in files.items():
    open(os.path.join(OUT, n), 'w').write(c)
print('\n'.join(files))
