export const DISPLAY_LOCALE = "zh-CN";

const pad = (value: number): string => String(value).padStart(2, "0");

export const formatDisplayDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatDisplayDateTime = (date: Date): string => {
  const time = date.toLocaleTimeString(DISPLAY_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${formatDisplayDate(date)} ${time}`;
};

export const formatDisplayFullTimestamp = (date: Date): string => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${formatDisplayDateTime(date)} (${timeZone})`;
};

export const formatDisplayDateFromIso = (isoDate: string): string => {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return formatDisplayDate(parsed);
};

export const formatUserFacingTimestamp = (timestamp: string | Date): string => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  const time = date.toLocaleTimeString(DISPLAY_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${formatDisplayDate(date)} ${time}`;
};
