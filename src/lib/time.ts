const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const CENTRAL_TIME_ZONE = "America/Chicago";

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  });
  const offsetPart = formatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  if (!offsetPart || offsetPart === "GMT") {
    return 0;
  }

  const match = offsetPart.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || "0");
  return sign * (hours * 60 + minutes);
}

function zonedTimeToUtc(
  parts: {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    second?: number;
  },
  timeZone: string
) {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour || 0,
    parts.minute || 0,
    parts.second || 0
  );

  const firstPassOffset = getTimeZoneOffsetMinutes(new Date(utcGuess), timeZone);
  const firstPassDate = new Date(utcGuess - firstPassOffset * 60 * 1000);
  const secondPassOffset = getTimeZoneOffsetMinutes(firstPassDate, timeZone);

  if (secondPassOffset === firstPassOffset) {
    return firstPassDate;
  }

  return new Date(utcGuess - secondPassOffset * 60 * 1000);
}

export function getCentralDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const partMap = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(partMap.year),
    month: Number(partMap.month),
    day: Number(partMap.day),
    hour: Number(partMap.hour),
    minute: Number(partMap.minute),
    second: Number(partMap.second),
    weekday: partMap.weekday,
  };
}

export function getCentralWeekStart(now: Date = new Date()) {
  const parts = getCentralDateParts(now);
  const weekdayIndex = WEEKDAY_INDEX[parts.weekday] ?? 0;
  const daysSinceMonday = weekdayIndex === 0 ? 6 : weekdayIndex - 1;

  const localDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  localDate.setUTCDate(localDate.getUTCDate() - daysSinceMonday);

  return zonedTimeToUtc(
    {
      year: localDate.getUTCFullYear(),
      month: localDate.getUTCMonth() + 1,
      day: localDate.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    },
    CENTRAL_TIME_ZONE
  );
}

export function formatCentralDate(
  value: string | Date,
  options?: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIME_ZONE,
    month: "short",
    day: "numeric",
    ...options,
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatCentralDateTime(
  value: string | Date,
  options?: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatTimeAgo(value: string | null) {
  if (!value) {
    return "never";
  }

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatTimeUntil(value: string | null) {
  if (!value) {
    return "-";
  }

  const diff = new Date(value).getTime() - Date.now();
  if (diff < 0) {
    return "overdue";
  }

  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) {
    return `in ${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `in ${hours}h`;
  }

  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

export function formatAge(value: string | null) {
  if (!value) {
    return "-";
  }

  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.max(0, Math.floor(diff / 3600000));

  if (hours < 1) {
    return "<1h";
  }

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}
