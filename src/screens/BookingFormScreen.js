import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import {
  intervalsForRange, bookedIntervalsFor, addMinutes,
} from '../data/mockData';
import {
  PRICING_MODES, DEFAULT_MODE, modesForType, pickRule, priceOf, rulesFor,
  computeCharge, gameMinutes, minMinutes, playersAllowed, ruleConstraints,
  tierLabel, unitSuffix, minutesToLabel, slotsForMinutes,
} from '../data/pricing';
import { useShots } from '../store/ShotsStore';
import GradientButton from '../components/GradientButton';
import ScreenHeader from '../components/ScreenHeader';
import SearchBar from '../components/SearchBar';

const DURATIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 h',    minutes: 60 },
  { label: '1.5 h',  minutes: 90 },
  { label: '2 h',    minutes: 120 },
  { label: '3 h',    minutes: 180 },
];

const MAX_MEMBERS = 4;
const MAX_PLAYERS = 8;
const modeMeta = (value) => PRICING_MODES.find((m) => m.value === value) || PRICING_MODES[0];
// Quick picks for the per-minute mode; anything else goes in the free field.
const MINUTE_PRESETS = [10, 15, 20, 30, 45, 60, 90];

const BookingFormScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { tables, members: memberList, bookings, pricingRules, addBooking, updateBooking } = useShots();
  const { tableId, date, startValue, startLabel, bookingId } = route.params || {};
  const table = tables.find((t) => t.id === tableId);
  const editing = !!bookingId;
  const existing = editing ? bookings.find((b) => b.id === bookingId) : null;
  const [saving, setSaving] = useState(false);

  const initialDuration = useMemo(() => {
    if (!existing) return DURATIONS[3]; // 1h
    const mins = (existing.intervals?.length || 4) * 15;
    return DURATIONS.find((d) => d.minutes === mins) || DURATIONS[3];
  }, [existing]);

  const [duration, setDuration] = useState(initialDuration);
  const [isMember, setIsMember] = useState(existing ? existing.isMember !== false : true);

  // ---- Pricing mode ------------------------------------------------------
  // Which modes this table type is priced for is decided by the admin panel
  // (Pricing page). Legacy tables with no rules keep the old hourly rates.
  const availableModes = useMemo(
    () => modesForType(pricingRules, table?.type),
    [pricingRules, table?.type]
  );
  const [mode, setMode] = useState(existing?.pricingMode || DEFAULT_MODE);
  const activeMode = useMemo(() => {
    if (availableModes.length === 0) return 'hour';
    return availableModes.some((m) => m.value === mode) ? mode : availableModes[0].value;
  }, [availableModes, mode]);

  const [players, setPlayers] = useState(() => Math.min(MAX_PLAYERS, Math.max(1, Number(existing?.players) || 2)));
  const [games, setGames] = useState(() =>
    existing?.pricingMode === 'game' ? Math.max(1, Math.round(Number(existing.units) || 1)) : 1
  );
  const [minuteInput, setMinuteInput] = useState(() =>
    existing?.pricingMode === 'minute' ? String(existing.durationMinutes || 30) : '30'
  );

  // New bookings start with no member selected; editing keeps the existing ones.
  const [members, setMembers] = useState(
    existing?.members?.slice(0, MAX_MEMBERS) || []
  );
  const [guestName, setGuestName] = useState(existing && !existing.isMember ? existing.memberName : '');
  const [guestPhone, setGuestPhone] = useState('');
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return memberList;
    return memberList.filter((m) =>
      m.name?.toLowerCase().includes(q) ||
      m.id?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q)
    );
  }, [memberList, memberQuery]);

  const [discountType, setDiscountType] = useState(existing?.discount?.type || 'none'); // none | percent | fixed
  const [discountValue, setDiscountValue] = useState(existing?.discount?.value ? String(existing.discount.value) : '');
  const [discountReason, setDiscountReason] = useState(existing?.discount?.reason || '');

  const effectiveStart = existing?.start || startValue;
  const effectiveDate  = existing?.date  || date;
  const effectiveStartLabel = startLabel || effectiveStart;

  // The price option that fits this booking (player tier + mode).
  const modeRules = useMemo(
    () => rulesFor(pricingRules, table?.type, activeMode),
    [pricingRules, table?.type, activeMode]
  );
  const rule = useMemo(
    () => pickRule(pricingRules, table?.type, activeMode, players),
    [pricingRules, table?.type, activeMode, players]
  );
  // No rules configured for this type yet -> keep charging the table's own
  // hourly rates, exactly as before the pricing modes were introduced.
  const legacyPricing = availableModes.length === 0;

  const requestedMinutes = useMemo(() => {
    if (legacyPricing || activeMode === 'hour') return duration.minutes;
    if (activeMode === 'minute') return Math.max(0, Math.round(Number(minuteInput) || 0));
    return Math.max(1, games) * gameMinutes(rule);
  }, [legacyPricing, activeMode, duration, minuteInput, games, rule]);

  const charge = useMemo(() => {
    if (legacyPricing) {
      const legacyRate = Number(isMember ? table?.memberRate : table?.nonMemberRate) || 0;
      return {
        subtotal: Math.round((legacyRate * duration.minutes) / 60),
        unitPrice: legacyRate,
        units: Number((duration.minutes / 60).toFixed(2)),
        durationMinutes: duration.minutes,
        unitLabel: 'hr',
        label: `Per hour · ${duration.label}`,
        error: null,
      };
    }
    return computeCharge({ mode: activeMode, rule, isMember, minutes: requestedMinutes, games });
  }, [legacyPricing, activeMode, rule, isMember, requestedMinutes, games, duration, table]);

  const billedMinutes = charge.durationMinutes || 0;

  // Sessions are held in 15-minute slots, so a 25-minute booking blocks 30.
  const endValue = useMemo(
    () => addMinutes(effectiveStart, Math.max(15, billedMinutes)),
    [effectiveStart, billedMinutes]
  );
  const reservedIntervals = useMemo(
    () => intervalsForRange(effectiveStart, (slotsForMinutes(billedMinutes) * 15) / 60),
    [effectiveStart, billedMinutes]
  );

  // Keep the player count consistent with the members actually on the booking.
  React.useEffect(() => {
    if (isMember && members.length > players) setPlayers(Math.min(MAX_PLAYERS, members.length));
  }, [isMember, members.length, players]);

  // when editing, exclude this booking's own intervals from conflict detection
  const existingBooked = useMemo(() => {
    const set = bookedIntervalsFor(bookings, table?.id, effectiveDate);
    if (editing && existing) {
      existing.intervals?.forEach((iv) => set.delete(iv));
    }
    return set;
  }, [bookings, table?.id, effectiveDate, editing, existing]);

  if (!table) {
    return (
      <View style={styles.root}>
        <ScreenHeader
          title="Booking"
          subtitle="Table not found"
          onBack={() => navigation.goBack()}
          variant="gradient"
        />
      </View>
    );
  }

  const conflict = reservedIntervals.some((iv) => existingBooked.has(iv));

  const subtotal = charge.subtotal;
  const discountAmount =
    discountType === 'percent'
      ? Math.round(subtotal * (Number(discountValue || 0) / 100))
      : discountType === 'fixed'
      ? Number(discountValue || 0)
      : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const dateLabel = new Date(effectiveDate).toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const toggleMember = (m) => {
    setMembers((curr) => {
      const exists = curr.find((x) => x.id === m.id);
      if (exists) return curr.filter((x) => x.id !== m.id);
      if (curr.length >= MAX_MEMBERS) {
        Alert.alert('Limit reached', `You can add up to ${MAX_MEMBERS} members per booking.`);
        return curr;
      }
      return [...curr, m];
    });
  };

  const handleConfirm = async () => {
    if (!editing && table.status === 'Maintenance') {
      return Alert.alert('Table under maintenance', 'This table cannot be booked while under maintenance.');
    }
    if (conflict) {
      return Alert.alert('Conflict', 'Selected duration overlaps an existing booking. Pick a shorter duration.');
    }
    if (isMember && members.length === 0) {
      return Alert.alert('No member selected', 'Pick at least one member for this booking.');
    }
    if (!isMember && !guestName) {
      return Alert.alert('Missing info', 'Please enter the guest name.');
    }
    if (!legacyPricing && !rule) {
      return Alert.alert(
        'No price set',
        `No ${activeMode} price is configured for ${table.type} tables. Set one in the admin panel under Pricing.`
      );
    }
    if (rule && !playersAllowed(rule, players)) {
      return Alert.alert(
        'Players not allowed on this rate',
        `The ${modeMeta(activeMode).label.toLowerCase()} rate for ${table.type} is ${ruleConstraints(rule)}. Change the player count or pick another pricing mode.`
      );
    }
    if (billedMinutes <= 0) {
      return Alert.alert('Missing duration', 'Enter how long this booking runs for.');
    }
    if (saving) return;

    const discountPayload =
      discountType !== 'none' && Number(discountValue) > 0
        ? { type: discountType, value: Number(discountValue), amount: discountAmount, reason: discountReason || null }
        : null;

    const payload = {
      tableId: table.id,
      tableNumber: table.number,
      date: effectiveDate,
      start: effectiveStart,
      end: endValue,
      intervals: reservedIntervals,
      players,
      isMember,
      members: isMember ? members.map((m) => ({ id: m.id, name: m.name, type: m.type })) : [],
      memberType: isMember ? members[0]?.type : 'Guest',
      memberName: isMember ? members.map((m) => m.name).join(', ') : guestName,
      memberId: isMember ? members[0]?.id : null,
      subtotal,
      discount: discountPayload,
      amount: total,
      pricingMode: legacyPricing ? 'hour' : activeMode,
      pricingRuleId: rule?.id ?? null,
      pricingLabel: charge.label,
      unitPrice: charge.unitPrice,
      units: charge.units,
      durationMinutes: billedMinutes,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateBooking(bookingId, payload);
        Alert.alert('Booking Updated', `Table #${table.number} updated for ${dateLabel}.`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await addBooking(payload);
        Alert.alert(
          'Booking Confirmed',
          `Table #${table.number} booked ${dateLabel} from ${effectiveStart} to ${endValue} for Rs. ${total.toLocaleString()}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (e) {
      Alert.alert('Could not save booking', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={editing ? 'Amend Booking' : 'Complete Booking'}
        subtitle={`Table #${table.number} · ${table.type}`}
        onBack={() => navigation.goBack()}
        variant="gradient"
      />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        bottomOffset={110}
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
                <Text style={styles.summaryValue}>{effectiveStartLabel} ({effectiveStart})</Text>
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
                    Rs. {legacyPricing ? table.memberRate : priceOf(rule, true)} {legacyPricing ? '/ hr' : unitSuffix(activeMode)}
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
                    Rs. {legacyPricing ? table.nonMemberRate : priceOf(rule, false)} {legacyPricing ? '/ hr' : unitSuffix(activeMode)}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Member multi-select OR guest fields */}
          {isMember ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Members on this booking</Text>
                <View style={styles.maxPill}>
                  <Text style={styles.maxPillText}>{members.length}/{MAX_MEMBERS}</Text>
                </View>
              </View>

              {/* Selected chips */}
              {members.length > 0 ? (
                <View style={styles.selectedRow}>
                  {members.map((m) => (
                    <View key={m.id} style={styles.selectedChip}>
                      <View style={styles.selectedAvatar}>
                        <Text style={styles.selectedAvatarText}>
                          {m.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                        </Text>
                      </View>
                      <Text style={styles.selectedName} numberOfLines={1}>{m.name}</Text>
                      <TouchableOpacity onPress={() => toggleMember(m)} hitSlop={8}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.helpText}>No members selected yet.</Text>
              )}

              <TouchableOpacity
                style={styles.openListBtn}
                activeOpacity={0.85}
                onPress={() => setMemberPickerOpen(true)}
              >
                <Ionicons name="people-outline" size={16} color={colors.primary} />
                <Text style={styles.openListText}>
                  {members.length === 0 ? 'Select members' : 'Add / change members'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Guest Details</Text>
              <Field label="Full Name" icon="person-outline" placeholder="e.g. John Doe" value={guestName} onChangeText={setGuestName} />
              <Field label="Phone (optional)" icon="call-outline" placeholder="+92 300 1234567" value={guestPhone} onChangeText={setGuestPhone} keyboardType="phone-pad" />
            </View>
          )}

          {/* Pricing mode — the options the admin has priced for this table type */}
          {!legacyPricing ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Pricing</Text>
              <View style={styles.modeRow}>
                {availableModes.map((m) => {
                  const active = activeMode === m.value;
                  const r = pickRule(pricingRules, table.type, m.value, players);
                  const unit = priceOf(r, isMember);
                  return (
                    <Pressable
                      key={m.value}
                      onPress={() => setMode(m.value)}
                      style={[styles.modeBtn, active && styles.modeBtnActive]}
                    >
                      <Ionicons name={m.icon} size={16} color={active ? colors.white : colors.primary} />
                      <Text style={[styles.modeTitle, active && { color: colors.white }]}>{m.short}</Text>
                      <Text style={[styles.modePrice, active && { color: 'rgba(255,255,255,0.9)' }]}>
                        {unit ? `Rs. ${unit} ${unitSuffix(m.value)}` : '—'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.helpText}>
                {modeMeta(activeMode).hint}
                {ruleConstraints(rule) ? ` · ${ruleConstraints(rule)}` : ''}
              </Text>
            </View>
          ) : null}

          {/* Players — decides which price tier applies */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Players</Text>
              {rule && tierLabel(rule, modeRules) ? (
                <View style={styles.maxPill}>
                  <Text style={styles.maxPillText}>{tierLabel(rule, modeRules)}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.stepRow}>
              <Pressable
                onPress={() => setPlayers((p) => Math.max(1, p - 1))}
                style={[styles.stepBtn, players <= 1 && styles.stepBtnDisabled]}
                disabled={players <= 1}
              >
                <Ionicons name="remove" size={18} color={players <= 1 ? colors.textMuted : colors.primary} />
              </Pressable>
              <View style={styles.stepValueWrap}>
                <Text style={styles.stepValue}>{players}</Text>
                <Text style={styles.stepUnit}>{players === 1 ? 'player' : 'players'}</Text>
              </View>
              <Pressable
                onPress={() => setPlayers((p) => Math.min(MAX_PLAYERS, p + 1))}
                style={[styles.stepBtn, players >= MAX_PLAYERS && styles.stepBtnDisabled]}
                disabled={players >= MAX_PLAYERS}
              >
                <Ionicons name="add" size={18} color={players >= MAX_PLAYERS ? colors.textMuted : colors.primary} />
              </Pressable>
            </View>
            {rule && !playersAllowed(rule, players) ? (
              <View style={styles.conflictBanner}>
                <Ionicons name="warning" size={14} color={colors.error} />
                <Text style={styles.conflictText}>
                  This rate is {ruleConstraints(rule) || 'limited'}. Change the player count or pick another pricing mode.
                </Text>
              </View>
            ) : null}
          </View>

          {/* Duration / number of games — depends on the pricing mode */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {activeMode === 'game' && !legacyPricing ? 'Games' : 'Duration'}
            </Text>

            {activeMode === 'minute' && !legacyPricing ? (
              <>
                <View style={styles.durRow}>
                  {MINUTE_PRESETS.filter((m) => m >= minMinutes(rule)).map((m) => {
                    const active = Number(minuteInput) === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => setMinuteInput(String(m))}
                        style={[styles.durBtn, active && styles.durBtnActive]}
                      >
                        <Text style={[styles.durText, active && { color: colors.white }]}>{m} min</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.fieldLabel}>Or enter exact minutes</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.currency}>min</Text>
                  <TextInput
                    value={minuteInput}
                    onChangeText={setMinuteInput}
                    placeholder={String(minMinutes(rule))}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.amountInput}
                  />
                </View>
                {charge.error ? <Text style={styles.warnText}>{charge.error}</Text> : null}
              </>
            ) : activeMode === 'game' && !legacyPricing ? (
              <>
                <View style={styles.stepRow}>
                  <Pressable
                    onPress={() => setGames((g) => Math.max(1, g - 1))}
                    style={[styles.stepBtn, games <= 1 && styles.stepBtnDisabled]}
                    disabled={games <= 1}
                  >
                    <Ionicons name="remove" size={18} color={games <= 1 ? colors.textMuted : colors.primary} />
                  </Pressable>
                  <View style={styles.stepValueWrap}>
                    <Text style={styles.stepValue}>{games}</Text>
                    <Text style={styles.stepUnit}>{games === 1 ? 'game' : 'games'}</Text>
                  </View>
                  <Pressable
                    onPress={() => setGames((g) => Math.min(12, g + 1))}
                    style={[styles.stepBtn, games >= 12 && styles.stepBtnDisabled]}
                    disabled={games >= 12}
                  >
                    <Ionicons name="add" size={18} color={games >= 12 ? colors.textMuted : colors.primary} />
                  </Pressable>
                </View>
                <Text style={styles.helpText}>
                  Each game runs up to {gameMinutes(rule)} minutes · table held for {minutesToLabel(billedMinutes)}.
                </Text>
              </>
            ) : (
              <View style={styles.durRow}>
                {DURATIONS.map((d) => (
                  <Pressable
                    key={d.label}
                    onPress={() => setDuration(d)}
                    style={[styles.durBtn, duration.label === d.label && styles.durBtnActive]}
                  >
                    <Text style={[styles.durText, duration.label === d.label && { color: colors.white }]}>{d.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.chargeBox}>
              <Text style={styles.chargeText}>
                Rs. {charge.unitPrice} × {charge.units} {charge.unitLabel}
              </Text>
              <Text style={styles.chargeStrong}>Rs. {subtotal.toLocaleString()}</Text>
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
                <Text style={styles.conflictText}>This duration overlaps another booking.</Text>
              </View>
            ) : null}
          </View>

          {/* Discount */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Discount (optional)</Text>

            <View style={styles.discTypeRow}>
              {[
                { value: 'none',    label: 'None',  icon: 'ban-outline' },
                { value: 'percent', label: '%',     icon: 'pricetag' },
                { value: 'fixed',   label: 'Rs.',   icon: 'cash' },
              ].map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setDiscountType(t.value)}
                  style={[styles.discTypeBtn, discountType === t.value && styles.discTypeBtnActive]}
                >
                  <Ionicons name={t.icon} size={14} color={discountType === t.value ? colors.white : colors.text} />
                  <Text style={[styles.discTypeText, discountType === t.value && { color: colors.white }]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            {discountType !== 'none' && (
              <>
                <Text style={styles.fieldLabel}>
                  {discountType === 'percent' ? 'Percent off (%)' : 'Discount amount (Rs.)'}
                </Text>
                <View style={styles.amountRow}>
                  <Text style={styles.currency}>{discountType === 'percent' ? '%' : 'Rs.'}</Text>
                  <TextInput
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.amountInput}
                  />
                </View>

                <Text style={styles.fieldLabel}>Reason for discount</Text>
                <TextInput
                  value={discountReason}
                  onChangeText={setDiscountReason}
                  placeholder="e.g. happy hour, regular customer, manager comp"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={styles.descInput}
                />

                <View style={styles.priceBreakdown}>
                  <BreakRow label="Subtotal" value={`Rs. ${subtotal.toLocaleString()}`} />
                  <BreakRow
                    label={`Discount${discountType === 'percent' ? ` (${discountValue || 0}%)` : ''}`}
                    value={`- Rs. ${discountAmount.toLocaleString()}`}
                    color={colors.error}
                  />
                  <View style={styles.breakDivider} />
                  <BreakRow label="Total" value={`Rs. ${total.toLocaleString()}`} bold />
                </View>
              </>
            )}
          </View>
        </KeyboardAwareScrollView>

        {/* Sticky total + confirm */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs. {total.toLocaleString()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <GradientButton
              label={editing ? 'Save Changes' : 'Confirm Booking'}
              icon="checkmark"
              onPress={handleConfirm}
              loading={saving}
              disabled={conflict || saving}
            />
          </View>
        </View>

      {/* Member picker modal */}
      <Modal
        visible={memberPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setMemberPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHead}>
              <View>
                <Text style={styles.modalTitle}>Select members</Text>
                <Text style={styles.modalSub}>Up to {MAX_MEMBERS}. Tick to add or remove.</Text>
              </View>
              <TouchableOpacity onPress={() => setMemberPickerOpen(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: spacing.md }}>
              <SearchBar
                value={memberQuery}
                onChangeText={setMemberQuery}
                placeholder="Search by name, ID or phone…"
              />
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {filteredMembers.length === 0 ? (
                <View style={styles.pickerEmpty}>
                  <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.pickerEmptyText}>No members match “{memberQuery}”.</Text>
                </View>
              ) : null}
              {filteredMembers.map((m) => {
                const selected = !!members.find((x) => x.id === m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    activeOpacity={0.85}
                    onPress={() => toggleMember(m)}
                    style={[styles.memberRow, selected && styles.memberRowActive]}
                  >
                    {m.photo ? (
                      <Image source={typeof m.photo === 'string' ? { uri: m.photo } : m.photo} style={styles.memberPhoto} />
                    ) : (
                      <View style={[styles.memberPhoto, styles.memberPhotoFallback]}>
                        <Text style={styles.memberPhotoInit}>
                          {m.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberRowName}>{m.name}</Text>
                      <Text style={styles.memberRowMeta}>{m.id} · {m.type}</Text>
                    </View>
                    <View style={[styles.tick, selected && styles.tickActive]}>
                      {selected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ marginTop: spacing.md }}>
              <GradientButton
                label={`Done — ${members.length} selected`}
                icon="checkmark"
                onPress={() => setMemberPickerOpen(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
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

const BreakRow = ({ label, value, color, bold }) => (
  <View style={styles.breakRow}>
    <Text style={[styles.breakLabel, bold && { color: colors.text, fontWeight: '800' }]}>{label}</Text>
    <Text style={[styles.breakValue, color && { color }, bold && { ...typography.h4, color: colors.primary }]}>{value}</Text>
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
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryLabel: { fontSize: 10, color: colors.textLight, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  summaryValue: { ...typography.body, color: colors.text, fontWeight: '700', marginTop: 2 },
  summaryDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  lockedTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  maxPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  maxPillText: { fontSize: 11, color: colors.primaryDark, fontWeight: '800' },

  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleTitle: { ...typography.bodySmall, color: colors.text, fontWeight: '800' },
  toggleSub: { fontSize: 11, color: colors.textLight, marginTop: 1 },

  selectedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  selectedChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1, borderColor: colors.primary,
  },
  selectedAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedAvatarText: { fontSize: 10, color: colors.white, fontWeight: '800' },
  selectedName: { ...typography.bodySmall, color: colors.text, fontWeight: '700', maxWidth: 120 },
  helpText: { ...typography.caption, color: colors.textLight, marginBottom: spacing.md, textTransform: 'none', letterSpacing: 0 },
  openListBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5, borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  openListText: { flex: 1, ...typography.bodySmall, color: colors.primary, fontWeight: '700' },

  field: { marginBottom: spacing.md },
  fieldLabel: {
    ...typography.caption, color: colors.textLight, fontWeight: '700',
    marginBottom: spacing.xs, marginTop: spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md, height: 50,
    borderRadius: borderRadius.md,
  },
  input: { flex: 1, ...typography.body, color: colors.text, paddingVertical: 0 },

  modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  modeBtn: {
    flex: 1, alignItems: 'center', gap: 2,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeTitle: { ...typography.bodySmall, color: colors.text, fontWeight: '800' },
  modePrice: { fontSize: 10, color: colors.textLight, fontWeight: '700', textAlign: 'center' },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5, borderColor: colors.border,
  },
  stepBtnDisabled: { backgroundColor: colors.surfaceAlt, opacity: 0.6 },
  stepValueWrap: { flex: 1, alignItems: 'center' },
  stepValue: { ...typography.h2, color: colors.text, fontWeight: '800' },
  stepUnit: { ...typography.caption, color: colors.textLight, textTransform: 'none', letterSpacing: 0 },

  chargeBox: {
    marginTop: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.md,
  },
  chargeText: { ...typography.bodySmall, color: colors.textLight, fontWeight: '700' },
  chargeStrong: { ...typography.body, color: colors.text, fontWeight: '800' },
  warnText: { ...typography.caption, color: colors.warning, fontWeight: '700', marginTop: spacing.xs, textTransform: 'none', letterSpacing: 0 },

  durRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  durBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5, borderColor: colors.border,
  },
  durBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  durText: { ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  endHint: {
    marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.primarySoft, borderRadius: borderRadius.md,
  },
  endHintText: { ...typography.bodySmall, color: colors.text, flex: 1 },
  conflictBanner: {
    marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.errorSoft, borderRadius: borderRadius.md,
  },
  conflictText: { ...typography.bodySmall, color: colors.error, flex: 1 },

  discTypeRow: { flexDirection: 'row', gap: spacing.sm },
  discTypeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  discTypeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  discTypeText: { ...typography.bodySmall, color: colors.text, fontWeight: '800' },
  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.lg, height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5, borderColor: colors.primary,
  },
  currency: { ...typography.h4, color: colors.primary, fontWeight: '800', marginRight: spacing.sm },
  amountInput: {
    flex: 1, fontSize: 22, fontWeight: '800',
    color: colors.text, paddingVertical: 0,
  },
  descInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.md, minHeight: 70,
    textAlignVertical: 'top',
    ...typography.body, color: colors.text,
  },
  priceBreakdown: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  breakLabel: { ...typography.bodySmall, color: colors.textLight, fontWeight: '700' },
  breakValue: { ...typography.bodySmall, color: colors.text, fontWeight: '800' },
  breakDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },

  footer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  totalBlock: {},
  totalLabel: { fontSize: 10, color: colors.textLight, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { ...typography.h2, color: colors.primary, marginTop: 2 },

  // Member picker modal
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
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: 'transparent',
    marginBottom: spacing.sm,
  },
  memberRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  memberPhoto: { width: 36, height: 36, borderRadius: 18 },
  memberPhotoFallback: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  memberPhotoInit: { ...typography.caption, color: colors.primaryDark, fontWeight: '800' },
  pickerEmpty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  pickerEmptyText: { ...typography.bodySmall, color: colors.textLight, textTransform: 'none', letterSpacing: 0 },
  memberRowName: { ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  memberRowMeta: { ...typography.caption, color: colors.textLight, marginTop: 2, textTransform: 'none', letterSpacing: 0 },
  tick: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  tickActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});

export default BookingFormScreen;
