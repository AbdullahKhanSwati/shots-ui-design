import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  colors, gradients, typography, spacing, borderRadius, shadows,
} from '../styles/theme';
import {
  mockTables, mockBookings,
  buildIntervals, nextSevenDays, dateKey, bookedIntervalsFor, tableFreeIn,
} from '../data/mockData';
import ScreenHeader from '../components/ScreenHeader';

const TableDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const id = route.params?.tableId;
  const seed = mockTables.find((t) => t.id === id) || mockTables[0];
  const [table, setTable] = useState(seed);

  const [selectedDate, setSelectedDate] = useState(new Date());
  // re-render trigger when a new booking is added
  const [tick, setTick] = useState(0);

  // refresh when screen comes back into focus (e.g. after booking)
  useFocusEffect(
    useCallback(() => {
      setTick((t) => t + 1);
    }, [])
  );

  const dates = useMemo(() => nextSevenDays(), []);
  const intervals = useMemo(
    () => buildIntervals(table.openTime, table.closeTime, 15),
    [table.openTime, table.closeTime]
  );
  const booked = useMemo(
    () => bookedIntervalsFor(table.id, selectedDate),
    [table.id, selectedDate, tick]
  );

  const dKey = dateKey(selectedDate);
  const isToday = dKey === dateKey(new Date());
  const nowValue = nowHHMM();
  const freeIn = tableFreeIn(table);

  const handleEndSession = () => {
    Alert.alert(
      'End session early?',
      `${table.occupiedBy || 'Current player'} is on Table #${table.number}. Marking it Available will close this booking now.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Available',
          style: 'destructive',
          onPress: () => {
            setTable((t) => ({
              ...t,
              status: 'Available',
              occupiedUntil: null,
              occupiedBy: null,
            }));
            const active = mockBookings.find(
              (b) => b.tableId === table.id && b.status === 'Active'
            );
            if (active) {
              active.status = 'Completed';
              active.endedEarly = true;
              active.end = nowHHMM();
            }
            setTick((t) => t + 1);
          },
        },
      ]
    );
  };

  const onPickSlot = (interval) => {
    if (booked.has(interval.value)) return;
    if (isToday && interval.value < nowValue) return;
    navigation.navigate('BookingForm', {
      tableId: table.id,
      date: dKey,
      startValue: interval.value,
      startLabel: interval.label,
    });
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={`Table #${table.number}`}
        subtitle={`${table.type} · ${table.location}`}
        onBack={() => navigation.goBack()}
        variant="gradient"
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Image hero */}
        <View style={styles.imageWrap}>
          {table.image ? (
            <Image
              source={typeof table.image === 'string' ? { uri: table.image } : table.image}
              style={styles.image}
            />
          ) : (
            <LinearGradient colors={gradients.cardDark} style={styles.imageFallback}>
              <View style={styles.imageDecor1} />
              <View style={styles.imageDecor2} />
              <Ionicons
                name={table.type === 'Snooker' ? 'game-controller' : 'ellipse'}
                size={64}
                color="rgba(255,255,255,0.22)"
              />
              <Text style={styles.imageFallbackText}>Tap to add photo</Text>
            </LinearGradient>
          )}

          <View style={styles.imageOverlay}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberBadgeText}>#{table.number}</Text>
            </View>
            <View style={[styles.statusBadge, statusBg(table.status)]}>
              <View style={[styles.statusBadgeDot, { backgroundColor: statusDot(table.status) }]} />
              <Text style={[styles.statusBadgeText, { color: statusDot(table.status) }]}>{table.status}</Text>
            </View>
          </View>

          {table.status === 'Occupied' && freeIn ? (
            <View style={styles.occupiedBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.occupiedLine1}>Free in {freeIn}</Text>
                <Text style={styles.occupiedLine2}>Occupied by {table.occupiedBy || 'guest'}</Text>
              </View>
              <TouchableOpacity onPress={handleEndSession} activeOpacity={0.9} style={styles.endBtn}>
                <Ionicons name="stop-circle" size={14} color={colors.white} />
                <Text style={styles.endBtnText}>End</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Pricing */}
        <View style={styles.priceCard}>
          <PriceTile
            icon="diamond"
            label="Member Rate"
            value={`Rs. ${table.memberRate}/hr`}
            color={colors.primary}
          />
          <View style={styles.priceDivider} />
          <PriceTile
            icon="person"
            label="Non-Member"
            value={`Rs. ${table.nonMemberRate}/hr`}
            color={colors.text}
          />
        </View>

        {/* Date selector */}
        <Text style={styles.sectionTitle}>Select a date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.datesRow}
        >
          {dates.map((d) => {
            const active = dateKey(d) === dKey;
            const today = dateKey(d) === dateKey(new Date());
            return (
              <TouchableOpacity
                key={dateKey(d)}
                onPress={() => setSelectedDate(d)}
                activeOpacity={0.85}
                style={[styles.dateChip, active && styles.dateChipActive]}
              >
                <Text style={[styles.dateChipDay, active && styles.dateChipActiveText]}>
                  {today ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={[styles.dateChipDate, active && styles.dateChipActiveText]}>
                  {d.getDate()}
                </Text>
                <Text style={[styles.dateChipMon, active && styles.dateChipActiveText]}>
                  {d.toLocaleDateString('en-US', { month: 'short' })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Slot grid */}
        <View style={styles.gridHeader}>
          <Text style={styles.sectionTitle}>Available start times</Text>
          <Text style={styles.gridHint}>
            Open {table.openTime} · Close {table.closeTime}
          </Text>
        </View>

        <Legend />

        <View style={styles.grid}>
          {intervals.map((iv) => {
            const isBooked = booked.has(iv.value);
            const isPast = isToday && iv.value < nowValue;
            const disabled = isBooked || isPast;
            const state = isBooked ? 'booked' : isPast ? 'past' : 'free';

            return (
              <TouchableOpacity
                key={iv.value}
                disabled={disabled}
                onPress={() => onPickSlot(iv)}
                activeOpacity={0.85}
                style={[
                  styles.slot,
                  state === 'free' && styles.slotFree,
                  state === 'booked' && styles.slotBooked,
                  state === 'past' && styles.slotPast,
                ]}
              >
                <Text
                  style={[
                    styles.slotText,
                    state === 'booked' && styles.slotBookedText,
                    state === 'past' && styles.slotPastText,
                  ]}
                >
                  {iv.value}
                </Text>
                <Text
                  style={[
                    styles.slotSub,
                    state === 'booked' && styles.slotBookedText,
                    state === 'past' && styles.slotPastText,
                  ]}
                >
                  {state === 'booked' ? 'Booked' : state === 'past' ? 'Past' : 'Free'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const Legend = () => (
  <View style={styles.legend}>
    <LegendItem color={colors.successSoft} border={colors.success} label="Free" />
    <LegendItem color={colors.errorSoft} border={colors.error} label="Booked" />
    <LegendItem color={colors.surfaceAlt} border={colors.divider} label="Past" />
  </View>
);

const LegendItem = ({ color, border, label }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendSwatch, { backgroundColor: color, borderColor: border }]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const PriceTile = ({ icon, label, value, color }) => (
  <View style={styles.priceTile}>
    <View style={[styles.priceIcon, { backgroundColor: `${color}1A` }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <View>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={[styles.priceValue, { color }]}>{value}</Text>
    </View>
  </View>
);

const statusBg = (s) => ({ backgroundColor: 'rgba(255,255,255,0.92)' });
const statusDot = (s) =>
  s === 'Available' ? colors.success : s === 'Occupied' ? colors.primary : colors.warning;

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },

  imageWrap: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  image: {
    width: '100%',
    height: 180,
  },
  imageFallback: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageDecor1: {
    position: 'absolute',
    top: -40, right: -30,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(229,62,62,0.22)',
  },
  imageDecor2: {
    position: 'absolute',
    bottom: -60, left: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(127,19,24,0.4)',
  },
  imageFallbackText: {
    marginTop: spacing.md,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  imageOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numberBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  numberBadgeText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
  },
  statusBadgeDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  occupiedBanner: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  occupiedLine1: { color: colors.white, fontWeight: '800' },
  occupiedLine2: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
  },
  endBtnText: { color: colors.white, fontWeight: '800', fontSize: 12 },

  priceCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    marginBottom: spacing.lg,
  },
  priceTile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  priceLabel: { fontSize: 10, color: colors.textLight, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  priceValue: { ...typography.h4, marginTop: 2 },
  priceDivider: { width: 1, marginHorizontal: spacing.md, backgroundColor: colors.border },

  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  datesRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingRight: 4,
  },
  dateChip: {
    width: 60,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dateChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.redSoft,
  },
  dateChipDay: { fontSize: 11, color: colors.textLight, fontWeight: '700' },
  dateChipDate: { ...typography.h3, color: colors.text, marginTop: 2 },
  dateChipMon: { fontSize: 10, color: colors.textLight, fontWeight: '700', marginTop: 2 },
  dateChipActiveText: { color: colors.white },

  gridHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  gridHint: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '600',
    marginBottom: 4,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5 },
  legendText: { fontSize: 11, color: colors.textLight, fontWeight: '700' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slot: {
    width: '23.5%',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  slotFree: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  slotBooked: {
    backgroundColor: colors.errorSoft,
    borderColor: colors.error,
  },
  slotPast: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.divider,
  },
  slotText: {
    ...typography.h4,
    color: colors.text,
  },
  slotSub: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  slotBookedText: { color: colors.error },
  slotPastText: { color: colors.textMuted },
});

export default TableDetailScreen;
