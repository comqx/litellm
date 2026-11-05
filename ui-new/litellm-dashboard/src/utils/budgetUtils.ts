import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export function formatBudgetReset(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const resetDate = dayjs(iso);
  if (!resetDate.isValid()) return null;
  return resetDate.format("MMM D, YYYY");
}

export function formatBudgetResetUtc(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const resetDate = dayjs.utc(iso);
  if (!resetDate.isValid()) return null;
  return resetDate.format("MMM D, YYYY");
}

const BUDGET_DURATION_WORD_ALIASES: Record<string, string> = {
  hourly: "1h",
  daily: "24h",
  weekly: "7d",
  monthly: "30d",
};

const BUDGET_DURATION_UNITS: Record<string, dayjs.ManipulateType> = {
  s: "second",
  m: "minute",
  h: "hour",
  d: "day",
  w: "week",
  mo: "month",
};

export interface BudgetPeriod {
  start: string;
  end: string;
}

export function budgetPeriodRange(
  budgetDuration: string | null | undefined,
  budgetResetAt: string | null | undefined,
): BudgetPeriod | null {
  if (!budgetDuration || !budgetResetAt) return null;
  const end = dayjs.utc(budgetResetAt);
  if (!end.isValid()) return null;
  const normalized = budgetDuration.trim().toLowerCase();
  const match = /^(\d+)(mo|s|m|h|d|w)$/.exec(BUDGET_DURATION_WORD_ALIASES[normalized] ?? normalized);
  if (!match) return null;
  const amount = Number(match[1]);
  if (amount <= 0) return null;
  const start =
    match[2] === "d" && amount === 30
      ? end.subtract(1, "month")
      : end.subtract(amount, BUDGET_DURATION_UNITS[match[2]]);
  return { start: start.toISOString(), end: end.toISOString() };
}
