import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, typography, spacing, borderRadius, shadows } from '../styles/theme';
import {
  getMTDFinance, getMonthFinance, previousMonths, dateKey,
} from '../data/mockData';
import { useShots } from '../store/ShotsStore';
import SearchBar from '../components/SearchBar';
import FilterChips from '../components/FilterChips';

const TYPES = [
  { value: 'All', label: 'All', icon: 'apps' },
  { value: 'In',  label: 'Income', icon: 'trending-up' },
  { value: 'Out', label: 'Expense', icon: 'trending-down' },
];

const FinanceScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { finance } = useShots();
  const months = useMemo(() => previousMonths(12), []);
  const [monthIndex, setMonthIndex] = useState(0); // 0 = current month
  const [pickerOpen, setPickerOpen] = useState(false);
  const [type, setType] = useState('All');
  const [query, setQuery] = useState('');

  const selectedMonth = months[monthIndex];
  const isCurrentMonth = selectedMonth.isCurrent;

  const items = useMemo(() => {
    const list = isCurrentMonth
      ? getMTDFinance(finance, new Date())
      : getMonthFinance(finance, selectedMonth.year, selectedMonth.month);
    return list.filter((f) => {
      const matchT = type === 'All' || f.type === type;
      const q = query.trim().toLowerCase();
      const matchQ = !q || (f.category || '').toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q);
      return matchT && matchQ;
    });
  }, [finance, monthIndex, type, query, isCurrentMonth, selectedMonth]);

  const income = items.filter((i) => i.type === 'In').reduce((s, i) => s + i.amount, 0);
  const expense = items.filter((i) => i.type === 'Out').reduce((s, i) => s + i.amount, 0);
  const net = income - expense;
  const incomeRatio = income / (income + expense || 1);

  const grouped = useMemo(() => {
    const map = new Map();
    items
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .forEach((it) => {
        if (!map.has(it.date)) map.set(it.date, []);
        map.get(it.date).push(it);
      });
    return Array.from(map.entries());
  }, [items]);

  const headingLabel = isCurrentMonth ? `${selectedMonth.label} · to date` : selectedMonth.label;
  const todayKey = dateKey(new Date());

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.brand} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.heroTop}>
          <TouchableOpacity onPress={() => navigation.openDrawer?.()} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="menu" size={20} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Finance</Text>
          <TouchableOpacity style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="download-outline" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Month picker pill */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => setPickerOpen(true)} style={styles.monthPill}>
          <Ionicons name="calendar" size={14} color={colors.white} />
          <Text style={styles.monthPillText}>{headingLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.netCard}>
          <Text style={styles.netLabel}>Net Profit · {headingLabel}</Text>
          <Text style={styles.netValue}>Rs. {net.toLocaleString()}</Text>

          <View style={styles.bar}>
            <View style={[styles.barIn, { flex: incomeRatio || 0.01 }]} />
            <View style={[styles.barOut, { flex: 1 - incomeRatio || 0.01 }]} />
          </View>
          <View style={styles.barLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={styles.legendText}>In Rs. {income.toLocaleString()}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.gold }]} />
              <Text style={styles.legendText}>Out Rs. {expense.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.cards}>
        <MoneyCard label="Income" value={income} color={colors.success} icon="arrow-down" />
        <MoneyCard label="Expense" value={expense} color={colors.error} icon="arrow-up" />
      </View>

      <View style={styles.controls}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search transactions…" />
      </View>

      <View style={{ paddingTop: spacing.sm }}>
        <FilterChips label="Type" items={TYPES} value={type} onChange={setType} compact />
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {grouped.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No transactions for this period</Text>
          </View>
        ) : (
          grouped.map(([date, list]) => (
            <View key={date} style={{ marginBottom: spacing.md }}>
              <Text style={styles.dateLabel}>
                {date === todayKey ? 'Today' : new Date(date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
              </Text>
              {list.map((tx) => (
                <View key={tx.id} style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: tx.type === 'In' ? colors.successSoft : colors.errorSoft }]}>
                    <Ionicons
                      name={tx.type === 'In' ? 'trending-up' : 'trending-down'}
                      size={16}
                      color={tx.type === 'In' ? colors.success : colors.error}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txCat}>{tx.category}</Text>
                    <Text style={styles.txDesc} numberOfLines={1}>
                      {tx.description}{tx.time ? `  ·  ${tx.time}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.txAmt, { color: tx.type === 'In' ? colors.success : colors.error }]}>
                    {tx.type === 'In' ? '+' : '-'} Rs. {tx.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Expense')}
      >
        <LinearGradient colors={gradients.brand} style={styles.fabGrad}>
          <Ionicons name="add" size={26} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Month picker modal */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHead}>
              <View>
                <Text style={styles.modalTitle}>Select month</Text>
                <Text style={styles.modalSub}>Current month is month-to-date.</Text>
              </View>
              <TouchableOpacity onPress={() => setPickerOpen(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {months.map((m, i) => {
                const active = i === monthIndex;
                return (
                  <TouchableOpacity
                    key={`${m.year}-${m.month}`}
                    activeOpacity={0.85}
                    onPress={() => { setMonthIndex(i); setPickerOpen(false); }}
                    style={[styles.monthRow, active && styles.monthRowActive]}
                  >
                    <View style={[styles.monthIcon, active && { backgroundColor: colors.primary }]}>
                      <Ionicons name="calendar" size={14} color={active ? colors.white : colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.monthRowName}>{m.label}</Text>
                      {m.isCurrent ? <Text style={styles.monthRowMeta}>Current month — to date</Text> : null}
                    </View>
                    {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const MoneyCard = ({ label, value, color, icon }) => (
  <View style={[styles.moneyCard, { borderTopColor: color }]}>
    <View style={[styles.moneyIcon, { backgroundColor: `${color}1A` }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <Text style={styles.moneyLabel}>{label}</Text>
    <Text style={styles.moneyValue}>Rs. {value.toLocaleString()}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { ...typography.h3, color: colors.white },
  monthPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: borderRadius.round,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    marginBottom: spacing.md,
  },
  monthPillText: { ...typography.bodySmall, color: colors.white, fontWeight: '800' },
  netCard: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  netLabel: { ...typography.caption, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  netValue: { ...typography.display, color: colors.white, marginTop: 4 },
  bar: {
    flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden',
    marginTop: spacing.md, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  barIn:  { backgroundColor: colors.success },
  barOut: { backgroundColor: colors.gold },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  cards: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    gap: spacing.sm, marginTop: -spacing.lg,
  },
  moneyCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
    borderTopWidth: 3,
    ...shadows.md,
  },
  moneyIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  moneyLabel: { fontSize: 10, color: colors.textLight, fontWeight: '700', letterSpacing: 0.5 },
  moneyValue: { ...typography.h4, color: colors.text, marginTop: 2 },

  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  empty: { alignItems: 'center', paddingTop: spacing.xxxl, gap: spacing.md },
  emptyText: { ...typography.bodySmall, color: colors.textLight },
  dateLabel: { ...typography.label, color: colors.textLight, marginBottom: spacing.sm, marginTop: spacing.sm },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md, borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
    ...shadows.xs,
  },
  txIcon: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  txCat: { ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  txDesc: { ...typography.caption, color: colors.textLight, marginTop: 2, textTransform: 'none', letterSpacing: 0 },
  txAmt: { ...typography.bodySmall, fontWeight: '800' },

  fab: {
    position: 'absolute', right: spacing.lg,
    width: 58, height: 58, borderRadius: 29,
    ...shadows.red,
  },
  fabGrad: {
    width: '100%', height: '100%',
    borderRadius: 29, alignItems: 'center', justifyContent: 'center',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.lg, paddingTop: spacing.sm,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.divider, alignSelf: 'center', marginBottom: spacing.md },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  modalTitle: { ...typography.h3, color: colors.text },
  modalSub: { ...typography.bodySmall, color: colors.textLight, marginTop: 2 },
  monthRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: 'transparent',
    marginBottom: spacing.sm,
  },
  monthRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  monthIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  monthRowName: { ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  monthRowMeta: { ...typography.caption, color: colors.textLight, marginTop: 2, textTransform: 'none', letterSpacing: 0 },
});

export default FinanceScreen;
