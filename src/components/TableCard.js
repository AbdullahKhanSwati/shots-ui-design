import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { tableFreeIn } from '../data/mockData';
import { priceSummary } from '../data/pricing';

const statusMeta = {
  Available:   { color: colors.success, bg: colors.successSoft, icon: 'checkmark-circle' },
  Occupied:    { color: colors.primary, bg: colors.primarySoft, icon: 'time' },
  Maintenance: { color: colors.warning, bg: colors.warningSoft, icon: 'construct' },
};

const TableCard = ({ table, onPress, delay = 0, pricingRules = [] }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, speed: 14 }),
    ]).start();
  }, [opacity, translateY, delay]);

  const meta = statusMeta[table.status] || statusMeta.Available;
  const freeIn = tableFreeIn(table);
  // Prices come from the type's pricing rules; fall back to the table's own
  // hourly rates for any type the admin hasn't priced yet.
  const summary = priceSummary(pricingRules, table.type, true);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
        style={styles.card}
      >
        {/* Status pill anchored top-right so it never overlaps meta text */}
        <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={11} color={meta.color} />
          <Text style={[styles.statusText, { color: meta.color }]}>{table.status}</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.numberBubble, { backgroundColor: meta.bg }]}>
            <Text style={[styles.number, { color: meta.color }]}>#{table.number}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.title}>{table.type} Table</Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color={colors.textLight} />
              <Text style={styles.metaText} numberOfLines={1}>{table.location}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="pricetag-outline" size={12} color={colors.textLight} />
              {summary ? (
                <Text style={styles.metaText} numberOfLines={2}>{summary}</Text>
              ) : (
                <Text style={styles.metaText}>
                  Rs. {table.memberRate} / {table.nonMemberRate}{' '}
                  <Text style={styles.metaSub}>member / non-member</Text>
                </Text>
              )}
            </View>
          </View>
        </View>

        {table.status === 'Occupied' && freeIn ? (
          <View style={styles.banner}>
            <Ionicons name="hourglass-outline" size={14} color={colors.primaryDark} />
            <Text style={styles.bannerText}>
              Free in <Text style={styles.bannerStrong}>{freeIn}</Text>
              {table.occupiedBy ? `  •  ${table.occupiedBy}` : ''}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingTop: spacing.lg + 8, // leave room for the absolute status pill
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  numberBubble: {
    width: 48, height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  number: { ...typography.h3, fontWeight: '800' },
  infoCol: { flex: 1, marginLeft: spacing.md, paddingRight: 90 /* reserve for status pill */ },
  title: { ...typography.h4, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  metaText: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '600',
    textTransform: 'none',
    letterSpacing: 0,
  },
  metaSub: { color: colors.textMuted, fontWeight: '500' },
  statusPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  statusText: { ...typography.caption, fontWeight: '700' },
  banner: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  bannerText: { ...typography.bodySmall, color: colors.primaryDarker },
  bannerStrong: { fontWeight: '800', color: colors.primaryDark },
});

export default TableCard;
