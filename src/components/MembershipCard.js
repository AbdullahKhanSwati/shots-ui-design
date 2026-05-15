import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';

const tierIcon = {
  Premium: 'diamond',
  Standard: 'star',
  Basic: 'ribbon',
};

const MembershipCard = ({ member, onPress, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, delay, useNativeDriver: true, speed: 14 }),
    ]).start();
  }, [opacity, translateX, delay]);

  const isActive = member.status === 'Active';

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }, { scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
        style={styles.card}
      >
        <View style={[styles.avatar, { backgroundColor: isActive ? colors.primarySoft : colors.errorSoft }]}>
          <Ionicons name={tierIcon[member.type] || 'card'} size={20} color={isActive ? colors.primary : colors.error} />
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{member.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaId}>{member.id}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaType}>{member.type}</Text>
          </View>
          <Text style={styles.expires}>
            Expires {formatDate(member.expiryDate)}
          </Text>
        </View>

        <View style={[styles.pill, { backgroundColor: isActive ? colors.successSoft : colors.errorSoft }]}>
          <View style={[styles.dot, { backgroundColor: isActive ? colors.success : colors.error }]} />
          <Text style={[styles.pillText, { color: isActive ? colors.success : colors.error }]}>
            {member.status}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    ...typography.h4,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaId: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaDot: {
    color: colors.textMuted,
    marginHorizontal: 6,
  },
  metaType: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '600',
  },
  expires: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
    textTransform: 'none',
    letterSpacing: 0,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    ...typography.caption,
    fontWeight: '700',
  },
});

export default MembershipCard;
