"""
Generates every app icon from the master logo (src/assets/Z.png):

  build/logo.png         clean master (drop shadow removed, tightly cropped)
  build/icon.png         256px app icon        (also public/icon.png)
  build/icon-512.png     512px, used by the README
  build/icon.ico         multi-size Windows icon, 16-256px (also public/icon.ico)
  build/brand-logo.png   256px logo for the splash and in-app branding
                         (also public/brand-logo.png)

Then run `node scripts/gen-brand-logo.mjs` to refresh src/assets/brandLogo.ts.

Requires Pillow and NumPy:  pip install pillow numpy
Usage:                      python scripts/generate-icons.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'src' / 'assets' / 'Z.png'
BUILD = ROOT / 'build'
PUBLIC = ROOT / 'public'

# The drop shadow is pure black at partial opacity; the letter itself is a bright gradient
SHADOW_MAX_BRIGHTNESS = 40
# Empty margin around the letter in the app icon, as a fraction of the icon size
ICON_PADDING = 0.06
ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256]


def remove_shadow(img: Image.Image) -> Image.Image:
    pixels = np.array(img.convert('RGBA'))
    brightness = pixels[..., :3].max(axis=-1)
    pixels[brightness < SHADOW_MAX_BRIGHTNESS, 3] = 0
    return Image.fromarray(pixels)


def square_canvas(img: Image.Image, padding: float) -> Image.Image:
    """Centers the cropped letter on a transparent square with the given margin."""
    side = round(max(img.size) / (1 - 2 * padding))
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
    return canvas


def main():
    logo = remove_shadow(Image.open(SOURCE))
    logo = logo.crop(logo.getbbox())
    logo.save(BUILD / 'logo.png', optimize=True)

    icon = square_canvas(logo, ICON_PADDING)
    resize = lambda size: icon.resize((size, size), Image.LANCZOS)

    for directory in (BUILD, PUBLIC):
        resize(256).save(directory / 'icon.png', optimize=True)
        resize(256).save(directory / 'brand-logo.png', optimize=True)
        resize(256).save(directory / 'icon.ico', sizes=[(s, s) for s in ICO_SIZES])
    resize(512).save(BUILD / 'icon-512.png', optimize=True)

    print(f'Ícones gerados a partir de {SOURCE.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
