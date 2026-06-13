import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, gradients, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { sortBookingsByTableThenTime, dateKey } from '../data/mockData';
import { useShots } from '../store/ShotsStore';
import TableCard from '../components/TableCard';
import SearchBar from '../components/SearchBar';
import FilterChips from '../components/FilterChips';

const STATUS_OPTIONS = [
  { value: 'All', label: 'All', icon: 'apps' },
  { value: 'Available', label: 'Available', icon: 'checkmark-circle' },
  { value: 'Maintenance', label: 'Maintenance', icon: 'construct' },
];
const TYPE_OPTIONS = [
  { value: 'All', label: 'All Types' },
  { value: 'Pool', label: 'Pool' },
  { value: 'Snooker', label: 'Snooker' },
];

const TablesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { tables, bookings } = useShots();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [type, setType] = useState('All');
  const [tab, setTab] = useState('Tables'); // 'Tables' | 'Bookings'
  const [tick, setTick] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      setTick((t) => t + 1);
    }, [])
  );

  const filtered = useMemo(() => {
    return tables.filter((t) => {
      const q = query.trim().toLowerCase();
      const matchQ =
        !q ||
        String(t.number).includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q);
      const matchStatus = status === 'All' || t.status === status;
      const matchType = type === 'All' || t.type === type;
      return matchQ && matchStatus && matchType;
    });
  }, [tables, query, status, type]);

  // Today's bookings — grouped by table, sorted by time within each table
  const grouped = useMemo(() => {
    const todayKey = dateKey(new Date());
    const todayList = bookings.filter((b) => b.date === todayKey);
    const sorted = sortBookingsByTableThenTime(todayList);
    const map = new Map();
    sorted.forEach((b) => {
      if (!map.has(b.tableId)) map.set(b.tableId, []);
      map.get(b.tableId).push(b);
    });
    return Array.from(map.entries()); // [[tableId, bookings], ...]
  }, [bookings, tick]);

  const totalRevenue = useMemo(() => {
    const todayKey = dateKey(new Date());
    return bookings
      .filter((b) => b.date === todayKey)
      .reduce((s, b) => s + (b.amount || 0), 0);
  }, [bookings, tick]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.brand} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.heroTop}>
          <TouchableOpacity onPress={() => navigation.openDrawer?.()} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="menu" size={20} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Bookings</Text>
          <View style={styles.iconBtnSpacer} />
        </View>

        <View style={styles.tabsRow}>
          {['Tables', 'Bookings'].map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {tab === 'Tables' ? (
        <>
          <View style={styles.controls}>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search by number, type, location…" />
          </View>

          <View style={styles.filterStack}>
            <FilterChips label="Status" items={STATUS_OPTIONS} value={status} onChange={setStatus} compact />
            <FilterChips label="Type" items={TYPE_OPTIONS} value={type} onChange={setType} compact />
          </View>

          <ScrollView
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="grid-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No tables match your filters</Text>
              </View>
            ) : (
              filtered.map((t, i) => (
                <TableCard
                  key={t.id}
                  table={t}
                  delay={i * 50}
                  onPress={() => navigation.navigate('TableDetail', { tableId: t.id })}
                />
              ))
            )}
          </ScrollView>
        </>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingTop: spacing.md, paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.bookingSummary}>
            <SummaryItem icon="grid" label="Tables" value={grouped.length} color={colors.primary} />
            <SummaryItem icon="checkmark-done" label="Bookings" value={grouped.reduce((s, [, list]) => s + list.length, 0)} color={colors.success} />
            <SummaryItem icon="cash" label="Revenue" value={`Rs. ${totalRevenue.toLocaleString()}`} color={colors.warning} />
          </View>

          {grouped.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No bookings today</Text>
            </View>
          ) : (
            grouped.map(([tableId, list]) => (
              <View key={tableId} style={{ marginBottom: spacing.md }}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupBubble}>
                    <Text style={styles.groupBubbleText}>T{list[0].tableNumber}</Text>
                  </View>
                  <Text style={styles.groupTitle}>Table #{list[0].tableNumber}</Text>
                  <View style={styles.groupCount}>
                    <Text style={styles.groupCountText}>{list.length}</Text>
                  </View>
                </View>

                {list.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('TableDetail', { tableId: b.tableId })}
                    style={styles.bookingCard}
                  >
                    <View style={[styles.bookingTime, b.status === 'Active' && { backgroundColor: colors.successSoft }]}>
                      <Text style={[styles.bookingTimeText, b.status === 'Active' && { color: colors.success }]}>{b.start}</Text>
                      <Text style={[styles.bookingTimeText, b.status === 'Active' && { color: colors.success }, { fontSize: 10 }]}>{b.end}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <View style={styles.bookingTitleRow}>
                        <Text style={styles.bookingName} numberOfLines={1}>{b.memberName}</Text>
                        <View style={[styles.statusPill, b.status === 'Active' ? styles.pillActive : styles.pillDone]}>
                          <Text style={[styles.statusPillText, { color: b.status === 'Active' ? colors.success : colors.textLight }]}>
                            {b.status}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.bookingMeta}>
                        <Ionicons name="people" size={11} color={colors.textLight} />
                        <Text style={styles.bookingMetaText}>
                          {b.members?.length || 1} {(b.members?.length || 1) > 1 ? 'players' : 'player'}
                        </Text>
                        <Text style={styles.bookingDot}>•</Text>
                        <Ionicons name={b.isMember ? 'diamond' : 'person'} size={11} color={colors.textLight} />
                        <Text style={styles.bookingMetaText}>{b.isMember ? 'Member' : 'Guest'}</Text>
                      </View>
                      <Text style={styles.bookingAmt}>Rs. {b.amount.toLocaleString()}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const SummaryItem = ({ icon, label, value, color }) => (
  <View style={styles.summaryItem}>
    <View style={[styles.summaryIcon, { backgroundColor: `${color}1A` }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnSpacer: { width: 38, height: 38 },
  heroTitle: { ...typography.h3, color: colors.white },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: borderRadius.lg,
    padding: 4,
    marginTop: spacing.md,
  },
  tab: { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.md, alignItems: 'center' },
  tabActive: { backgroundColor: colors.white },
  tabText: { ...typography.bodySmall, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  tabTextActive: { color: colors.primary },
  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  filterStack: { paddingTop: spacing.sm, gap: spacing.xs },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  empty: { alignItems: 'center', paddingTop: spacing.xxxl, gap: spacing.md },
  emptyText: { ...typography.bodySmall, color: colors.textLight },

  bookingSummary: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryItem: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
    ...shadows.sm,
  },
  summaryIcon: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryValue: { ...typography.body, color: colors.text, fontWeight: '800' },
  summaryLabel: { fontSize: 10, color: colors.textLight, fontWeight: '700' },

  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  groupBubble: {
    width: 28, height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  groupBubbleText: { ...typography.caption, color: colors.primaryDark, fontWeight: '800' },
  groupTitle: { flex: 1, ...typography.h4, color: colors.text },
  groupCount: {
    minWidth: 24, height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  groupCountText: { fontSize: 11, color: colors.textLight, fontWeight: '800' },

  bookingCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
    ...shadows.xs,
  },
  bookingTime: {
    width: 60,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  bookingTimeText: { ...typography.caption, color: colors.text, fontWeight: '800' },
  bookingTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  bookingName: { flex: 1, ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  statusPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.round },
  pillActive: { backgroundColor: colors.successSoft },
  pillDone: { backgroundColor: colors.surfaceAlt },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  bookingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  bookingMetaText: { ...typography.caption, color: colors.textLight, textTransform: 'none', letterSpacing: 0 },
  bookingDot: { color: colors.textMuted, marginHorizontal: 4 },
  bookingAmt: { ...typography.bodySmall, color: colors.primary, fontWeight: '800', marginTop: 4 },
});

export default TablesScreen;
