#!/usr/bin/env python3
"""
バージョン番号を更新するスクリプト

使い方:
  python scripts/bump_version.py patch     # 0.1.0 → 0.1.1
  python scripts/bump_version.py minor     # 0.1.0 → 0.2.0
  python scripts/bump_version.py major     # 0.1.0 → 1.0.0
  python scripts/bump_version.py 1.2.3     # 任意のバージョンを指定
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

INIT_PATH = Path(__file__).parent.parent / "tateyomi" / "__init__.py"
CHANGELOG_PATH = Path(__file__).parent.parent / "CHANGELOG.md"


def get_current_version() -> str:
    text = INIT_PATH.read_text(encoding="utf-8")
    m = re.search(r'__version__\s*=\s*"([^"]+)"', text)
    if not m:
        raise ValueError("__version__ not found in tateyomi/__init__.py")
    return m.group(1)


def bump(current: str, part: str) -> str:
    major, minor, patch = map(int, current.split("."))
    if part == "major":
        return f"{major + 1}.0.0"
    elif part == "minor":
        return f"{major}.{minor + 1}.0"
    elif part == "patch":
        return f"{major}.{minor}.{patch + 1}"
    else:
        # explicit version
        if not re.fullmatch(r"\d+\.\d+\.\d+", part):
            raise ValueError(f"Invalid version: {part!r}  (expected X.Y.Z or major/minor/patch)")
        return part


def update_init(new_ver: str) -> None:
    text = INIT_PATH.read_text(encoding="utf-8")
    updated = re.sub(r'(__version__\s*=\s*")[^"]+(")', rf'\g<1>{new_ver}\2', text)
    INIT_PATH.write_text(updated, encoding="utf-8")


def update_changelog(new_ver: str) -> None:
    """CHANGELOG.md の [Unreleased] セクションを新バージョンに変換する"""
    if not CHANGELOG_PATH.exists():
        return
    from datetime import date
    today = date.today().isoformat()
    text = CHANGELOG_PATH.read_text(encoding="utf-8")
    # ## [Unreleased] → ## [X.Y.Z] - YYYY-MM-DD
    updated = text.replace(
        "## [Unreleased]",
        f"## [Unreleased]\n\n## [{new_ver}] - {today}",
        1,
    )
    if updated != text:
        CHANGELOG_PATH.write_text(updated, encoding="utf-8")
        print(f"  CHANGELOG.md: [Unreleased] → [{new_ver}] - {today}")


def main() -> None:
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)

    arg = sys.argv[1]
    current = get_current_version()
    new_ver = bump(current, arg)

    print(f"Bumping version: {current} → {new_ver}")
    update_init(new_ver)
    update_changelog(new_ver)
    print(f"Done. tateyomi/__init__.py updated to {new_ver}")
    print("Next steps:")
    print(f"  git add tateyomi/__init__.py CHANGELOG.md")
    print(f"  git commit -m 'chore: bump version to {new_ver}'")
    print(f"  git tag v{new_ver}")


if __name__ == "__main__":
    main()
