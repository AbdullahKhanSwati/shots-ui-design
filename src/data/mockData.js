// Pure helpers + static option lists used across the app.
// All operational data now comes live from Supabase (see src/store/ShotsStore.js);
// the data-dependent helpers below take the relevant list as their first argument.

export const membershipDurations = [
  { label: '1 Month', months: 1 },
  { label: '3 Months', months: 3 },
  { label: '6 Months', months: 6 },
  { label: '1 Year', months: 12 },
  { label: '2 Years', months: 24 },
];

export const membershipTiers = ['Basic', 'Standard', 'Premium'];

export const expenseCategories = ['Repair', 'Maintenance', 'Supplies', 'Cleaning', 'Utilities', 'Other'];

// Helpers ===================================================================

export function generateMemberId(idCardNumber, existingIds = []) {
  const digits = (idCardNumber || '').replace(/\D/g, '');
  const last6 = digits.slice(-6).padStart(6, '0');
  for (let code = 65; code <= 90; code++) {
    const c = `${String.fromCharCode(code)}${last6}`;
    if (!existingIds.includes(c)) return c;
  }
  return `A${last6}`;
}

export function tableFreeIn(table) {
  if (table.status !== 'Occupied' || !table.occupiedUntil) return null;
  const ms = new Date(table.occupiedUntil).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function buildIntervals(openTime = '11:00', closeTime = '23:00', stepMin = 15) {
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  const start = new Date(); start.setHours(oh, om, 0, 0);
  const end = new Date(); end.setHours(ch, cm, 0, 0);
  const out = [];
  const c = new Date(start);
  while (c < end) {
    out.push({
      value: `${String(c.getHours()).padStart(2, '0')}:${String(c.getMinutes()).padStart(2, '0')}`,
      label: format12h(c.getHours(), c.getMinutes()),
    });
    c.setMinutes(c.getMinutes() + stepMin);
  }
  return out;
}

export function format12h(h, m) {
  const hh = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function nextSevenDays() {
  const out = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 8; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d);
  }
  return out;
}

export function dateKey(d) {
  if (typeof d === 'string') return d;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function intervalsForRange(startValue, durationHours, stepMin = 15) {
  const [h, m] = startValue.split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  const total = Math.round((durationHours * 60) / stepMin);
  const list = [];
  for (let i = 0; i < total; i++) {
    list.push(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    d.setMinutes(d.getMinutes() + stepMin);
  }
  return list;
}

export function addMinutes(value, minutes) {
  const [h, m] = value.split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  d.setMinutes(d.getMinutes() + minutes);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Booking helpers (operate on a live bookings list) =========================

export function sortBookingsByTableThenTime(list = []) {
  return [...list].sort((a, b) => a.tableId - b.tableId || a.start.localeCompare(b.start));
}

export function bookedIntervalsFor(bookings = [], tableId, date) {
  const key = dateKey(date);
  const set = new Set();
  bookings.forEach((b) => {
    if (b.tableId === tableId && b.date === key && b.status !== 'Cancelled') {
      b.intervals?.forEach((iv) => set.add(iv));
    }
  });
  return set;
}

export function findBookingByInterval(bookings = [], tableId, date, interval) {
  const key = dateKey(date);
  return bookings.find(
    (b) =>
      b.tableId === tableId &&
      b.date === key &&
      b.status !== 'Cancelled' &&
      b.intervals?.includes(interval)
  );
}

// Month helpers (operate on a live finance list) ============================

export function isInMonth(dateStr, year, month) {
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() === month;
}

export function isMonthToDate(dateStr, refDate = new Date()) {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === refDate.getFullYear() &&
    d.getMonth() === refDate.getMonth() &&
    d.getDate() <= refDate.getDate()
  );
}

export function getMTDFinance(finance = [], refDate = new Date()) {
  return finance.filter((f) => isMonthToDate(f.date, refDate));
}

export function getMonthFinance(finance = [], year, month) {
  return finance.filter((f) => isInMonth(f.date, year, month));
}

export function previousMonths(count = 12) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      isCurrent: i === 0,
    });
  }
  return out;
}
