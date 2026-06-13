import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  colors, gradients, typography, spacing, borderRadius, shadows,
} from '../styles/theme';
import {
  buildIntervals, nextSevenDays, dateKey, bookedIntervalsFor, findBookingByInterval,
  tableFreeIn,
} from '../data/mockData';
import { useShots } from '../store/ShotsStore';
import { uploadToBucket } from '../lib/supabase';
import ScreenHeader from '../components/ScreenHeader';
import GradientButton from '../components/GradientButton';

const STATUSES = [
  { value: 'Available',   label: 'Available',   icon: 'checkmark-circle', color: colors.success },
  { value: 'Maintenance', label: 'Maintenance', icon: 'construct',        color: colors.warning },
];

const TableDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { tables, bookings, updateTable, updateBooking, deleteBooking } = useShots();
  const id = route.params?.tableId;
  const table = tables.find((t) => t.id === id);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tick, setTick] = useState(0);
  const [bookingModal, setBookingModal] = useState(null); // { booking } | null
  const [uploadingImage, setUploadingImage] = useState(false);

  useFocusEffect(useCallback(() => { setTick((t) => t + 1); }, []));

  const dates = useMemo(() => nextSevenDays(), []);
  const intervals = useMemo(
    () => buildIntervals(table?.openTime, table?.closeTime, 15),
    [table?.openTime, table?.closeTime]
  );
  const booked = useMemo(
    () => bookedIntervalsFor(bookings, id, selectedDate),
    [bookings, id, selectedDate, tick]
  );

  const dKey = dateKey(selectedDate);
  const isToday = dKey === dateKey(new Date());
  const nowValue = nowHHMM();
  const freeIn = table ? tableFreeIn(table) : null;

  // Pick a table photo (camera or gallery), upload it, and persist the URL.
  const launchPicker = async (source) => {
    try {
      const opts = { mediaTypes: ['images'], allowsEditing: true, aspect: [16, 10], quality: 0.7 };
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert('Permission needed', 'Camera access is required to take a photo.');
        result = await ImagePicker.launchCameraAsync(opts);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return Alert.alert('Permission needed', 'Photo library access is required to choose an image.');
        result = await ImagePicker.launchImageLibraryAsync(opts);
      }
      if (result.canceled || !result.assets?.[0]) return;
      const a = result.assets[0];
      setUploadingImage(true);
      const url = await uploadToBucket(
        'member-photos',
        { uri: a.uri, name: a.fileName, type: a.mimeType },
        'tables/',
      );
      await updateTable(table.id, { image: url });
    } catch (e) {
      Alert.alert('Could not update photo', e?.message || 'Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePickImage = () => {
    if (uploadingImage) return;
    const options = [
      { text: 'Take Photo', onPress: () => launchPicker('camera') },
      { text: 'Choose from Gallery', onPress: () => launchPicker('library') },
    ];
    if (table.image) {
      options.push({ text: 'Remove Photo', style: 'destructive', onPress: () => updateTable(table.id, { image: null }) });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Table Photo', 'Add a photo for this table', options);
  };

  const handleEndSession = () => {
    Alert.alert(
      'End session early?',
      `${table.occupiedBy || 'Current player'} is on Table #${table.number}. Marking it Available will close this booking now.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Available',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateTable(table.id, { status: 'Available', occupiedUntil: null, occupiedBy: null });
              const active = bookings.find((b) => b.tableId === table.id && b.status === 'Active');
              if (active) {
                await updateBooking(active.id, { status: 'Completed', end: nowHHMM() });
              }
            } catch (e) {
              Alert.alert('Could not end session', e?.message || 'Please try again.');
            }
            setTick((t) => t + 1);
          },
        },
      ]
    );
  };

  const handleSetStatus = (next) => {
    if (next === table.status) return;
    const apply = async () => {
      const patch = { status: next };
      // Clearing to Available also frees any lingering occupied session.
      if (next === 'Available') { patch.occupiedUntil = null; patch.occupiedBy = null; }
      try {
        await updateTable(table.id, patch);
      } catch (e) {
        Alert.alert('Could not update status', e?.message || 'Please try again.');
      }
      setTick((t) => t + 1);
    };
    if (next === 'Maintenance') {
      Alert.alert(
        'Mark for maintenance?',
        `Table #${table.number} will be unavailable for new bookings until you set it back to Available.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Mark Maintenance', style: 'destructive', onPress: apply },
        ]
      );
      return;
    }
    apply();
  };

  const onPickSlot = (interval) => {
    if (table.status === 'Maintenance') {
      Alert.alert(
        'Table under maintenance',
        'This table is marked for maintenance and cannot be booked. Set it back to Available first.'
      );
      return;
    }
    if (booked.has(interval.value)) {
      const b = findBookingByInterval(bookings, id, selectedDate, interval.value);
      if (b) setBookingModal({ booking: b });
      return;
    }
    if (isToday && interval.value < nowValue) return;
    navigation.navigate('BookingForm', {
      tableId: table.id,
      date: dKey,
      startValue: interval.value,
      startLabel: interval.label,
    });
  };

  const handleAmend = () => {
    const b = bookingModal?.booking;
    if (!b) return;
    setBookingModal(null);
    navigation.navigate('BookingForm', { tableId: table.id, bookingId: b.id });
  };

  const handleCancelBooking = () => {
    const b = bookingModal?.booking;
    if (!b) return;
    Alert.alert(
      'Cancel booking?',
      `This will free up ${b.start}–${b.end} on Table #${table.number}. This cannot be undone.`,
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            await deleteBooking(b.id);
            setBookingModal(null);
            setTick((t) => t + 1);
          },
        },
      ]
    );
  };

  if (!table) {
    return (
      <View style={styles.root}>
        <ScreenHeader
          title="Table"
          subtitle="Not found"
          onBack={() => navigation.goBack()}
          variant="gradient"
        />
      </View>
    );
  }

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
        {/* Image hero — tap to add/change the table photo */}
        <TouchableOpacity style={styles.imageWrap} activeOpacity={0.9} onPress={handlePickImage}>
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

          {/* Camera chip + uploading state */}
          <View style={styles.cameraChip}>
            {uploadingImage ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="camera" size={16} color={colors.white} />
            )}
            <Text style={styles.cameraChipText}>
              {uploadingImage ? 'Uploading…' : table.image ? 'Change' : 'Add photo'}
            </Text>
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
        </TouchableOpacity>

        {/* Pricing */}
        <View style={styles.priceCard}>
          <PriceTile icon="diamond" label="Member Rate" value={`Rs. ${table.memberRate}/hr`} color={colors.primary} />
          <View style={styles.priceDivider} />
          <PriceTile icon="person" label="Non-Member" value={`Rs. ${table.nonMemberRate}/hr`} color={colors.text} />
        </View>

        {/* Table status control */}
        <Text style={styles.sectionTitle}>Table status</Text>
        <View style={styles.statusRow}>
          {STATUSES.map((s) => {
            const active = table.status === s.value;
            return (
              <TouchableOpacity
                key={s.value}
                activeOpacity={0.85}
                onPress={() => handleSetStatus(s.value)}
                style={[styles.statusBtn, active && { backgroundColor: s.color, borderColor: s.color }]}
              >
                <Ionicons name={s.icon} size={15} color={active ? colors.white : s.color} />
                <Text style={[styles.statusBtnText, { color: active ? colors.white : colors.text }]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {table.status === 'Maintenance' ? (
          <View style={styles.maintBanner}>
            <Ionicons name="construct" size={16} color={colors.warning} />
            <Text style={styles.maintBannerText}>
              This table is under maintenance. New bookings are disabled until it's set back to Available.
            </Text>
          </View>
        ) : null}

        {/* Date selector */}
        <Text style={styles.sectionTitle}>Select a date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesRow}>
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
                <Text style={[styles.dateChipDate, active && styles.dateChipActiveText]}>{d.getDate()}</Text>
                <Text style={[styles.dateChipMon, active && styles.dateChipActiveText]}>
                  {d.toLocaleDateString('en-US', { month: 'short' })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Slot grid */}
        <View style={styles.gridHeader}>
          <Text style={styles.sectionTitle}>Time slots</Text>
          <Text style={styles.gridHint}>Open {table.openTime} · Close {table.closeTime}</Text>
        </View>

        <Legend />

        <View style={styles.grid}>
          {intervals.map((iv) => {
            const isBooked = booked.has(iv.value);
            const isPast = isToday && iv.value < nowValue;
            const state = isBooked ? 'booked' : isPast ? 'past' : 'free';
            const disabled = isPast; // booked is now tappable (opens details)

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

      {/* Booked-slot details */}
      <Modal
        visible={!!bookingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setBookingModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHead}>
              <View>
                <Text style={styles.modalTitle}>Booking details</Text>
                <Text style={styles.modalSub}>Table #{table.number} · {bookingModal?.booking?.date}</Text>
              </View>
              <TouchableOpacity onPress={() => setBookingModal(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {bookingModal?.booking && (
              <>
                <View style={styles.detailCard}>
                  <DetailRow icon="time" label="Time" value={`${bookingModal.booking.start} → ${bookingModal.booking.end}`} />
                  <DetailRow icon="people" label="Players" value={`${bookingModal.booking.members?.length || 1}`} />
                  <DetailRow icon="person" label="Member(s)" value={bookingModal.booking.memberName} />
                  <DetailRow icon={bookingModal.booking.isMember ? 'diamond' : 'walk'} label="Type" value={bookingModal.booking.isMember ? 'Member' : 'Guest'} />
                  <DetailRow icon="cash" label="Total" value={`Rs. ${bookingModal.booking.amount.toLocaleString()}`} />
                  {bookingModal.booking.discount ? (
                    <DetailRow
                      icon="pricetag"
                      label="Discount"
                      value={`${bookingModal.booking.discount.type === 'percent' ? bookingModal.booking.discount.value + '%' : 'Rs. ' + bookingModal.booking.discount.value}${bookingModal.booking.discount.reason ? `  ·  ${bookingModal.booking.discount.reason}` : ''}`}
                    />
                  ) : null}
                  <DetailRow
                    icon="checkmark-circle"
                    label="Status"
                    value={bookingModal.booking.status}
                    valueColor={bookingModal.booking.status === 'Active' ? colors.success : colors.textLight}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={handleCancelBooking} style={styles.cancelBtn} activeOpacity={0.85}>
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                    <Text style={styles.cancelBtnText}>Cancel booking</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <GradientButton label="Amend" icon="create-outline" onPress={handleAmend} />
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const Legend = () => (
  <View style={styles.legend}>
    <LegendItem color={colors.successSoft} border={colors.success} label="Free" />
    <LegendItem color={colors.errorSoft} border={colors.error} label="Booked — tap to view" />
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

const DetailRow = ({ icon, label, value, valueColor }) => (
  <View style={styles.dRow}>
    <View style={styles.dIcon}>
      <Ionicons name={icon} size={14} color={colors.primary} />
    </View>
    <Text style={styles.dLabel}>{label}</Text>
    <Text style={[styles.dValue, valueColor && { color: valueColor }]} numberOfLines={2}>{value}</Text>
  </View>
);

const statusBg = () => ({ backgroundColor: 'rgba(255,255,255,0.92)' });
const statusDot = (s) =>
  s === 'Available' ? colors.success : s === 'Occupied' ? colors.primary : colors.warning;

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },

  imageWrap: { borderRadius: borderRadius.xl, overflow: 'hidden', marginBottom: spacing.lg, ...shadows.md },
  image: { width: '100%', height: 180 },
  imageFallback: { height: 180, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imageDecor1: { position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(229,62,62,0.22)' },
  imageDecor2: { position: 'absolute', bottom: -60, left: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(127,19,24,0.4)' },
  imageFallbackText: { marginTop: spacing.md, color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  imageOverlay: {
    position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  numberBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: borderRadius.round,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  numberBadgeText: { color: colors.white, fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: borderRadius.round,
  },
  statusBadgeDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  cameraChip: {
    position: 'absolute',
    bottom: spacing.md, right: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: borderRadius.round,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  cameraChipText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  occupiedBanner: {
    position: 'absolute', bottom: spacing.md, left: spacing.md, right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    flexDirection: 'row', alignItems: 'center',
  },
  occupiedLine1: { color: colors.white, fontWeight: '800' },
  occupiedLine2: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: borderRadius.round,
  },
  endBtnText: { color: colors.white, fontWeight: '800', fontSize: 12 },

  priceCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    ...shadows.sm,
    marginBottom: spacing.lg,
  },
  priceTile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  priceLabel: { fontSize: 10, color: colors.textLight, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  priceValue: { ...typography.h4, marginTop: 2 },
  priceDivider: { width: 1, marginHorizontal: spacing.md, backgroundColor: colors.border },

  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  statusRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statusBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
  },
  statusBtnText: { ...typography.caption, fontWeight: '800', textTransform: 'none', letterSpacing: 0 },
  maintBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.warningSoft || 'rgba(245,158,11,0.12)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  maintBannerText: { flex: 1, ...typography.bodySmall, color: colors.text },
  datesRow: { gap: spacing.sm, paddingBottom: spacing.md, paddingRight: 4 },
  dateChip: {
    width: 60, paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center',
  },
  dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary, ...shadows.redSoft },
  dateChipDay: { fontSize: 11, color: colors.textLight, fontWeight: '700' },
  dateChipDate: { ...typography.h3, color: colors.text, marginTop: 2 },
  dateChipMon: { fontSize: 10, color: colors.textLight, fontWeight: '700', marginTop: 2 },
  dateChipActiveText: { color: colors.white },

  gridHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.sm },
  gridHint: { fontSize: 11, color: colors.textLight, fontWeight: '600', marginBottom: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5 },
  legendText: { fontSize: 11, color: colors.textLight, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    width: '23.5%',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  slotFree:   { backgroundColor: colors.successSoft, borderColor: colors.success },
  slotBooked: { backgroundColor: colors.errorSoft,   borderColor: colors.error },
  slotPast:   { backgroundColor: colors.surfaceAlt,  borderColor: colors.divider },
  slotText: { ...typography.h4, color: colors.text },
  slotSub: {
    fontSize: 10, color: colors.text, fontWeight: '700',
    marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase',
  },
  slotBookedText: { color: colors.error },
  slotPastText:   { color: colors.textMuted },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.lg, paddingTop: spacing.sm,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.divider,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  modalTitle: { ...typography.h3, color: colors.text },
  modalSub: { ...typography.bodySmall, color: colors.textLight, marginTop: 2 },
  detailCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md,
  },
  dRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  dIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  dLabel: { ...typography.caption, color: colors.textLight, width: 80, textTransform: 'none', letterSpacing: 0 },
  dValue: { flex: 1, ...typography.bodySmall, color: colors.text, fontWeight: '700', textAlign: 'right' },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5, borderColor: colors.error,
  },
  cancelBtnText: { ...typography.bodySmall, color: colors.error, fontWeight: '800' },
});

export default TableDetailScreen;
