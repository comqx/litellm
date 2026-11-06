---
name: ui-new-sync
description: >-
  After Workbuddy version-syncs the official tree onto the feature branch,
  compare ui/ with ui-new and translate added, changed, and removed dashboard
  features. Use when the user mentions ui-new translation, a new LiteLLM
  version, 按版本同步之后翻译, 界面增删, or 翻译 ui-new.
---

# ui-new sync

Workbuddy checks the official release on a schedule. When a newer version exists, it pulls that version's full tree onto this feature branch. It leaves `ui-new/` as it was. Backend, proxy, and `ui/` all come from that version. This skill does not pull, and it does not edit anything outside `ui-new/litellm-dashboard`.

After that drop, `ui/litellm-dashboard` is the new official UI. This skill compares it with `ui-new/litellm-dashboard` and translates the UI delta: new screens, removed screens, and changed copy.

Upstream calls `t("key")` with `ui/litellm-dashboard/src/i18n/locales/en.json`. Chinese lives in `ui-new/litellm-dashboard/src/i18n/locales/zh-CN.json`. Missing keys fall back to English. Do not write Chinese into component source.

If the version drop changed `ui-new/`, stop. Restore `ui-new` before translating.

## Gate

Run the report before any edit:

```bash
python3 .agents/skills/ui-new-sync/scripts/report.py
```

If the user only asked to look, stop after the report.

`mode: harvest` means ui-new still has Chinese inside components. Do not copy `ui/` over `ui-new`. Follow [Harvest](#harvest).

`mode: sync` means components already follow upstream. Follow [Sync](#sync).

## Harvest

Run once, before the first real sync. Preview first:

```bash
python3 .agents/skills/ui-new-sync/scripts/harvest.py
```

A pair is kept only when one deleted `t("key")` in a hunk maps to one added Chinese string. Everything else stays in the review list. Do not guess.

When the user asked to apply the harvest, run:

```bash
python3 .agents/skills/ui-new-sync/scripts/harvest.py --write-catalog
```

That writes `zh-CN.json` only. Then copy a fork file back from `ui/` only when that file contributed accepted pairs and has no review hunks. Leave review files, the allowlist, and `zh-CN.json` in place.

Files that dropped `t()` and put English back, with no Chinese to recover, go on the translate list. Do not invent Chinese for them during harvest.

## Sync

Use this after harvest, each time Workbuddy has put a newer official version on the branch.

1. Read the report. Tell the user which routes and component areas were added or removed, which pages appeared or disappeared, and how many catalog keys were added, removed, or changed. That list is the UI work. Leave the rest of the version drop alone.
2. Copy `ui/litellm-dashboard` onto `ui-new/litellm-dashboard`. Skip `node_modules`, `.next`, `out`, `.i18n-base`, and every path in [allowlist.txt](allowlist.txt).
3. Copy upstream `en.json` over the fork `en.json`. Keep the fork `zh-CN.json`.
4. Update `zh-CN.json` for the catalog delta only.
   - Delete keys for removed UI copy.
   - Retranslate keys whose English value changed, and keys whose `{{placeholders}}` or tags changed.
   - Translate keys that belong to added or changed UI. If the English value is in [glossary.json](glossary.json), use that Chinese value.
   - Keep every `{{...}}` and tag name identical to English. If they differ, stop and fix them before finishing.
5. Re-apply the nav hook in [reference.md](reference.md). `leftnav.tsx` is not on the allowlist. A new menu key is an added feature. Leave it in English until `navLabels.ts` has a line for it, and name it in the report.
6. Save the new upstream `en.json` to `ui-new/litellm-dashboard/.i18n-base/en.json`.
7. Run the report again. `mode` stays `sync`. Placeholder mismatches must be zero. New CJK outside the allowlist must be zero.

A route or page that exists only in `ui/` is part of the copy in step 2. Translate it through its new keys. Do not rewrite the page into Chinese literals.

A route or page that disappeared from `ui/` is removed from ui-new only when it is not on the allowlist. `old-usage` stays.

## While mode is still harvest

Workbuddy may already have dropped a full new version. `ui/` can be new while `ui-new` still has Chinese in components. Do not overwrite ui-new. Do this instead:

1. Report added and removed routes, component areas, and pages, plus the catalog delta against the fork `en.json`.
2. Translate that catalog delta into `zh-CN.json` using the glossary and placeholder rules.
3. Copy a file from `ui/` only when ui-new does not already have it.
4. Say which existing UI files changed in this version and are still blocked on harvest.

## Do not

- Do not pull upstream or edit the backend, proxy, or `ui/`. Workbuddy already version-synced those.
- Do not ask Workbuddy to edit `ui-new`.
- Do not translate by replacing `t()` with a Chinese literal.
- Do not keep a private copy of `leftnav.tsx` just to translate menu labels.
- Do not treat coverage under 100% as a failure. English fallback is the unfinished state.
- Do not commit unless the user asked.

Read [reference.md](reference.md) for the nav hook, the allowlist rule, and the glossary.
