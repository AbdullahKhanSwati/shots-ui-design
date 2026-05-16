export const mockBusinesses = [
  { id: 1, name: 'Shots', logo: '🎱', type: 'Snooker & Pool Club', color: '#E53E3E', tag: 'Premium Club' },
  { id: 2, name: 'Sadozai', logo: '🏭', type: 'Block Factory', color: '#F4B860', tag: 'Manufacturing' },
  { id: 3, name: 'Munchies', logo: '🍔', type: 'Food Restaurant', color: '#FF6B6B', tag: 'Food & Drinks' },
];

const DEFAULT_OPEN = '11:00';
const DEFAULT_CLOSE = '23:00';

export const mockTables = [
  { id: 1, number: 1, type: 'Snooker', status: 'Available', location: 'Main Hall', condition: 'Excellent', lastCleaned: '2026-05-14', memberRate: 500, nonMemberRate: 700, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE, image: null },
  { id: 2, number: 2, type: 'Pool', status: 'Occupied', location: 'Main Hall', condition: 'Good', lastCleaned: '2026-05-13', memberRate: 400, nonMemberRate: 600, occupiedUntil: addHours(1.25), occupiedBy: 'Ahmed Khan', openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE, image: null },
  { id: 3, number: 3, type: 'Pool', status: 'Available', location: 'Side Hall', condition: 'Excellent', lastCleaned: '2026-05-14', memberRate: 400, nonMemberRate: 600, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE, image: null },
  { id: 4, number: 4, type: 'Snooker', status: 'Maintenance', location: 'Main Hall', condition: 'Fair', lastCleaned: '2026-05-12', memberRate: 500, nonMemberRate: 700, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE, image: null },
  { id: 5, number: 5, type: 'Pool', status: 'Available', location: 'VIP Section', condition: 'Good', lastCleaned: '2026-05-14', memberRate: 700, nonMemberRate: 1000, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE, image: null },
  { id: 6, number: 6, type: 'Snooker', status: 'Occupied', location: 'Main Hall', condition: 'Excellent', lastCleaned: '2026-05-14', memberRate: 500, nonMemberRate: 700, occupiedUntil: addHours(2), occupiedBy: 'Hassan Ahmed', openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE, image: null },
];

function addHours(h) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + Math.round(h * 60));
  return d.toISOString();
}

export const mockMemberships = [
  { id: 'A234567', name: 'Ahmed Khan', type: 'Premium', idCardNumber: '35202-1234567-1', joinDate: '2025-01-15', expiryDate: '2026-01-14', status: 'Active', phone: '03499377144', email: 'ahmed@example.com', photo: null },
  { id: 'A345678', name: 'Fatima Ali', type: 'Standard', idCardNumber: '35202-2345678-3', joinDate: '2024-06-20', expiryDate: '2025-06-19', status: 'Expired', phone: '+923012345678', email: 'fatima@example.com', photo: null },
  { id: 'A456789', name: 'Hassan Ahmed', type: 'Premium', idCardNumber: '35202-3456789-5', joinDate: '2025-03-10', expiryDate: '2026-03-09', status: 'Active', phone: '+923023456789', email: 'hassan@example.com', photo: null },
  { id: 'B567890', name: 'Zainab Malik', type: 'Basic', idCardNumber: '35202-4567890-7', joinDate: '2025-11-01', expiryDate: '2026-11-01', status: 'Active', phone: '+923034567890', email: 'zainab@example.com', photo: null },
  { id: 'A678901', name: 'Ali Raza', type: 'Premium', idCardNumber: '35202-5678901-9', joinDate: '2025-02-14', expiryDate: '2026-02-13', status: 'Active', phone: '+923045678901', email: 'ali@example.com', photo: null },
];

const today = '2026-05-14';
const yesterday = '2026-05-13';
// a couple of older-month entries so the Finance month picker is useful
const lastMonth = '2026-04-22';
const twoMonthsAgo = '2026-03-15';

export const mockFinance = [
  { id: 1, date: today, type: 'In', category: 'Table Rental', amount: 5000, description: 'Table 1 — 2 hour session', table: 1, time: '09:30' },
  { id: 2, date: today, type: 'In', category: 'Membership', amount: 3000, description: 'New Premium membership — Ali', time: '10:15' },
  { id: 3, date: today, type: 'Out', category: 'Repair', amount: 1500, description: 'Felt patching kit — Table 4', table: 4, time: '11:00' },
  { id: 4, date: today, type: 'In', category: 'Snacks', amount: 2000, description: 'Drinks & chips', time: '12:30' },
  { id: 5, date: yesterday, type: 'Out', category: 'Utilities', amount: 800, description: 'Electricity bill', time: '14:00' },
  { id: 6, date: yesterday, type: 'In', category: 'Table Rental', amount: 4500, description: 'Evening session — Table 3', table: 3, time: '18:00' },
  { id: 7, date: yesterday, type: 'Out', category: 'Repair', amount: 2200, description: 'Cushion alignment — Table 2', table: 2, time: '15:30' },
  { id: 8, date: '2026-05-01', type: 'In', category: 'Table Rental', amount: 6000, description: 'Opening weekend', time: '21:30' },
  { id: 9, date: lastMonth, type: 'In', category: 'Table Rental', amount: 8500, description: 'April tournament', time: '20:00' },
  { id: 10, date: lastMonth, type: 'Out', category: 'Utilities', amount: 5400, description: 'April electricity', time: '12:00' },
  { id: 11, date: twoMonthsAgo, type: 'In', category: 'Membership', amount: 12000, description: 'Membership drive — March', time: '15:00' },
];

// Mutable in-memory bookings ===============================================

export const mockBookings = [
  { id: 1, tableId: 2, tableNumber: 2, date: today, members: [{ id: 'A234567', name: 'Ahmed Khan', type: 'Premium' }], memberType: 'Premium', isMember: true, start: '09:00', end: '10:15', intervals: ['09:00', '09:15', '09:30', '09:45', '10:00'], status: 'Active', amount: 600 },
  { id: 2, tableId: 6, tableNumber: 6, date: today, members: [{ id: 'A456789', name: 'Hassan Ahmed', type: 'Premium' }, { id: 'A234567', name: 'Ahmed Khan', type: 'Premium' }], memberType: 'Premium', isMember: true, start: '08:30', end: '10:30', intervals: ['08:30', '08:45', '09:00', '09:15', '09:30', '09:45', '10:00', '10:15'], status: 'Active', amount: 1200 },
  { id: 3, tableId: 1, tableNumber: 1, date: today, members: [{ id: 'A678901', name: 'Ali Raza', type: 'Premium' }], memberType: 'Premium', isMember: true, start: '07:00', end: '08:30', intervals: ['07:00', '07:15', '07:30', '07:45', '08:00', '08:15'], status: 'Completed', amount: 900 },
  { id: 4, tableId: 5, tableNumber: 5, date: today, members: [{ id: 'B567890', name: 'Zainab Malik', type: 'Basic' }], memberType: 'Basic', isMember: true, start: '06:30', end: '07:30', intervals: ['06:30', '06:45', '07:00', '07:15'], status: 'Completed', amount: 800 },
];

// derived "primary" fields kept for any legacy reads
mockBookings.forEach((b) => {
  if (!b.memberId && b.members?.[0]) b.memberId = b.members[0].id;
  if (!b.memberName && b.members) b.memberName = b.members.map((m) => m.name).join(', ');
});

let bookingIdSeq = 1000;
export function addBooking(booking) {
  const b = { id: ++bookingIdSeq, status: 'Active', ...booking };
  if (!b.memberId && b.members?.[0]) b.memberId = b.members[0].id;
  if (!b.memberName && b.members) b.memberName = b.members.map((m) => m.name).join(', ');
  mockBookings.push(b);
  return b;
}

export function updateBooking(id, patch) {
  const idx = mockBookings.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  mockBookings[idx] = { ...mockBookings[idx], ...patch };
  if (patch.members) {
    mockBookings[idx].memberId = patch.members[0]?.id;
    mockBookings[idx].memberName = patch.members.map((m) => m.name).join(', ');
  }
  return mockBookings[idx];
}

export function removeBooking(id) {
  const idx = mockBookings.findIndex((b) => b.id === id);
  if (idx === -1) return false;
  mockBookings.splice(idx, 1);
  return true;
}

export function sortBookingsByTableThenTime(list = mockBookings) {
  return [...list].sort((a, b) => a.tableId - b.tableId || a.start.localeCompare(b.start));
}

export function findBookingByInterval(tableId, date, interval) {
  const key = dateKey(date);
  return mockBookings.find(
    (b) =>
      b.tableId === tableId &&
      b.date === key &&
      b.status !== 'Cancelled' &&
      b.intervals?.includes(interval)
  );
}

export const mockRepairs = [
  { id: 1, tableId: 4, tableNumber: 4, date: today, cost: 1500, description: 'Replaced corner pocket leather.', status: 'In Progress', reportedBy: 'Staff' },
  { id: 2, tableId: 2, tableNumber: 2, date: '2026-05-13', cost: 800, description: 'Cushion alignment.', status: 'Completed', reportedBy: 'Staff' },
];

export const mockStats = {
  activeMembers: mockMemberships.filter((m) => m.status === 'Active').length,
  expiredMembers: mockMemberships.filter((m) => m.status === 'Expired').length,
  todayBookings: mockBookings.filter((b) => b.date === today).length,
  todayRevenue: 10000,
};

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

export function bookedIntervalsFor(tableId, date) {
  const key = dateKey(date);
  const set = new Set();
  mockBookings.forEach((b) => {
    if (b.tableId === tableId && b.date === key && b.status !== 'Cancelled') {
      b.intervals?.forEach((iv) => set.add(iv));
    }
  });
  return set;
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

// Month helpers ===============================================================

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

export function getMTDFinance(refDate = new Date()) {
  return mockFinance.filter((f) => isMonthToDate(f.date, refDate));
}

export function getMonthFinance(year, month) {
  return mockFinance.filter((f) => isInMonth(f.date, year, month));
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

export const membershipDurations = [
  { label: '1 Month', months: 1 },
  { label: '3 Months', months: 3 },
  { label: '6 Months', months: 6 },
  { label: '1 Year', months: 12 },
  { label: '2 Years', months: 24 },
];

export const membershipTiers = ['Basic', 'Standard', 'Premium'];

export const expenseCategories = ['Repair', 'Maintenance', 'Supplies', 'Cleaning', 'Utilities', 'Other'];
