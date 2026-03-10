const shortMonthDayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const shortMonthDayYearFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatRelativeTime(isoString: string): string {
  const timestamp = parseDate(isoString);
  if (!timestamp) {
    return "";
  }

  const diffMs = Date.now() - timestamp.getTime();
  if (diffMs < 0) {
    return shortMonthDayFormatter.format(timestamp);
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) {
    return `${Math.max(1, minutes)}m ago`;
  }

  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(diffMs / 86_400_000);
  if (days < 7) {
    return `${days}d ago`;
  }

  return timestamp.getFullYear() === new Date().getFullYear()
    ? shortMonthDayFormatter.format(timestamp)
    : shortMonthDayYearFormatter.format(timestamp);
}

export function formatMonthDay(isoString: string): string {
  const timestamp = parseDate(isoString);
  return timestamp ? shortMonthDayFormatter.format(timestamp) : "";
}

export function formatLongDate(isoString: string): string {
  const timestamp = parseDate(isoString);
  return timestamp ? longDateFormatter.format(timestamp) : "";
}
