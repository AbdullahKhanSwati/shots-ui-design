import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { colors, gradients, typography, spacing, borderRadius, shadows } from '../styles/theme';

// Virtual bank-style membership card with QR + photo
const MembershipVirtualCard = ({ member, compact }) => {
  if (!member) return null;
  const tierIcon = {
    Premium: 'diamond',
    Standard: 'star',
    Basic: 'ribbon',
  }[member.type] || 'card';

  const qrPayload = JSON.stringify({
    id: member.id,
    name: member.name,
    type: member.type,
    cnic: member.idCardNumber,
    exp: member.expiryDate,
  });

  const initials = (member.name || '?')
    .split(' ').filter(Boolean).map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={[styles.shadowWrap, compact && styles.shadowWrapCompact]}>
      <LinearGradient
        colors={gradients.membershipCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, compact && styles.cardCompact]}
      >
        <View style={[styles.glow, styles.glowTopRight]} />
        <View style={[styles.glow, styles.glowBottomLeft]} />

        {/* Top row */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>SHOTS</Text>
            <Text style={styles.brandSub}>Members Club</Text>
          </View>
          <View style={styles.tierBadge}>
            <Ionicons name={tierIcon} size={12} color={colors.gold} />
            <Text style={styles.tierText}>{member.type}</Text>
          </View>
        </View>

        {/* Middle: photo + info + QR */}
        <View style={styles.middleRow}>
          <View style={styles.photoWrap}>
            {member.photo ? (
              <Image source={typeof member.photo === 'string' ? { uri: member.photo } : member.photo} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoFallback]}>
                <Text style={styles.photoInitials}>{initials}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoCol}>
            <Text style={styles.fieldLabel}>Member</Text>
            <Text style={styles.fieldValueLg} numberOfLines={2}>
              {(member.name || '').toUpperCase()}
            </Text>

            <View style={styles.metaRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>ID No.</Text>
                <Text style={styles.fieldValue}>{member.id}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Valid Thru</Text>
                <Text style={styles.fieldValue}>{formatExpiry(member.expiryDate)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.qrWrap}>
            <View style={styles.qrInner}>
              <QRCode
                value={qrPayload}
                size={compact ? 56 : 70}
                color={colors.black}
                backgroundColor={colors.white}
              />
            </View>
            <Text style={styles.qrLabel}>SCAN</Text>
          </View>
        </View>

        {/* Bottom: CNIC + status */}
        <View style={styles.bottomRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>CNIC</Text>
            <Text style={styles.fieldValue}>{member.idCardNumber || '—'}</Text>
          </View>
          <View style={styles.statusGroup}>
            <View style={[styles.statusDot, { backgroundColor: member.status === 'Active' ? colors.success : colors.error }]} />
            <Text style={styles.statusText}>{member.status}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

function formatExpiry(date) {
  if (!date) return '--/--';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '--/--';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
}

const styles = StyleSheet.create({
  shadowWrap: { borderRadius: borderRadius.xl, ...shadows.lg },
  shadowWrapCompact: { ...shadows.md },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    minHeight: 210,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardCompact: { minHeight: 190, padding: spacing.md + 2 },
  glow: {
    position: 'absolute',
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#E53E3E', opacity: 0.18,
  },
  glowTopRight: { top: -100, right: -90 },
  glowBottomLeft: { bottom: -120, left: -100, backgroundColor: '#7F1318', opacity: 0.4 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  brand: {
    ...typography.h3,
    color: colors.white,
    letterSpacing: 3,
    fontWeight: '900',
  },
  brandSub: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(244, 184, 96, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(244, 184, 96, 0.4)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  tierText: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '700',
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  photoWrap: { },
  photo: {
    width: 64, height: 64,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  photoFallback: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitials: {
    ...typography.h2,
    color: colors.white,
    fontWeight: '900',
  },
  infoCol: { flex: 1 },
  fieldLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fieldValueLg: {
    ...typography.h4,
    color: colors.white,
    letterSpacing: 0.3,
  },
  fieldValue: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  qrWrap: {
    alignItems: 'center',
  },
  qrInner: {
    padding: 4,
    backgroundColor: colors.white,
    borderRadius: 6,
  },
  qrLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    letterSpacing: 2,
    fontWeight: '800',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  statusDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  statusText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
});

export default MembershipVirtualCard;
