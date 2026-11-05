import { describe, expect, it } from "vitest";
import { computeTeamModelBadges, normalizeTeamModelSelection, TeamAccessGroupModelGrant } from "./teamModelAccess";

const GRANTS: TeamAccessGroupModelGrant[] = [
  { access_group_id: "ag-1", access_group_name: "shared", models: ["haiku", "gpt-4o-mini"] },
  { access_group_id: "ag-2", access_group_name: "extra", models: ["haiku", "sonnet"] },
];

describe("normalizeTeamModelSelection", () => {
  it("substitutes the no-default-models sentinel for an empty selection", () => {
    expect(normalizeTeamModelSelection([])).toEqual(["no-default-models"]);
    expect(normalizeTeamModelSelection(undefined)).toEqual(["no-default-models"]);
  });

  it("passes a non-empty selection through untouched", () => {
    expect(normalizeTeamModelSelection(["gpt-4o-mini"])).toEqual(["gpt-4o-mini"]);
    expect(normalizeTeamModelSelection(["all-proxy-models"])).toEqual(["all-proxy-models"]);
  });
});

describe("computeTeamModelBadges", () => {
  it("attributes group-only models to the groups granting them", () => {
    const badges = computeTeamModelBadges(["sonnet-direct"], [], GRANTS);
    expect(badges).toEqual([
      {
        label: "sonnet-direct",
        kind: "direct",
        tooltip: "由团队的模型列表直接授予",
      },
      { label: "haiku", kind: "access-group", tooltip: "通过访问组 shared, extra授予" },
      { label: "gpt-4o-mini", kind: "access-group", tooltip: "通过访问组 shared授予" },
      { label: "sonnet", kind: "access-group", tooltip: "通过访问组 extra授予" },
    ]);
  });

  it("marks a model both direct and group-granted on the direct badge, without a duplicate badge", () => {
    const badges = computeTeamModelBadges(["haiku"], [], GRANTS);
    expect(badges).toEqual([
      {
        label: "haiku",
        kind: "direct",
        tooltip: "由团队的模型列表直接授予，同时也通过访问组 shared, extra授予",
      },
      { label: "gpt-4o-mini", kind: "access-group", tooltip: "通过访问组 shared授予" },
      { label: "sonnet", kind: "access-group", tooltip: "通过访问组 extra授予" },
    ]);
  });

  it("shows the no-default-models sentinel as its own badge and keeps group badges visible", () => {
    const badges = computeTeamModelBadges(["no-default-models"], [], [GRANTS[0]]);
    expect(badges.map((b) => [b.label, b.kind])).toEqual([
      ["无默认模型", "no-default"],
      ["haiku", "access-group"],
      ["gpt-4o-mini", "access-group"],
    ]);
  });

  it("still shows group badges when the empty model list grants everything", () => {
    const badges = computeTeamModelBadges([], [], [GRANTS[0]]);
    expect(badges[0]).toEqual({
      label: "所有 Proxy 模型",
      kind: "all-proxy",
      tooltip: "该团队的模型列表为空，因此可以访问 Proxy 上的所有模型",
    });
    expect(badges.slice(1).map((b) => b.label)).toEqual(["haiku", "gpt-4o-mini"]);
  });

  it("distinguishes the all-proxy-models sentinel from an empty list in the tooltip", () => {
    const badges = computeTeamModelBadges(["all-proxy-models"], [], []);
    expect(badges).toEqual([
      {
        label: "所有 Proxy 模型",
        kind: "all-proxy",
        tooltip: "由团队的模型列表中的“所有 Proxy 模型”条目授予",
      },
    ]);
  });

  it("falls back to the flat access_group_models list when per-group details are absent", () => {
    const badges = computeTeamModelBadges(["direct-model"], ["haiku"], undefined);
    expect(badges).toEqual([
      { label: "direct-model", kind: "direct", tooltip: "由团队的模型列表直接授予" },
      { label: "haiku", kind: "access-group", tooltip: "通过某个 访问组授予" },
    ]);
  });
});
