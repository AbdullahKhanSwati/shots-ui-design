import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { generateMemberId } from '../data/mockData';
import { getCache, setCache } from '../lib/offlineCache';

/**
 * Offline-first data store backed by Supabase.
 *
 * Reads: hydrate instantly from a local snapshot, then refresh from Supabase.
 * Writes: apply to on-screen state immediately + push an operation onto a
 * persistent OUTBOX. When the network is reachable the outbox is flushed to
 * Supabase (FIFO), then fresh server state is pulled to reconcile.
 *
 * The exported add/update/delete fns and camelCase field names are unchanged,
 * so screens didn't need to change — they just no longer fail when offline.
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

// Entity registry — links the outbox `entity` to its table + row->UI mapper.
const CFG = {
  members:      { table: 'members',      toUi: rowToMember },
  bookings:     { table: 'bookings',     toUi: rowToBooking },
  transactions: { table: 'transactions', toUi: rowToFinance },
  pool_tables:  { table: 'pool_tables',  toUi: rowToTable },
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);
const uid = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Distinguish "no internet" (retry later) from a real data error (drop the op).
function isNetworkError(err) {
  if (!err) return true;
  if (err.code) return false; // Postgres / PostgREST error code => real data error
  const msg = String(err.message || err).toLowerCase();
  return (
    msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') ||
    msg.includes('failed') || msg.includes('offline') || msg.includes('connection')
  );
}

export function ShotsProvider({ children }) {
  const { session } = useAuth();
  const businessId = session?.businessId || null;

  const [tables, setTables] = useState([]);
  const [members, setMembers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [finance, setFinance] = useState([]);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [pending, setPending] = useState(0);   // queued offline changes
  const [syncing, setSyncing] = useState(false);

  const outboxRef = useRef([]);
  const flushingRef = useRef(false);
  const membersRef = useRef([]);
  membersRef.current = members;
  const businessIdRef = useRef(businessId);
  businessIdRef.current = businessId;

  const setterFor = useCallback((entity) => ({
    members: setMembers, bookings: setBookings, transactions: setFinance, pool_tables: setTables,
  }[entity]), []);

  // Persist the outbox to disk + update the pending counter.
  const persistOutbox = useCallback(async () => {
    setPending(outboxRef.current.length);
    if (businessIdRef.current) await setCache(`outbox:${businessIdRef.current}`, outboxRef.current);
  }, []);

  // ---- Server pull (offline-safe) -----------------------------------------
  const pullFromServer = useCallback(async () => {
    const bid = businessIdRef.current;
    if (!bid) return false;
    try {
      const [t, m, b, f, bs] = await Promise.all([
        supabase.from('pool_tables').select('*').order('number', { ascending: true }),
        supabase.from('members').select('*').order('created_at', { ascending: true }),
        supabase.from('bookings').select('*').order('date', { ascending: true }),
        supabase.from('transactions').select('*').order('date', { ascending: true }),
        supabase.from('business_settings').select('profile').eq('business_id', bid).maybeSingle(),
      ]);
      if (t.error || m.error || b.error || f.error) { setOffline(true); return false; }
      setTables((t.data || []).map(rowToTable));
      setMembers((m.data || []).map(rowToMember));
      setBookings((b.data || []).map(rowToBooking));
      setFinance((f.data || []).map(rowToFinance));
      setBusinessName(bs?.data?.profile?.name || '');
      setOffline(false);
      setReady(true);
      return true;
    } catch (e) {
      setOffline(true);
      return false;
    }
  }, []);

  // ---- Outbox flush --------------------------------------------------------
  // Returns true if the queue drained (fully synced), false if it stopped
  // because the network is unreachable.
  const flush = useCallback(async () => {
    if (flushingRef.current) return false;
    if (!businessIdRef.current || outboxRef.current.length === 0) return true;
    flushingRef.current = true;
    let online = true;
    try {
      while (outboxRef.current.length > 0) {
        const op = outboxRef.current[0];
        const cfg = CFG[op.entity];
        let result;
        try {
          if (op.kind === 'insert') {
            result = await supabase.from(cfg.table).insert(op.row).select().single();
          } else if (op.kind === 'update') {
            result = await supabase.from(cfg.table).update(op.patch).eq('id', op.id).select().maybeSingle();
          } else {
            result = await supabase.from(cfg.table).delete().eq('id', op.id);
          }
        } catch (e) {
          result = { error: e };
        }
        const err = result?.error;
        if (err) {
          if (isNetworkError(err)) { online = false; break; }
          // Real data error (constraint/validation): drop the op so it doesn't
          // block everything behind it.
          console.error('sync: dropping bad op', op, err);
          outboxRef.current = outboxRef.current.slice(1);
          await persistOutbox();
          continue;
        }
        if (op.kind === 'insert' && result.data) {
          const ui = cfg.toUi(result.data);
          setterFor(op.entity)((arr) => arr.map((x) => (x.id === op.tempId ? ui : x)));
        }
        outboxRef.current = outboxRef.current.slice(1);
        await persistOutbox();
      }
    } finally {
      flushingRef.current = false;
    }
    if (!online) setOffline(true);
    return online && outboxRef.current.length === 0;
  }, [persistOutbox, setterFor]);

  // Full sync: push queued writes; if drained, pull fresh server state.
  const sync = useCallback(async () => {
    if (!businessIdRef.current) return false;
    setSyncing(true);
    try {
      const drained = await flush();
      if (drained) await pullFromServer();
      return drained;
    } finally {
      setSyncing(false);
    }
  }, [flush, pullFromServer]);

  const reload = sync; // keep the old name working for callers

  // ---- Initial load: hydrate cache, load outbox, then sync ----------------
  useEffect(() => {
    if (!businessId) {
      setTables([]); setMembers([]); setBookings([]); setFinance([]);
      setReady(false); outboxRef.current = []; setPending(0);
      return;
    }
    let active = true;
    (async () => {
      const cached = await getCache(`data:${businessId}`);
      if (active && cached) {
        setTables(cached.tables || []);
        setMembers(cached.members || []);
        setBookings(cached.bookings || []);
        setFinance(cached.finance || []);
        setBusinessName(cached.businessName || '');
        setReady(true);
      }
      outboxRef.current = (await getCache(`outbox:${businessId}`)) || [];
      setPending(outboxRef.current.length);
      if (active) await sync();
    })();
    return () => { active = false; };
  }, [businessId, sync]);

  // Re-sync when the network returns or the app comes back to the foreground.
  useEffect(() => {
    if (!businessId) return;
    const unsub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      if (connected) sync();
      else setOffline(true);
    });
    const appSub = AppState.addEventListener('change', (s) => { if (s === 'active') sync(); });
    return () => { if (typeof unsub === 'function') unsub(); appSub.remove(); };
  }, [businessId, sync]);

  // Persist a snapshot for offline viewing after each state change.
  useEffect(() => {
    if (!businessId || !ready) return;
    setCache(`data:${businessId}`, { tables, members, bookings, finance, businessName });
  }, [businessId, ready, tables, members, bookings, finance, businessName]);

  // Live sync: reflect changes made elsewhere (admin dashboard, other staff).
  // Skipped while we have unsynced local changes so it can't clobber them.
  useEffect(() => {
    if (!businessId) return;
    const refetch = {
      pool_tables: async () => {
        if (outboxRef.current.length) return;
        const { data } = await supabase.from('pool_tables').select('*').order('number', { ascending: true });
        setTables((data || []).map(rowToTable));
      },
      members: async () => {
        if (outboxRef.current.length) return;
        const { data } = await supabase.from('members').select('*').order('created_at', { ascending: true });
        setMembers((data || []).map(rowToMember));
      },
      bookings: async () => {
        if (outboxRef.current.length) return;
        const { data } = await supabase.from('bookings').select('*').order('date', { ascending: true });
        setBookings((data || []).map(rowToBooking));
      },
      transactions: async () => {
        if (outboxRef.current.length) return;
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

  // ---- Local-first mutation primitives ------------------------------------
  const localInsert = useCallback((entity, uiObj, row, tempId) => {
    setterFor(entity)((arr) => [...arr, uiObj]);
    outboxRef.current = [...outboxRef.current, { opId: uid(), entity, kind: 'insert', tempId, row }];
    persistOutbox();
    flush();
  }, [persistOutbox, flush, setterFor]);

  const localUpdate = useCallback((entity, id, uiPatch, rowPatch) => {
    setterFor(entity)((arr) => arr.map((x) => (x.id === id ? { ...x, ...uiPatch } : x)));
    // If this row was created offline and hasn't synced yet, fold the change
    // into its pending insert (so no temp-id reconciliation is ever needed).
    const ins = outboxRef.current.find((o) => o.entity === entity && o.kind === 'insert' && o.tempId === id);
    if (ins) {
      ins.row = { ...ins.row, ...rowPatch };
    } else {
      const prevUpdate = [...outboxRef.current].reverse().find((o) => o.entity === entity && o.kind === 'update' && o.id === id);
      if (prevUpdate) prevUpdate.patch = { ...prevUpdate.patch, ...rowPatch };
      else outboxRef.current = [...outboxRef.current, { opId: uid(), entity, kind: 'update', id, patch: rowPatch }];
    }
    persistOutbox();
    flush();
  }, [persistOutbox, flush, setterFor]);

  const localDelete = useCallback((entity, id) => {
    setterFor(entity)((arr) => arr.filter((x) => x.id !== id));
    const hadInsert = outboxRef.current.some((o) => o.entity === entity && o.kind === 'insert' && o.tempId === id);
    if (hadInsert) {
      // Never synced — drop the insert (and anything else for this temp id).
      outboxRef.current = outboxRef.current.filter((o) => !(o.entity === entity && (o.tempId === id || o.id === id)));
    } else {
      outboxRef.current = outboxRef.current.filter((o) => !(o.entity === entity && o.kind === 'update' && o.id === id));
      outboxRef.current = [...outboxRef.current, { opId: uid(), entity, kind: 'delete', id }];
    }
    persistOutbox();
    flush();
  }, [persistOutbox, flush, setterFor]);

  // ---- Public API (offline-first; resolves immediately) -------------------
  const updateTable = useCallback(async (id, patch) => {
    localUpdate('pool_tables', id, patch, toRow(patch, TABLE_KEYS));
  }, [localUpdate]);

  const addMember = useCallback(async (data) => {
    const id = data.id || generateMemberId(data.idCardNumber, membersRef.current.map((m) => m.id));
    const uiObj = { ...data, id };
    const row = { ...toRow(data, MEMBER_KEYS), id, business_id: businessIdRef.current };
    localInsert('members', uiObj, row, id);
    return uiObj;
  }, [localInsert]);

  const updateMember = useCallback(async (id, patch) => {
    localUpdate('members', id, patch, toRow(patch, MEMBER_KEYS));
    return { id, ...patch };
  }, [localUpdate]);

  const deleteMember = useCallback(async (id) => {
    localDelete('members', id);
  }, [localDelete]);

  const addBooking = useCallback(async (data) => {
    const payload = { ...data };
    if (!payload.memberName && payload.members) {
      payload.memberName = payload.members.map((m) => m.name).join(', ');
    }
    if (!payload.memberId && payload.members?.[0]) payload.memberId = payload.members[0].id;
    if (payload.members) payload.players = payload.members.length || 1;
    if (payload.status == null) payload.status = 'Active';
    const tempId = uid();
    const uiObj = { ...payload, id: tempId };
    const row = { ...toRow(payload, BOOKING_KEYS), business_id: businessIdRef.current };
    if (row.status == null) row.status = 'Active';
    localInsert('bookings', uiObj, row, tempId);
    return uiObj;
  }, [localInsert]);

  const updateBooking = useCallback(async (id, patch) => {
    const payload = { ...patch };
    if (payload.members) {
      payload.memberName = payload.members.map((m) => m.name).join(', ');
      payload.memberId = payload.members[0]?.id || null;
      payload.players = payload.members.length || 1;
    }
    localUpdate('bookings', id, payload, toRow(payload, BOOKING_KEYS));
    return { id, ...payload };
  }, [localUpdate]);

  const deleteBooking = useCallback(async (id) => {
    localDelete('bookings', id);
  }, [localDelete]);

  const addFinanceEntry = useCallback(async (data) => {
    const withDefaults = {
      type: 'In',
      date: data.date || todayStr(),
      time: data.time || nowTime(),
      ...data,
    };
    const tempId = uid();
    const uiObj = { ...withDefaults, id: tempId };
    const row = { ...toRow(withDefaults, FINANCE_KEYS), business_id: businessIdRef.current };
    localInsert('transactions', uiObj, row, tempId);
    return uiObj;
  }, [localInsert]);

  const value = useMemo(() => ({
    tables, members, bookings, finance, ready, offline, businessName, pending, syncing,
    reload, sync,
    updateTable,
    addMember, updateMember, deleteMember,
    addBooking, updateBooking, deleteBooking,
    addFinanceEntry,
  }), [
    tables, members, bookings, finance, ready, offline, businessName, pending, syncing,
    reload, sync,
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
