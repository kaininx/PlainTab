#!/usr/bin/env python3
"""Build a Chrome Web Store zip for a release tag."""

from __future__ import annotations

import io
import subprocess
import sys
import zipfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
RELEASE_DIR = REPO_ROOT / "release"

EXCLUDE_DIRS = (
    "docs/",
    "imgs/",
    "wasm/",
    "benchmark/",
    "upload/",
)
EXCLUDE_SUFFIXES = (
    ".md",
    ".py",
)
EXCLUDE_FILES = (
    ".gitattributes",
)
EXCLUDE_DOTFILES = True


def get_latest_tag() -> str:
    output = subprocess.check_output(
        ["git", "tag", "--sort=-version:refname"],
        cwd=REPO_ROOT,
        text=True,
    )
    tags = [tag.strip() for tag in output.splitlines() if tag.strip()]
    if not tags:
        raise SystemExit("No git tags found.")
    return tags[0]


def should_exclude(path: str) -> bool:
    if not path:
        return True

    if EXCLUDE_DOTFILES and any(part.startswith(".") for part in path.split("/")):
        return True

    if path.startswith(EXCLUDE_DIRS):
        return True

    if any(path.endswith(suffix) for suffix in EXCLUDE_SUFFIXES):
        return True

    if any(name in path for name in EXCLUDE_FILES):
        return True

    return False


def build_zip(tag: str, output_name: Path) -> None:
    archive_data = subprocess.check_output(
        ["git", "archive", "--format=zip", "--prefix", f"PlainTab-{tag}/", tag],
        cwd=REPO_ROOT,
    )

    kept = 0
    skipped = 0
    with zipfile.ZipFile(io.BytesIO(archive_data)) as input_zip:
        with zipfile.ZipFile(output_name, "w", zipfile.ZIP_DEFLATED) as output_zip:
            for item in input_zip.infolist():
                rel_path = item.filename.removeprefix(f"PlainTab-{tag}/")
                if should_exclude(rel_path):
                    skipped += 1
                    continue
                output_zip.writestr(item, input_zip.read(item.filename))
                kept += 1

    print(f"Tag: {tag}")
    print(f"Included {kept} files, skipped {skipped} files.")
    print(f"Built {output_name}")


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    tag = args[0] if args else get_latest_tag()
    RELEASE_DIR.mkdir(exist_ok=True)
    build_zip(tag, RELEASE_DIR / f"PlainTab-{tag}.zip")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
