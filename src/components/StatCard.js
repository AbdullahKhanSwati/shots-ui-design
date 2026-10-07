import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { useColumns, cellWidth } from '../lib/responsive';

const StatCard = ({ label, value, icon, color = colors.primary, trend, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  // 2 across on a phone (unchanged), 3-4 on a tablet or in landscape, and a
  // single full-width card on very narrow screens so the figures stay readable.
  const columns = useColumns({ min: 150, max: 4 });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, speed: 14, bounciness: 6 }),
    ]).start();
  }, [opacity, translateY, delay]);

  return (
    <Animated.View style={[styles.card, { width: cellWidth(columns), opacity, transform: [{ translateY }] }]}>
      <View style={[styles.iconBubble, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {trend ? (
        <View style={[styles.trend, { backgroundColor: trend.positive ? colors.successSoft : colors.errorSoft }]}>
          <Ionicons
            name={trend.positive ? 'trending-up' : 'trending-down'}
            size={12}
            color={trend.positive ? colors.success : colors.error}
          />
          <Text style={[styles.trendText, { color: trend.positive ? colors.success : colors.error }]}>
            {trend.label}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    // width comes from the column count above (48% on a phone).
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  value: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textLight,
    textTransform: 'uppercase',
  },
  trend: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

export default StatCard;
