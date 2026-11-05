"use client";

import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatDisplayFullTimestamp,
} from "@/utils/displayDate";
import { CellTooltip } from "./cell_tooltip";

export type DatePrecision = "datetime" | "date";

interface DateCellProps {
  value: string | null | undefined;
  precision?: DatePrecision;
  fallback?: string;
}

export const formatCellDate = (date: Date, precision: DatePrecision): string =>
  precision === "date" ? formatDisplayDate(date) : formatDisplayDateTime(date);

export const formatFullTimestamp = (date: Date): string => formatDisplayFullTimestamp(date);

export function DateCell({ value, precision = "datetime", fallback = "-" }: DateCellProps) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return <span className="text-muted-foreground">{fallback}</span>;
  }

  return (
    <CellTooltip
      content={formatFullTimestamp(date)}
      trigger={<span className="whitespace-nowrap">{formatCellDate(date, precision)}</span>}
    />
  );
}
