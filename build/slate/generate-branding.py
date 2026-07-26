#!/usr/bin/env python3
"""Genere les images de marque Slate (icones Windows, bitmaps d'installateur).

Les images de Code - OSS ne peuvent pas etre reutilisees : le logo de VS Code est
une marque Microsoft, exclue de la licence MIT du code. Ce script produit donc
des images entierement originales.

Le logo est defini geometriquement plutot que dessine a la main : le depot ne
porte que ce script, et les binaires peuvent etre regeneres a l'identique.

Usage :
    python build/slate/generate-branding.py

Dependance : Pillow (`pip install Pillow`). Verifie avec Pillow 12.3.0.
"""

from __future__ import annotations

import argparse
import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:  # pragma: no cover
    sys.exit("Pillow est requis : pip install Pillow")

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WIN32 = os.path.join(REPO, "resources", "win32")

# Palette Slate : ardoise froide, marque claire. Volontairement sobre et
# distincte du bleu de VS Code.
SLATE_TOP = (58, 71, 86)
SLATE_BOTTOM = (30, 37, 46)
MARK = (240, 244, 248)
ACCENT = (94, 176, 209)

# Suréchantillonnage : on dessine grand puis on réduit, seul moyen d'obtenir un
# anticrénelage correct avec ImageDraw.
SS = 8

# Tracé du « S », en coordonnées normalisées (0..1) sur le carré du logo.
# Un S anguleux à trois segments reste lisible à 16 px, contrairement à un S
# calligraphique.
S_PATH = [
    (0.72, 0.26),
    (0.36, 0.26),
    (0.36, 0.47),
    (0.66, 0.47),
    (0.66, 0.74),
    (0.28, 0.74),
]
S_WIDTH = 0.115


def stroke_ratio(size: int) -> float:
    """Épaisseur du trait, affinée aux petites tailles.

    À 16 px un trait de 0,115 fait moins de 2 px et les contre-formes du « S »
    se bouchent à la réduction. On amincit donc le trait pour garder les vides
    ouverts, seul critère de lisibilité à cette taille.
    """
    if size <= 16:
        return 0.085
    if size <= 32:
        return 0.098
    return S_WIDTH


def rounded_tile(size: int, radius_ratio: float = 0.18, bg: bool = True) -> Image.Image:
    """Tuile carrée à coins arrondis, dégradé vertical, avec le « S » Slate."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))

    if bg:
        gradient = Image.new("RGBA", (1, big))
        for y in range(big):
            t = y / max(1, big - 1)
            gradient.putpixel((0, y), (
                round(SLATE_TOP[0] + (SLATE_BOTTOM[0] - SLATE_TOP[0]) * t),
                round(SLATE_TOP[1] + (SLATE_BOTTOM[1] - SLATE_TOP[1]) * t),
                round(SLATE_TOP[2] + (SLATE_BOTTOM[2] - SLATE_TOP[2]) * t),
                255,
            ))
        gradient = gradient.resize((big, big))

        mask = Image.new("L", (big, big), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            (0, 0, big - 1, big - 1), radius=int(big * radius_ratio), fill=255
        )
        img.paste(gradient, (0, 0), mask)

    draw = ImageDraw.Draw(img)
    stroke = max(1, int(big * stroke_ratio(size)))
    pts = [(x * big, y * big) for x, y in S_PATH]
    draw.line(pts, fill=MARK, width=stroke, joint="curve")
    # Les extrémités du tracé sont carrées : on les arrondit à la main.
    r = stroke // 2
    for x, y in (pts[0], pts[-1]):
        draw.ellipse((x - r, y - r, x + r, y + r), fill=MARK)

    # Accent : point discret en bas à droite, marqueur de « curseur ».
    # En dessous de 20 px il ne fait plus qu'un pixel sale : on l'omet.
    if bg and size >= 20:
        cx, cy, cr = big * 0.79, big * 0.79, big * 0.055
        draw.ellipse((cx - cr, cy - cr, cx + cr, cy + cr), fill=ACCENT)

    return img.resize((size, size), Image.LANCZOS)


def banner(width: int, height: int) -> Image.Image:
    """Bandeau vertical de l'assistant d'installation."""
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)
    for y in range(height):
        t = y / max(1, height - 1)
        draw.line(
            [(0, y), (width, y)],
            fill=(
                round(SLATE_TOP[0] + (SLATE_BOTTOM[0] - SLATE_TOP[0]) * t),
                round(SLATE_TOP[1] + (SLATE_BOTTOM[1] - SLATE_TOP[1]) * t),
                round(SLATE_TOP[2] + (SLATE_BOTTOM[2] - SLATE_TOP[2]) * t),
            ),
        )

    logo_size = int(width * 0.52)
    logo = rounded_tile(logo_size, bg=False)
    img.paste(logo, ((width - logo_size) // 2, int(height * 0.30)), logo)

    # Filet d'accent en pied de bandeau.
    bar_h = max(2, height // 110)
    draw.rectangle((0, height - bar_h, width, height), fill=ACCENT)
    return img


# Tailles reprises des fichiers d'origine : Inno Setup impose ces dimensions
# exactes pour chaque facteur d'échelle.
BIG = {
    100: (164, 314), 125: (192, 386), 150: (246, 459), 175: (273, 556),
    200: (328, 604), 225: (355, 700), 250: (410, 797),
}
SMALL = {
    100: (55, 55), 125: (64, 68), 150: (83, 80), 175: (92, 97),
    200: (110, 106), 225: (119, 123), 250: (138, 140),
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out",
        default=WIN32,
        help="dossier de sortie (defaut : resources/win32 du depot). Utile pour"
        " verifier la generation sans toucher au depot.",
    )
    args = parser.parse_args(argv)
    out = os.path.abspath(args.out)

    if not os.path.isdir(out):
        sys.exit(f"introuvable : {out}")

    written = []

    # Chaque taille est rendue nativement plutot que reduite depuis le 256 px :
    # une seule reduction bouche les contre-formes du « S » a 16 et 32 px.
    ico_path = os.path.join(out, "code.ico")
    ico_sizes = [16, 32, 128, 256]
    frames = [rounded_tile(s) for s in ico_sizes]
    frames[-1].save(
        ico_path,
        format="ICO",
        sizes=[(s, s) for s in ico_sizes],
        append_images=frames[:-1],
    )
    written.append(ico_path)

    for name, size, mode in (("code_70x70.png", 70, "RGBA"), ("code_150x150.png", 150, "RGBA")):
        path = os.path.join(out, name)
        rounded_tile(size).convert(mode).save(path, format="PNG")
        written.append(path)

    for scale, (w, h) in BIG.items():
        path = os.path.join(out, f"inno-big-{scale}.bmp")
        banner(w, h).save(path, format="BMP")
        written.append(path)

    for scale, (w, h) in SMALL.items():
        path = os.path.join(out, f"inno-small-{scale}.bmp")
        side = min(w, h)
        img = Image.new("RGB", (w, h), SLATE_BOTTOM)
        logo = rounded_tile(side)
        img.paste(logo, ((w - side) // 2, (h - side) // 2), logo)
        img.save(path, format="BMP")
        written.append(path)

    for path in written:
        try:
            label = os.path.relpath(path, REPO)
        except ValueError:
            # Sortie sur un autre volume que le depot (test en dossier temporaire).
            label = path
        print(f"  {label} ({os.path.getsize(path)} o)")
    print(f"{len(written)} fichiers generes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
