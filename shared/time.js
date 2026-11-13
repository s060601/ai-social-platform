export const BEIJING_TIME_ZONE = "Asia/Shanghai";

function partsFor(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BEIJING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(parts
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, part.value]));
}

export function beijingDateKey(value, fallback = "未标注日期") {
  const parts = partsFor(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : fallback;
}

export function beijingTime(value, fallback = "时间未标注") {
  const parts = partsFor(value);
  return parts ? `${parts.hour}:${parts.minute}` : fallback;
}

export function beijingDateTime(value, fallback = "") {
  const parts = partsFor(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}` : fallback;
}
