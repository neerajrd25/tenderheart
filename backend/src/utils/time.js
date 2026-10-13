export function formatDurationMinutes(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined || Number.isNaN(totalMinutes)) {
    return null;
  }

  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

export function calculateRestDuration(restStart, restEnd) {
  if (!restStart || !restEnd) return null;

  const start = new Date(restStart);
  const end = new Date(restEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return null;

  return formatDurationMinutes(diffMs / 1000 / 60);
}

export function appTimezone() {
  return process.env.APP_TIMEZONE || 'Asia/Kolkata';
}

// Calendar date (YYYY-MM-DD) in the daycare's timezone, not the server's (Lambda runs in UTC).
export function todayInTimezone(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: appTimezone() }).format(now);
}

export function nowIso() {
  return new Date().toISOString();
}
