from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter


def generate_planet(source_path: Path, size: int) -> Image.Image:
    source_bytes = np.fromfile(source_path, dtype=np.uint8)
    source = cv2.imdecode(source_bytes, cv2.IMREAD_COLOR)
    if source is None:
        raise RuntimeError(f"Unable to read panorama: {source_path}")

    source_height, source_width = source.shape[:2]
    y, x = np.indices((size, size), dtype=np.float32)
    center = (size - 1) / 2
    dx = x - center
    dy = y - center
    radius = size * 0.48
    distance = np.sqrt(dx * dx + dy * dy)
    normalized = np.clip(distance / radius, 0, 1)
    radial = np.power(normalized, 0.72)

    angle = np.arctan2(dx, -dy) / (2 * np.pi) + 0.5
    map_x = np.mod(angle, 1.0) * (source_width - 1)
    map_y = (1.0 - radial) * (source_height - 1)

    remapped = cv2.remap(
        source,
        map_x.astype(np.float32),
        map_y.astype(np.float32),
        interpolation=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_WRAP,
    )
    rgba = cv2.cvtColor(remapped, cv2.COLOR_BGR2RGBA)

    feather = 3.0
    alpha = np.clip((radius - distance) / feather, 0, 1)
    rgba[:, :, 3] = np.round(alpha * 255).astype(np.uint8)
    return Image.fromarray(rgba, mode="RGBA")


def generate_preview(planet: Image.Image, width: int = 1600, height: int = 1000) -> Image.Image:
    top = np.array([34, 196, 245], dtype=np.float32)
    middle = np.array([153, 229, 255], dtype=np.float32)
    bottom = np.array([241, 251, 255], dtype=np.float32)
    rows = np.empty((height, 3), dtype=np.float32)
    split = int(height * 0.48)
    for index in range(height):
        if index <= split:
            amount = index / max(split, 1)
            rows[index] = top * (1 - amount) + middle * amount
        else:
            amount = (index - split) / max(height - split - 1, 1)
            rows[index] = middle * (1 - amount) + bottom * amount
    background = np.repeat(rows[:, None, :], width, axis=1)

    yy, xx = np.indices((height, width), dtype=np.float32)
    sun_x, sun_y = width * 0.35, height * 0.37
    sun_distance = np.sqrt((xx - sun_x) ** 2 + (yy - sun_y) ** 2)
    glow = np.clip(1 - sun_distance / (height * 0.33), 0, 1) ** 2
    background = np.clip(background + glow[:, :, None] * np.array([36, 27, 5]), 0, 255)
    canvas = Image.fromarray(background.astype(np.uint8), mode="RGB").convert("RGBA")

    planet_size = min(820, int(height * 0.82))
    planet_display = planet.resize((planet_size, planet_size), Image.Resampling.LANCZOS)
    left = (width - planet_size) // 2
    top_position = int(height * 0.53 - planet_size / 2)

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_alpha = planet_display.getchannel("A").filter(ImageFilter.GaussianBlur(28))
    shadow_layer = Image.new("RGBA", planet_display.size, (11, 70, 112, 105))
    shadow_layer.putalpha(shadow_alpha.point(lambda value: int(value * 0.42)))
    shadow.alpha_composite(shadow_layer, (left, top_position + 22))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(planet_display, (left, top_position))
    return canvas.convert("RGB")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("planet_output", type=Path)
    parser.add_argument("preview_output", type=Path)
    parser.add_argument("--size", type=int, default=1400)
    args = parser.parse_args()

    planet = generate_planet(args.source.resolve(), args.size)
    preview = generate_preview(planet)
    args.planet_output.parent.mkdir(parents=True, exist_ok=True)
    args.preview_output.parent.mkdir(parents=True, exist_ok=True)
    planet.save(args.planet_output, "WEBP", quality=92, method=6)
    preview.save(args.preview_output, "WEBP", quality=90, method=6)
    print(
        {
            "planet": str(args.planet_output),
            "planetSize": planet.size,
            "preview": str(args.preview_output),
            "previewSize": preview.size,
        }
    )


if __name__ == "__main__":
    main()
