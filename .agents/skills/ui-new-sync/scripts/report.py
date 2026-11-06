#!/usr/bin/env python3
"""Read-only delta between upstream ui/ and the ui-new fork.

Prints a markdown report. Does not write files.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SKIP_DIRS = frozenset({".next", "node_modules", "out", "dist", "coverage", ".git"})
T_CALL = re.compile(r"""(?:\bi18n\.t|\bt)\(\s*["']""")
CJK = re.compile(r"[\u4e00-\u9fff]")
PLACEHOLDER = re.compile(r"\{\{[^}]+\}\}")
TAG = re.compile(r"</?([A-Za-z][\w.]*)")


def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def skill_dir() -> Path:
    return Path(__file__).resolve().parents[1]


def load_allowlist() -> tuple[str, ...]:
    lines = (skill_dir() / "allowlist.txt").read_text(encoding="utf-8").splitlines()
    return tuple(line.strip() for line in lines if line.strip() and not line.startswith("#"))


def allowed(rel: str, rules: tuple[str, ...]) -> bool:
    return any(rel == rule or (rule.endswith("/") and rel.startswith(rule)) for rule in rules)


def flatten(value: object, prefix: str = "") -> dict[str, str]:
    if isinstance(value, dict):
        out: dict[str, str] = {}
        for key, child in value.items():
            path = f"{prefix}.{key}" if prefix else str(key)
            out.update(flatten(child, path))
        return out
    if isinstance(value, str):
        return {prefix: value}
    return {prefix: json.dumps(value, ensure_ascii=False)}


def read_json(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    return flatten(json.loads(path.read_text(encoding="utf-8")))


def pages(dashboard: Path) -> set[str]:
    app = dashboard / "src" / "app"
    if not app.exists():
        return set()
    return {p.relative_to(app).as_posix() for p in app.rglob("page.tsx")}


def areas(dashboard: Path) -> set[str]:
    found: set[str] = set()
    app = dashboard / "src" / "app"
    if app.is_dir():
        found.update(f"app/{path.name}" for path in app.iterdir() if path.is_dir() and path.name != "(dashboard)")
        dash = app / "(dashboard)"
        if dash.is_dir():
            found.update(f"route/{path.name}" for path in dash.iterdir() if path.is_dir())
    components = dashboard / "src" / "components"
    if components.is_dir():
        found.update(f"component/{path.name}" for path in components.iterdir() if path.is_dir())
    return found


def count_t(dashboard: Path) -> int:
    src = dashboard / "src"
    total = 0
    for path in src.rglob("*"):
        if path.suffix not in {".ts", ".tsx"} or ".test." in path.name:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        total += len(T_CALL.findall(path.read_text(encoding="utf-8", errors="replace")))
    return total


def cjk_outside(dashboard: Path, rules: tuple[str, ...]) -> list[str]:
    src = dashboard / "src"
    found: list[str] = []
    for path in src.rglob("*"):
        if path.suffix not in {".ts", ".tsx"} or ".test." in path.name:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        rel = path.relative_to(dashboard).as_posix()
        if allowed(rel, rules):
            continue
        if CJK.search(path.read_text(encoding="utf-8", errors="replace")):
            found.append(rel)
    return sorted(found)


def tokens(text: str) -> tuple[tuple[str, ...], tuple[str, ...]]:
    return (tuple(sorted(PLACEHOLDER.findall(text))), tuple(sorted(TAG.findall(text))))


def sample(items: list[str], limit: int = 25) -> list[str]:
    if len(items) <= limit:
        return items
    return [*items[:limit], f"... and {len(items) - limit} more"]


def main() -> int:
    root = repo_root()
    upstream = root / "ui" / "litellm-dashboard"
    fork = root / "ui-new" / "litellm-dashboard"
    if not upstream.is_dir() or not fork.is_dir():
        print("missing ui/litellm-dashboard or ui-new/litellm-dashboard", file=sys.stderr)
        return 2

    rules = load_allowlist()
    en_up = read_json(upstream / "src/i18n/locales/en.json")
    en_fork = read_json(fork / "src/i18n/locales/en.json")
    zh = read_json(fork / "src/i18n/locales/zh-CN.json")
    baseline_path = fork / ".i18n-base" / "en.json"
    baseline = read_json(baseline_path)
    old = baseline or en_fork
    old_name = ".i18n-base/en.json" if baseline else "ui-new en.json (no baseline yet)"

    added = sorted(set(en_up) - set(old))
    removed = sorted(set(old) - set(en_up))
    changed = sorted(key for key in set(en_up) & set(old) if en_up[key] != old[key])
    placeholder_bad = sorted(
        key
        for key in set(en_up) & set(zh)
        if tokens(en_up[key]) != tokens(zh[key])
    )

    up_pages = pages(upstream)
    fork_pages = pages(fork)
    new_pages = sorted(up_pages - fork_pages)
    gone_pages = sorted(fork_pages - up_pages)
    up_areas = areas(upstream)
    fork_areas = areas(fork)
    new_areas = sorted(up_areas - fork_areas)
    gone_areas = sorted(fork_areas - up_areas)
    t_up = count_t(upstream)
    t_fork = count_t(fork)
    cjk_files = cjk_outside(fork, rules)
    mode = "harvest" if t_up and t_fork * 2 < t_up else "sync"

    lines = [
        "# ui-new sync report",
        "",
        f"mode: {mode}",
        f"t() calls: upstream {t_up}, ui-new {t_fork}",
        f"catalog baseline: {old_name}",
        f"en keys: upstream {len(en_up)}, previous {len(old)}, zh-CN {len(zh)}",
        f"zh coverage of upstream: {len(set(zh) & set(en_up))} / {len(en_up)}",
        "scope: ui/litellm-dashboard against ui-new/litellm-dashboard",
        "",
        "## UI areas only in this version (added)",
        *(f"- {name}" for name in sample(new_areas)),
        "none" if not new_areas else "",
        "",
        "## UI areas only in ui-new (removed upstream or fork-only)",
        *(f"- {name}" for name in sample(gone_areas)),
        "none" if not gone_areas else "",
        "",
        "## Pages only in upstream (new)",
        *(f"- {p}" for p in sample(new_pages)),
        "none" if not new_pages else "",
        "",
        "## Pages only in ui-new (removed upstream or fork-only)",
        *(f"- {p}" for p in sample(gone_pages)),
        "none" if not gone_pages else "",
        "",
        f"## Catalog added ({len(added)})",
        *(f"- `{key}` = {en_up[key]}" for key in sample(added)),
        "",
        f"## Catalog removed ({len(removed)})",
        *(f"- `{key}`" for key in sample(removed)),
        "",
        f"## English value changed ({len(changed)})",
        *(f"- `{key}`" for key in sample(changed)),
        "",
        f"## Placeholder or tag mismatch ({len(placeholder_bad)})",
        *(f"- `{key}`" for key in sample(placeholder_bad)),
        "",
        f"## CJK outside allowlist ({len(cjk_files)} files)",
        *(f"- {p}" for p in sample(cjk_files, 15)),
        "",
        "Do not overwrite ui-new while mode is harvest.",
    ]
    print("\n".join(line for line in lines if line is not None))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
