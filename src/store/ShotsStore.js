import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { generateMemberId } from '../data/mockData';

/**
 * Live data store backed by Supabase.
 *
 * The exported state arrays + add/update/delete fns mirror the original
 * in-memory mock helpers, and the *field names* are kept 1:1 with what the
 * screens already use, so the UI did not change. Snake_case DB columns are
 * mapped to the camelCase fields the UI reads via the row<->payload mappers.
 */

const ShotsContext = createContext(null);

// ---------------------------------------------------------------------------
// Key maps  (UI field  ->  DB column).  Used for both reads (reverse) & writes.
// ---------------------------------------------------------------------------
const TABLE_KEYS = {
  number: 'number', type: 'type', location: 'location', status: 'status',
  condition: 'condition', lastCleaned: 'last_cleaned', memberRate: 'member_rate',
  nonMemberRate: 'non_member_rate', openTime: 'open_time', closeTime: 'close_time',
  occupiedUntil: 'occupied_until', occupiedBy: 'occupied_by', image: 'image',
};
const MEMBER_KEYS = {
  name: 'name', type: 'type', idCardNumber: 'cnic', joinDate: 'join_date',
  expiryDate: 'expiry_date', status: 'status', phone: 'phone', email: 'email',
  visits: 'visits', totalSpent: 'total_spent', photo: 'photo',
  cnicImage: 'cnic_image', cnicImageBack: 'cnic_image_back',
};
const BOOKING_KEYS = {
  tableId: 'table_id', tableNumber: 'table_number', date: 'date', start: 'start_time',
  end: 'end_time', intervals: 'intervals', status: 'status', amount: 'amount',
  subtotal: 'subtotal', players: 'players', isMember: 'is_member', memberId: 'member_id',
  memberName: 'member_name', memberType: 'member_type', members: 'members', discount: 'discount',
};
const FINANCE_KEYS = {
  date: 'date', time: 'time', type: 'type', category: 'category',
  amount: 'amount', description: 'description', table: 'table_ref',
};

// Build a DB row (snake_case) from a (possibly partial) UI object.
function toRow(obj, keymap) {
  const out = {};
  for (const k of Object.keys(obj || {})) {
    if (k in keymap) out[keymap[k]] = obj[k];
  }
  return out;
}
// Build a UI object (camelCase) from a DB row, always carrying `id`.
function fromRow(row, keymap) {
  const out = { id: row.id };
  for (const [uiKey, col] of Object.entries(keymap)) out[uiKey] = row[col];
  return out;
}

const rowToTable = (r) => fromRow(r, TABLE_KEYS);
const rowToMember = (r) => fromRow(r, MEMBER_KEYS);
const rowToBooking = (r) => fromRow(r, BOOKING_KEYS);
const rowToFinance = (r) => fromRow(r, FINANCE_KEYS);

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);

export function ShotsProvider({ children }) {
  const { session } = useAuth();
  const businessId = session?.businessId || null;

  const [tables, setTables] = useState([]);
  const [members, setMembers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [finance, setFinance] = useState([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!businessId) return;
    const [t, m, b, f] = await Promise.all([
      supabase.from('pool_tables').select('*').order('number', { ascending: true }),
      supabase.from('members').select('*').order('created_at', { ascending: true }),
      supabase.from('bookings').select('*').order('date', { ascending: true }),
      supabase.from('transactions').select('*').order('date', { ascending: true }),
    ]);
    setTables((t.data || []).map(rowToTable));
    setMembers((m.data || []).map(rowToMember));
    setBookings((b.data || []).map(rowToBooking));
    setFinance((f.data || []).map(rowToFinance));
    setReady(true);
  }, [businessId]);

  // Initial load whenever the signed-in business changes.
  useEffect(() => {
    if (!businessId) {
      setTables([]); setMembers([]); setBookings([]); setFinance([]); setReady(false);
      return;
    }
    let active = true;
    (async () => {
      const [t, m, b, f] = await Promise.all([
        supabase.from('pool_tables').select('*').order('number', { ascending: true }),
        supabase.from('members').select('*').order('created_at', { ascending: true }),
        supabase.from('bookings').select('*').order('date', { ascending: true }),
        supabase.from('transactions').select('*').order('date', { ascending: true }),
      ]);
      if (!active) return;
      setTables((t.data || []).map(rowToTable));
      setMembers((m.data || []).map(rowToMember));
      setBookings((b.data || []).map(rowToBooking));
      setFinance((f.data || []).map(rowToFinance));
      setReady(true);
    })();
    return () => { active = false; };
  }, [businessId]);

  // Live sync: subscribe to Postgres changes so anything the admin dashboard
  // does (e.g. marking a table for maintenance) reflects in the app instantly.
  // On any insert/update/delete for this business we re-fetch just that table.
  useEffect(() => {
    if (!businessId) return;

    const refetch = {
      pool_tables: async () => {
        const { data } = await supabase.from('pool_tables').select('*').order('number', { ascending: true });
        setTables((data || []).map(rowToTable));
      },
      members: async () => {
        const { data } = await supabase.from('members').select('*').order('created_at', { ascending: true });
        setMembers((data || []).map(rowToMember));
      },
      bookings: async () => {
        const { data } = await supabase.from('bookings').select('*').order('date', { ascending: true });
        setBookings((data || []).map(rowToBooking));
      },
      transactions: async () => {
        const { data } = await supabase.from('transactions').select('*').order('date', { ascending: true });
        setFinance((data || []).map(rowToFinance));
      },
    };

    const channel = supabase.channel(`shots-rt-${businessId}`);
    Object.keys(refetch).forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `business_id=eq.${businessId}` },
        () => { refetch[table](); }
      );
    });
    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [businessId]);

  // ---- Tables --------------------------------------------------------------
  const updateTable = useCallback(async (id, patch) => {
    // Optimistic: reflect the change instantly, then persist and reconcile.
    let prev = null;
    setTables((arr) => arr.map((t) => {
      if (t.id === id) { prev = t; return { ...t, ...patch }; }
      return t;
    }));
    const { data: updated, error } = await supabase
      .from('pool_tables').update(toRow(patch, TABLE_KEYS)).eq('id', id).select().single();
    if (error) {
      console.error('updateTable', error);
      if (prev) setTables((arr) => arr.map((t) => (t.id === id ? prev : t))); // roll back
      throw error;
    }
    setTables((arr) => arr.map((t) => (t.id === id ? rowToTable(updated) : t)));
  }, []);

  // ---- Members -------------------------------------------------------------
  const addMember = useCallback(async (data) => {
    const id = data.id || generateMemberId(data.idCardNumber, members.map((m) => m.id));
    const row = { ...toRow(data, MEMBER_KEYS), id, business_id: businessId };
    const { data: inserted, error } = await supabase.from('members').insert(row).select().single();
    if (error) { console.error('addMember', error); throw error; }
    const m = rowToMember(inserted);
    setMembers((arr) => [...arr, m]);
    return m;
  }, [businessId, members]);

  const updateMember = useCallback(async (id, patch) => {
    let prev = null;
    setMembers((arr) => arr.map((m) => {
      if (m.id === id) { prev = m; return { ...m, ...patch }; }
      return m;
    }));
    const { data: updated, error } = await supabase
      .from('members').update(toRow(patch, MEMBER_KEYS)).eq('id', id).select().single();
    if (error) {
      console.error('updateMember', error);
      if (prev) setMembers((arr) => arr.map((m) => (m.id === id ? prev : m)));
      throw error;
    }
    setMembers((arr) => arr.map((m) => (m.id === id ? rowToMember(updated) : m)));
    return rowToMember(updated);
  }, []);

  const deleteMember = useCallback(async (id) => {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) { console.error('deleteMember', error); return; }
    setMembers((arr) => arr.filter((m) => m.id !== id));
  }, []);

  // ---- Bookings ------------------------------------------------------------
  const addBooking = useCallback(async (data) => {
    const payload = { ...data };
    if (!payload.memberName && payload.members) {
      payload.memberName = payload.members.map((m) => m.name).join(', ');
    }
    if (!payload.memberId && payload.members?.[0]) payload.memberId = payload.members[0].id;
    if (payload.members) payload.players = payload.members.length || 1;
    const row = { ...toRow(payload, BOOKING_KEYS), business_id: businessId };
    if (row.status == null) row.status = 'Active';
    const { data: inserted, error } = await supabase.from('bookings').insert(row).select().single();
    if (error) { console.error('addBooking', error); throw error; }
    const b = rowToBooking(inserted);
    setBookings((arr) => [...arr, b]);
    return b;
  }, [businessId]);

  const updateBooking = useCallback(async (id, patch) => {
    const payload = { ...patch };
    if (payload.members) {
      payload.memberName = payload.members.map((m) => m.name).join(', ');
      payload.memberId = payload.members[0]?.id || null;
      payload.players = payload.members.length || 1;
    }
    let prev = null;
    setBookings((arr) => arr.map((b) => {
      if (b.id === id) { prev = b; return { ...b, ...payload }; }
      return b;
    }));
    const { data: updated, error } = await supabase
      .from('bookings').update(toRow(payload, BOOKING_KEYS)).eq('id', id).select().single();
    if (error) {
      console.error('updateBooking', error);
      if (prev) setBookings((arr) => arr.map((b) => (b.id === id ? prev : b)));
      throw error;
    }
    setBookings((arr) => arr.map((b) => (b.id === id ? rowToBooking(updated) : b)));
    return rowToBooking(updated);
  }, []);

  const deleteBooking = useCallback(async (id) => {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) { console.error('deleteBooking', error); return; }
    setBookings((arr) => arr.filter((b) => b.id !== id));
  }, []);

  // ---- Finance / transactions ---------------------------------------------
  const addFinanceEntry = useCallback(async (data) => {
    const withDefaults = {
      type: 'In',
      date: data.date || todayStr(),
      time: data.time || nowTime(),
      ...data,
    };
    const row = { ...toRow(withDefaults, FINANCE_KEYS), business_id: businessId };
    const { data: inserted, error } = await supabase.from('transactions').insert(row).select().single();
    if (error) { console.error('addFinanceEntry', error); throw error; }
    const f = rowToFinance(inserted);
    setFinance((arr) => [...arr, f]);
    return f;
  }, [businessId]);

  const value = useMemo(() => ({
    tables, members, bookings, finance, ready, reload,
    updateTable,
    addMember, updateMember, deleteMember,
    addBooking, updateBooking, deleteBooking,
    addFinanceEntry,
  }), [
    tables, members, bookings, finance, ready, reload,
    updateTable,
    addMember, updateMember, deleteMember,
    addBooking, updateBooking, deleteBooking,
    addFinanceEntry,
  ]);

  return <ShotsContext.Provider value={value}>{children}</ShotsContext.Provider>;
}

export function useShots() {
  const ctx = useContext(ShotsContext);
  if (!ctx) throw new Error('useShots must be used inside <ShotsProvider>');
  return ctx;
}
