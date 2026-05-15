import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { tableFreeIn } from '../data/mockData';

const statusMeta = {
  Available:   { color: colors.success, bg: colors.successSoft, icon: 'checkmark-circle' },
  Occupied:    { color: colors.primary, bg: colors.primarySoft, icon: 'time' },
  Maintenance: { color: colors.warning, bg: colors.warningSoft, icon: 'construct' },
};

const TableCard = ({ table, onPress, delay = 0 }) => {
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

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
        style={styles.card}
      >
        <View style={styles.row}>
          <View style={[styles.numberBubble, { backgroundColor: meta.bg }]}>
            <Text style={[styles.number, { color: meta.color }]}>#{table.number}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.title}>
              {table.type} Table
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color={colors.textLight} />
              <Text style={styles.metaText}>{table.location}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>Rs. {table.memberRate}/{table.nonMemberRate} per hr</Text>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{table.status}</Text>
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
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberBubble: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    ...typography.h3,
    fontWeight: '800',
  },
  title: {
    ...typography.h4,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    ...typography.caption,
    color: colors.textLight,
    marginLeft: 3,
    fontWeight: '500',
    textTransform: 'none',
    letterSpacing: 0,
  },
  metaDot: {
    color: colors.textMuted,
    marginHorizontal: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
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
  bannerText: {
    ...typography.bodySmall,
    color: colors.primaryDarker,
  },
  bannerStrong: {
    fontWeight: '800',
    color: colors.primaryDark,
  },
});

export default TableCard;
