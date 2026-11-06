#!/usr/bin/env python3
"""Pair deleted t("key") calls with an added Chinese literal in the same hunk.

Writes nothing unless --write-catalog is passed. That flag updates zh-CN.json only.
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from pathlib import Path

SKIP_DIRS = frozenset({".next", "node_modules", "out", "dist", "coverage", ".git"})
KEY_RE = re.compile(r"""(?:\bi18n\.t|\bt)\(\s*["']([^"']+)["']""")
CJK_STRING = re.compile(r"""["'`]([^"'`\n]*[\u4e00-\u9fff][^"'`\n]*)["'`]""")
CJK = re.compile(r"[\u4e00-\u9fff]")


def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def source_files(dashboard: Path) -> dict[str, Path]:
    files: dict[str, Path] = {}
    src = dashboard / "src"
    for path in src.rglob("*"):
        if path.suffix not in {".ts", ".tsx"} or ".test." in path.name:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        files[path.relative_to(dashboard).as_posix()] = path
    return files


def hunks(old: list[str], new: list[str]) -> list[tuple[list[str], list[str]]]:
    grouped: list[tuple[list[str], list[str]]] = []
    removed: list[str] = []
    added: list[str] = []

    def flush() -> None:
        if removed or added:
            grouped.append((list(removed), list(added)))
            removed.clear()
            added.clear()

    for line in difflib.unified_diff(old, new, n=0):
        if line.startswith("@@"):
            flush()
            continue
        if line.startswith(("---", "+++")):
            continue
        if line.startswith("-"):
            removed.append(line[1:])
        elif line.startswith("+"):
            added.append(line[1:])
    flush()
    return grouped


def pairs_for(old_text: str, new_text: str) -> tuple[dict[str, str], list[str]]:
    accepted: dict[str, str] = {}
    rejected: list[str] = []
    for removed, added in hunks(old_text.splitlines(), new_text.splitlines()):
        keys = [key for line in removed for key in KEY_RE.findall(line)]
        chinese = [text for line in added for text in CJK_STRING.findall(line)]
        if len(keys) == 1 and len(chinese) == 1:
            key, text = keys[0], chinese[0]
            previous = accepted.get(key)
            if previous is not None and previous != text:
                rejected.append(f"conflict {key}")
                continue
            accepted[key] = text
            continue
        if keys or any(CJK.search(line) for line in added):
            rejected.append(f"keys={len(keys)} chinese={len(chinese)}")
    return accepted, rejected


def set_path(tree: dict[str, object], dotted: str, value: str) -> None:
    parts = dotted.split(".")
    cursor = tree
    for part in parts[:-1]:
        child = cursor.get(part)
        if not isinstance(child, dict):
            child = {}
            cursor[part] = child
        cursor = child
    cursor[parts[-1]] = value


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-catalog", action="store_true")
    args = parser.parse_args()

    root = repo_root()
    upstream = root / "ui" / "litellm-dashboard"
    fork = root / "ui-new" / "litellm-dashboard"
    old_files = source_files(upstream)
    new_files = source_files(fork)
    accepted: dict[str, str] = {}
    review: list[str] = []
    for rel in sorted(set(old_files) & set(new_files)):
        old = old_files[rel].read_text(encoding="utf-8", errors="replace")
        new = new_files[rel].read_text(encoding="utf-8", errors="replace")
        if old == new:
            continue
        found, rejected = pairs_for(old, new)
        if rejected:
            review.append(f"{rel} ({len(rejected)} hunks)")
        for key, text in found.items():
            previous = accepted.get(key)
            if previous is not None and previous != text:
                review.append(f"duplicate {key} in {rel}")
                continue
            accepted[key] = text

    catalog_path = fork / "src/i18n/locales/zh-CN.json"
    existing = json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.exists() else {}
    if args.write_catalog:
        for key, text in sorted(accepted.items()):
            set_path(existing, key, text)
        catalog_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({"accepted": len(accepted), "review_files": len(review), "wrote_catalog": args.write_catalog, "review": review[:40]}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
