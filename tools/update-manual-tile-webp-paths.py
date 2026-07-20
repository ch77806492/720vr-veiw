from __future__ import annotations

import json
import re
from pathlib import Path


MANUAL_TILE_JPG = re.compile(
    r"((?:\./|/tour-output/)?assets/manual-tiles/[^\"']+?)\.jpg"
)


def replace_manual_tile_path(value: str) -> str:
    return MANUAL_TILE_JPG.sub(r"\1.webp", value)


def find_publish_dir(workspace: Path) -> Path:
    matches = [
        path
        for path in workspace.iterdir()
        if path.is_dir()
        and (path / "assets" / "manual-tiles").is_dir()
        and (path / "assets" / "tour.js").is_file()
        and (path / "data" / "project.json").is_file()
    ]
    if len(matches) != 1:
        raise RuntimeError(f"expected one publish directory, found {len(matches)}")
    return matches[0]


def update_project(project_path: Path) -> int:
    with project_path.open("r", encoding="utf-8") as source:
        project = json.load(source)

    changed = 0
    for scene in project.get("scenes", []):
        tiles = scene.get("krpanoTiles")
        if not isinstance(tiles, dict):
            continue
        for field in ("previewUrl", "thumbUrl", "pattern"):
            value = tiles.get(field)
            if not isinstance(value, str):
                continue
            updated = replace_manual_tile_path(value)
            if updated != value:
                tiles[field] = updated
                changed += 1

    with project_path.open("w", encoding="utf-8", newline="\n") as output:
        json.dump(project, output, ensure_ascii=False, indent=2)
        output.write("\n")
    return changed


def update_tour_script(tour_path: Path) -> int:
    text = tour_path.read_text(encoding="utf-8")
    updated, changed = MANUAL_TILE_JPG.subn(r"\1.webp", text)
    tour_path.write_text(updated, encoding="utf-8", newline="\n")
    return changed


def main() -> None:
    workspace = Path.cwd().resolve()
    publish_dir = find_publish_dir(workspace)
    project_changes = update_project(publish_dir / "data" / "project.json")
    script_changes = update_tour_script(publish_dir / "assets" / "tour.js")
    print(
        json.dumps(
            {
                "publishDir": str(publish_dir),
                "projectPathChanges": project_changes,
                "tourScriptPathChanges": script_changes,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
