#!/usr/bin/env python3
"""Fail a deployment if the tarot deck or its cache version is inconsistent."""

from pathlib import Path
import re
import struct
import sys


ROOT = Path(__file__).resolve().parents[1]
TAROT_DIR = ROOT / "assets" / "tarot"
TARGET_RATIO = 91 / 155
MIN_WIDTH = 1000
MIN_HEIGHT = 1500
MAX_RATIO_DRIFT = 0.015


def png_dimensions(path: Path) -> tuple[int, int]:
    with path.open("rb") as image:
        header = image.read(24)
    if len(header) != 24 or header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        raise ValueError("not a valid PNG")
    return struct.unpack(">II", header[16:24])


def version(pattern: str, path: Path, label: str) -> str:
    match = re.search(pattern, path.read_text(encoding="utf-8"))
    if not match:
        raise ValueError(f"{label} version is missing from {path.name}")
    return match.group(1)


def main() -> int:
    failures: list[str] = []
    cards = sorted(TAROT_DIR.glob("*.png"))
    if len(cards) != 78:
        failures.append(f"expected 78 card images, found {len(cards)}")

    for card in cards:
        try:
            width, height = png_dimensions(card)
        except (OSError, ValueError) as error:
            failures.append(f"{card.name}: {error}")
            continue
        drift = abs(width / height - TARGET_RATIO) / TARGET_RATIO
        if width < MIN_WIDTH or height < MIN_HEIGHT:
            failures.append(
                f"{card.name}: {width}x{height} is below the {MIN_WIDTH}x{MIN_HEIGHT} quality floor"
            )
        if drift > MAX_RATIO_DRIFT:
            failures.append(
                f"{card.name}: {width}x{height} has the wrong card ratio ({drift:.1%} drift)"
            )

    try:
        shell_version = version(r"heart-cut-v(\d+)", ROOT / "sw.js", "service worker")
        index_versions = set(
            re.findall(r"(?:styles\.css|app\.js)\?v=(\d+)", (ROOT / "index.html").read_text(encoding="utf-8"))
        )
        art_version = version(r'CARD_ART_VERSION = "(\d+)"', ROOT / "app.js", "card art")
        if index_versions != {shell_version}:
            failures.append(
                f"index app-shell versions {sorted(index_versions)} do not match service worker v{shell_version}"
            )
        if art_version != shell_version:
            failures.append(
                f"card-art v{art_version} does not match app-shell v{shell_version}"
            )
        app_source = (ROOT / "app.js").read_text(encoding="utf-8")
        if ".png?v=${CARD_ART_VERSION}" not in app_source:
            failures.append("card artwork URLs are not cache-versioned")
    except (OSError, ValueError) as error:
        failures.append(str(error))

    if failures:
        print("Card asset validation failed:", file=sys.stderr)
        for failure in failures:
            print(f"  - {failure}", file=sys.stderr)
        return 1

    print(f"Card asset validation passed: {len(cards)} cards, release v{shell_version}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
