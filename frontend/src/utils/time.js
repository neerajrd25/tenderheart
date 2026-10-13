// Local calendar date; toISOString() would give the UTC date, which is wrong early morning in IST.
export function todayIsoDate() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

export function formatLongDate(dateStr) {
  const date = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function calculateRestDurationLabel(startValue, endValue) {
  if (!startValue || !endValue) return null;
  const [sh, sm] = startValue.split(':').map(Number);
  const [eh, em] = endValue.split(':').map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) return null;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min`;
  return `${hrs} hr ${mins} min`;
}

export function isoToTimeInputValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function timeInputValueToIso(dateStr, timeStr) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(`${dateStr}T00:00:00`);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export function formatTimeDisplay(iso) {
  if (!iso) return 'Not recorded';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();

  if (now.getDate() < dob.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years >= 2) return `${years} yr${years > 1 ? 's' : ''}`;
  if (years === 1) return months > 0 ? `1 yr ${months} mo` : '1 yr';
  return `${months} mo`;
}
