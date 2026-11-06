# ui-new sync reference

## Roles

Workbuddy owns the version drop. It looks up the latest official release, and when that release is newer than this branch, it puts the whole tree on the feature branch. `ui-new/` is not part of that drop.

This skill owns the UI delta only. It reads `ui/litellm-dashboard` as the official UI that arrived with the version, and edits `ui-new/litellm-dashboard` so new, changed, and removed screens have matching Chinese. If `ui/litellm-dashboard` is missing, stop and ask. Do not search the rest of the repo for a second dashboard.

## Allowlist

[allowlist.txt](allowlist.txt) is the fork surface: brand, login, chrome hide flags, server-copy maps (`*Zh.ts`, router and email copy), `old-usage`, `zh-CN.json`, and `i18n.ts`.

`i18n.ts` on the fork loads `zh-CN` and sets `lng` to `zh-CN`. Upstream `i18n.ts` is English only. Never replace the fork file with the upstream file.

Add a path only when the file is product behavior the upstream tree does not have. A translated component does not belong here. After harvest, the list should get smaller, not larger.

## Nav labels

Upstream `src/components/leftnav.tsx` stores English on `label` and renders it through `labelText` and `labelOf`. Those functions are the only edit.

Keep the menu array identical to upstream. Create `src/i18n/navLabels.ts` (already allowlisted) with a map from `item.key` to Chinese. `labelText` and `labelOf` consult that map by `item.key` before the English label and before `useTerminology()`.

```ts
import { navLabel } from "@/i18n/navLabels";

export const labelText = (item: MenuItem): string =>
  navLabel(item.key) ?? (typeof item.label === "string" ? item.label : prettify(item.key));
```

`labelOf` uses the same `navLabel(item.key)` first. Section titles use a second map in that file, keyed by the upstream `groupLabel` (`AI GATEWAY`, `OBSERVABILITY`, and the rest).

A new menu key with no Chinese entry is left in English and named in the report. Do not paste Chinese into the menu array.

## Glossary

[glossary.json](glossary.json) wins when the English string is an exact key in that file. Product name `算力访问治理平台` stays in `productBranding.ts`. Do not rename it to LiteLLM, and do not translate the word LiteLLM inside ordinary sentences into the product name.

## Catalog edits

Edit `zh-CN.json` as nested JSON, matching `en.json` key paths. Preserve `{{name}}`, `{{count}}`, and tags such as `<discussion>` exactly.

Delete a key when it disappears from upstream `en.json`. Retranslate when the English text changes. An unchanged English value keeps its existing Chinese.

## Gates

Stop when any of these are true after an apply:

- a zh value is missing a placeholder or tag that the English value has
- a `.ts` or `.tsx` file outside the allowlist contains CJK
- an allowlisted file imports a symbol upstream removed

Coverage percent is a report line, not a gate.
