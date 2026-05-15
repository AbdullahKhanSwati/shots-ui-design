import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { mockMemberships, mockBookings, membershipDurations } from '../data/mockData';
import MembershipVirtualCard from '../components/MembershipVirtualCard';
import ScreenHeader from '../components/ScreenHeader';
import GradientButton from '../components/GradientButton';

const MemberDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const id = route.params?.memberId;
  const member = mockMemberships.find((m) => m.id === id) || mockMemberships[0];
  const visits = mockBookings.filter((b) => b.memberId === member.id);

  const [renewOpen, setRenewOpen] = useState(false);
  const [renewDuration, setRenewDuration] = useState(membershipDurations[3]);
  const [renewPrice, setRenewPrice] = useState('');

  const confirmRenew = () => {
    Alert.alert(
      'Renew membership?',
      `This will extend ${member.name}'s membership by ${renewDuration.label}. Make sure this is correct before continuing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Renewal',
          style: 'default',
          onPress: () => {
            const priceMsg = renewPrice
              ? ` Rs. ${Number(renewPrice).toLocaleString()} added to revenue.`
              : '';
            Alert.alert('Renewed', `${member.name}'s membership renewed for ${renewDuration.label}.${priceMsg}`);
            setRenewOpen(false);
            setRenewPrice('');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={member.name}
        subtitle={member.id}
        onBack={() => navigation.goBack()}
        variant="gradient"
        rightIcon="ellipsis-horizontal"
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardWrap}>
          <MembershipVirtualCard member={member} />
        </View>

        <View style={styles.statRow}>
          <QuickStat icon="time" label="Visits" value={visits.length} />
          <QuickStat icon="cash" label="Spent" value={`Rs. ${visits.reduce((s, v) => s + v.amount, 0).toLocaleString()}`} />
          <QuickStat icon="calendar" label="Since" value={new Date(member.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <InfoRow icon="card" label="CNIC" value={member.idCardNumber} />
          <InfoRow icon="mail" label="Email" value={member.email || '—'} />
          <InfoRow icon="call" label="Phone" value={member.phone} />
          <InfoRow icon="calendar-outline" label="Joined" value={member.joinDate} />
          <InfoRow icon="time-outline" label="Expires" value={member.expiryDate} isLast />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Visits</Text>
          {visits.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>No visits yet</Text>
            </View>
          ) : (
            visits.map((v) => (
              <View key={v.id} style={styles.visitRow}>
                <View style={styles.visitBubble}>
                  <Text style={styles.visitBubbleText}>T{v.tableNumber}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.visitTitle}>Table #{v.tableNumber}</Text>
                  <Text style={styles.visitMeta}>{v.date} · {v.start} → {v.end}</Text>
                </View>
                <Text style={styles.visitAmt}>Rs. {v.amount}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => Alert.alert('Suspended', `${member.name} suspended.`)}
        >
          <Ionicons name="pause-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.outlineBtnText}>Suspend</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <GradientButton
            label="Renew Membership"
            icon="refresh"
            onPress={() => setRenewOpen(true)}
          />
        </View>
      </View>

      {/* Renew sheet */}
      <Modal visible={renewOpen} transparent animationType="slide" onRequestClose={() => setRenewOpen(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.md }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHead}>
                <View>
                  <Text style={styles.modalTitle}>Renew Membership</Text>
                  <Text style={styles.modalSub}>{member.name} · {member.id}</Text>
                </View>
                <TouchableOpacity onPress={() => setRenewOpen(false)} hitSlop={10}>
                  <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.warnBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.warning} />
                <Text style={styles.warnText}>You'll be asked to confirm before the renewal is applied.</Text>
              </View>

              <Text style={styles.fieldLabel}>Extend by</Text>
              <View style={styles.durationRow}>
                {membershipDurations.map((d) => (
                  <Pressable
                    key={d.label}
                    onPress={() => setRenewDuration(d)}
                    style={[styles.duration, renewDuration.label === d.label && styles.durationActive]}
                  >
                    <Text style={[styles.durationText, renewDuration.label === d.label && { color: colors.white }]}>
                      {d.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Renewal Price (optional)</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currency}>Rs.</Text>
                <TextInput
                  value={renewPrice}
                  onChangeText={setRenewPrice}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.amountInput}
                />
              </View>
              <Text style={styles.fieldHint}>Added to today's revenue.</Text>

              <View style={{ marginTop: spacing.lg }}>
                <GradientButton label="Continue" icon="arrow-forward" onPress={confirmRenew} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const QuickStat = ({ icon, label, value }) => (
  <View style={styles.qs}>
    <View style={styles.qsIcon}>
      <Ionicons name={icon} size={16} color={colors.primary} />
    </View>
    <Text style={styles.qsValue} numberOfLines={1}>{value}</Text>
    <Text style={styles.qsLabel}>{label}</Text>
  </View>
);

const InfoRow = ({ icon, label, value, isLast }) => (
  <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={14} color={colors.primary} />
    </View>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },
  cardWrap: { marginBottom: spacing.lg },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  qs: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  qsIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  qsValue: { ...typography.h4, color: colors.text },
  qsLabel: { ...typography.caption, color: colors.textLight, marginTop: 2 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { ...typography.bodySmall, color: colors.textLight, width: 80 },
  infoValue: { flex: 1, ...typography.bodySmall, color: colors.text, fontWeight: '700', textAlign: 'right' },
  empty: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textLight },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  visitBubble: {
    width: 36, height: 36, borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  visitBubbleText: { ...typography.caption, color: colors.primaryDark, fontWeight: '800' },
  visitTitle: { ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  visitMeta: { ...typography.caption, color: colors.textLight, marginTop: 2, textTransform: 'none', letterSpacing: 0 },
  visitAmt: { ...typography.bodySmall, color: colors.text, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  outlineBtnText: { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.divider,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.h3, color: colors.text },
  modalSub: { ...typography.bodySmall, color: colors.textLight, marginTop: 2 },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  warnText: { flex: 1, ...typography.caption, color: colors.text, textTransform: 'none', letterSpacing: 0 },
  fieldLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  duration: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  durationActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  durationText: { ...typography.bodySmall, color: colors.text, fontWeight: '600' },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.lg,
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  currency: { ...typography.h4, color: colors.primary, fontWeight: '800', marginRight: spacing.sm },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    paddingVertical: 0,
  },
  fieldHint: { ...typography.caption, color: colors.textMuted, textTransform: 'none', letterSpacing: 0, marginTop: 4 },
});

export default MemberDetailScreen;
