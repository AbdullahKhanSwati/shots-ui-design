import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import {
  mockTables, mockMemberships,
  addBooking, intervalsForRange, bookedIntervalsFor, addMinutes,
} from '../data/mockData';
import GradientButton from '../components/GradientButton';
import ScreenHeader from '../components/ScreenHeader';

const DURATIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 h', minutes: 60 },
  { label: '1.5 h', minutes: 90 },
  { label: '2 h', minutes: 120 },
  { label: '3 h', minutes: 180 },
];

const BookingFormScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { tableId, date, startValue, startLabel } = route.params || {};
  const table = mockTables.find((t) => t.id === tableId) || mockTables[0];

  const [duration, setDuration] = useState(DURATIONS[3]); // 1h
  const [isMember, setIsMember] = useState(true);
  const [member, setMember] = useState(mockMemberships[0]);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const endValue = useMemo(() => addMinutes(startValue, duration.minutes), [startValue, duration]);
  const reservedIntervals = useMemo(
    () => intervalsForRange(startValue, duration.minutes / 60),
    [startValue, duration]
  );
  const existingBooked = useMemo(() => bookedIntervalsFor(table.id, date), [table.id, date]);
  const conflict = reservedIntervals.some((iv) => existingBooked.has(iv));

  const rate = isMember ? table.memberRate : table.nonMemberRate;
  const total = Math.round((rate * duration.minutes) / 60);

  const dateLabel = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleConfirm = () => {
    if (conflict) {
      return Alert.alert('Conflict', 'Selected duration overlaps an existing booking. Pick a shorter duration.');
    }
    if (!isMember && !guestName) {
      return Alert.alert('Missing info', 'Please enter the guest name.');
    }
    addBooking({
      tableId: table.id,
      tableNumber: table.number,
      date,
      start: startValue,
      end: endValue,
      intervals: reservedIntervals,
      isMember,
      memberId: isMember ? member.id : null,
      memberName: isMember ? member.name : guestName,
      memberType: isMember ? member.type : 'Guest',
      amount: total,
    });
    Alert.alert(
      'Booking Confirmed',
      `Table #${table.number} booked ${dateLabel} from ${startValue} to ${endValue} for Rs. ${total.toLocaleString()}.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Complete Booking"
        subtitle={`Table #${table.number} · ${table.type}`}
        onBack={() => navigation.goBack()}
        variant="gradient"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryIcon}>
                <Ionicons name="calendar" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Date</Text>
                <Text style={styles.summaryValue}>{dateLabel}</Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryIcon}>
                <Ionicons name="time" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Start Time</Text>
                <Text style={styles.summaryValue}>{startLabel} ({startValue})</Text>
              </View>
              <View style={styles.lockedTag}>
                <Ionicons name="lock-closed" size={10} color={colors.success} />
                <Text style={styles.lockedText}>Locked</Text>
              </View>
            </View>
          </View>

          {/* Member / Guest toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Booking Type</Text>
            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => setIsMember(true)}
                style={[styles.toggleBtn, isMember && styles.toggleBtnActive]}
              >
                <Ionicons name="diamond" size={16} color={isMember ? colors.white : colors.primary} />
                <View>
                  <Text style={[styles.toggleTitle, isMember && { color: colors.white }]}>Member</Text>
                  <Text style={[styles.toggleSub, isMember && { color: 'rgba(255,255,255,0.85)' }]}>
                    Rs. {table.memberRate}/hr
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => setIsMember(false)}
                style={[styles.toggleBtn, !isMember && styles.toggleBtnActive]}
              >
                <Ionicons name="person" size={16} color={!isMember ? colors.white : colors.text} />
                <View>
                  <Text style={[styles.toggleTitle, !isMember && { color: colors.white }]}>Non-Member</Text>
                  <Text style={[styles.toggleSub, !isMember && { color: 'rgba(255,255,255,0.85)' }]}>
                    Rs. {table.nonMemberRate}/hr
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Member picker or guest fields */}
          {isMember ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Select Member</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {mockMemberships.map((m) => {
                  const active = member?.id === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setMember(m)}
                      style={[styles.memberChip, active && styles.memberChipActive]}
                    >
                      <View style={[styles.memberAvatar, active && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Text style={[styles.memberInit, active && { color: colors.white }]}>
                          {m.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.memberName, active && { color: colors.white }]}>{m.name}</Text>
                        <Text style={[styles.memberId, active && { color: 'rgba(255,255,255,0.7)' }]}>{m.id}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Guest Details</Text>
              <Field label="Full Name" icon="person-outline" placeholder="e.g. John Doe" value={guestName} onChangeText={setGuestName} />
              <Field label="Phone (optional)" icon="call-outline" placeholder="+92 300 1234567" value={guestPhone} onChangeText={setGuestPhone} keyboardType="phone-pad" />
            </View>
          )}

          {/* Duration */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Duration</Text>
            <View style={styles.durRow}>
              {DURATIONS.map((d) => (
                <Pressable
                  key={d.label}
                  onPress={() => setDuration(d)}
                  style={[styles.durBtn, duration.label === d.label && styles.durBtnActive]}
                >
                  <Text style={[styles.durText, duration.label === d.label && { color: colors.white }]}>
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.endHint}>
              <Ionicons name="arrow-forward-circle" size={14} color={colors.primary} />
              <Text style={styles.endHintText}>
                Ends at <Text style={{ fontWeight: '800', color: colors.primaryDark }}>{endValue}</Text>
              </Text>
            </View>
            {conflict ? (
              <View style={styles.conflictBanner}>
                <Ionicons name="warning" size={14} color={colors.error} />
                <Text style={styles.conflictText}>
                  This duration overlaps another booking. Try a shorter slot.
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* Sticky total + confirm */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs. {total.toLocaleString()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <GradientButton label="Confirm Booking" icon="checkmark" onPress={handleConfirm} disabled={conflict} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const Field = ({ label, icon, ...rest }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={18} color={colors.textLight} />
      <TextInput {...rest} placeholderTextColor={colors.textMuted} style={styles.input} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },

  summary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryLabel: { fontSize: 10, color: colors.textLight, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  summaryValue: { ...typography.body, color: colors.text, fontWeight: '700', marginTop: 2 },
  summaryDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  lockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  lockedText: { fontSize: 10, color: colors.success, fontWeight: '800' },

  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionLabel: { ...typography.label, color: colors.primaryDark, marginBottom: spacing.md },

  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleTitle: { ...typography.bodySmall, color: colors.text, fontWeight: '800' },
  toggleSub: { fontSize: 11, color: colors.textLight, marginTop: 1 },

  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  memberChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  memberAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  memberInit: { ...typography.caption, color: colors.primaryDark, fontWeight: '800' },
  memberName: { ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  memberId: { fontSize: 10, color: colors.textLight, fontWeight: '600' },

  field: { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, color: colors.textLight, fontWeight: '700', marginBottom: spacing.xs },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    height: 50,
    borderRadius: borderRadius.md,
  },
  input: { flex: 1, ...typography.body, color: colors.text, paddingVertical: 0 },

  durRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  durBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  durBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  durText: { ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  endHint: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.md,
  },
  endHintText: { ...typography.bodySmall, color: colors.text, flex: 1 },
  conflictBanner: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.errorSoft,
    borderRadius: borderRadius.md,
  },
  conflictText: { ...typography.bodySmall, color: colors.error, flex: 1 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalBlock: {},
  totalLabel: { fontSize: 10, color: colors.textLight, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { ...typography.h2, color: colors.primary, marginTop: 2 },
});

export default BookingFormScreen;
