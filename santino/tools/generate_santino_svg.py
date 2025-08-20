from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from pathlib import Path
import argparse


def build_svg_from_text(font_path: Path, text: str, out_path: Path, fill: str = "#ffffff"):
    font = TTFont(str(font_path))
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap() or {}

    head = font["head"]
    hhea = font["hhea"]
    hmtx = font["hmtx"]
    units_per_em = head.unitsPerEm
    ascent = getattr(hhea, "ascent", int(units_per_em * 0.8))
    descent = getattr(hhea, "descent", -int(units_per_em * 0.2))  # typically negative

    # naive kerning from 'kern' table if present
    kern_table = {}
    if "kern" in font:
        try:
            for st in font["kern"].kernTables:
                if hasattr(st, "kernTable"):
                    kern_table.update(st.kernTable)
                elif hasattr(st, "kernDict"):
                    kern_table.update(st.kernDict)
        except Exception:
            pass

    pen = SVGPathPen(glyph_set)
    bpen = BoundsPen(glyph_set)

    x = 0
    last_glyph_name = None

    # map characters to glyphs
    def glyph_name_for_char(ch: str):
        gid_name = cmap.get(ord(ch))
        if gid_name is None:
            # fallback to .notdef if missing
            return ".notdef"
        return gid_name

    for ch in text:
        gname = glyph_name_for_char(ch)
        glyph = glyph_set[gname]

        # draw glyph at current x (baseline y=0)
        tpen = TransformPen(pen, (1, 0, 0, 1, x, 0))
        glyph.draw(tpen)
        # also to bounds pen to compute tight bbox
        tbpen = TransformPen(bpen, (1, 0, 0, 1, x, 0))
        glyph.draw(tbpen)

        # advance for next glyph
        aw, lsb = hmtx[gname]
        kerning_adj = 0
        if last_glyph_name is not None and kern_table:
            pair = (last_glyph_name, gname)
            kerning_adj = kern_table.get(pair, 0)
        x += aw + kerning_adj
        last_glyph_name = gname

    # Tight bounds
    if bpen.bounds is None:
        minx, miny, maxx, maxy = 0, descent, x or 1, ascent
    else:
        minx, miny, maxx, maxy = bpen.bounds
    width = int(max(1, round(maxx - minx)))
    height = int(max(1, round(maxy - miny)))

    # Build SVG with y-flip and translate to align bbox to viewBox
    path_d = pen.getCommands()
    svg = f"""
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet">
  <g transform="matrix(1 0 0 -1 {-minx} {maxy})">
    <path d="{path_d}" fill="{fill}" />
  </g>
</svg>
""".strip()

    out_path.write_text(svg, encoding="utf-8")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("font", type=Path)
    p.add_argument("text", type=str)
    p.add_argument("out", type=Path)
    p.add_argument("--fill", default="#ffffff")
    args = p.parse_args()
    build_svg_from_text(args.font, args.text, args.out, args.fill)


if __name__ == "__main__":
    main()
