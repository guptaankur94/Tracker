"""Builds the GitHub Pages files from the app source.

Usage:  python3 build/build.py path/to/open-loops.html
Writes index.html, manifest.webmanifest and the app icons into the repo root.
The source file is the same one published as the Claude artifact (no <html>/<head>
of its own), so this script adds the document shell and iPhone home-screen tags.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1])

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Open Loops">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#eef1f6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#10141c" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="manifest" href="manifest.webmanifest">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
"""
TAIL = "\n</body>\n</html>\n"


def icon(size: int) -> Image.Image:
    s = 4  # supersample for smooth edges
    W = size * s
    img = Image.new("RGB", (W, W), (47, 75, 216))
    d = ImageDraw.Draw(img)
    c = W / 2
    # three nested open loops, each a ring with a gap, in the app's kind colours
    rings = [(0.36, (255, 255, 255)), (0.25, (255, 214, 120)), (0.14, (120, 230, 214))]
    for r, col in rings:
        R = W * r
        w = int(W * 0.055)
        d.arc([c - R, c - R, c + R, c + R], start=-60, end=250, fill=col, width=w)
    img = img.resize((size, size), Image.LANCZOS)
    return img


def main() -> None:
    body = SRC.read_text(encoding="utf-8")
    (ROOT / "index.html").write_text(HEAD + body + TAIL, encoding="utf-8")
    for n in (180, 192, 512):
        icon(n).save(ROOT / f"icon-{n}.png", optimize=True)
    manifest = {
        "name": "Open Loops",
        "short_name": "Open Loops",
        "start_url": "./",
        "scope": "./",
        "display": "standalone",
        "background_color": "#eef1f6",
        "theme_color": "#2f4bd8",
        "icons": [
            {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
        ],
    }
    (ROOT / "manifest.webmanifest").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (ROOT / "src").mkdir(exist_ok=True)
    (ROOT / "src" / "open-loops.html").write_text(body, encoding="utf-8")
    print("built index.html, manifest.webmanifest, icons")


if __name__ == "__main__":
    main()
