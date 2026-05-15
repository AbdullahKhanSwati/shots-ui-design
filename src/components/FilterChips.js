import React, { useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';

const FilterChips = ({ items, value, onChange, label, compact }) => {
  return (
    <View style={[styles.wrap, compact && { paddingVertical: spacing.xxs }]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map((item) => {
          const isObj = typeof item === 'object' && item !== null;
          const labelText = isObj ? item.label : item;
          const val = isObj ? (item.value ?? item.label) : item;
          const icon = isObj ? item.icon : null;
          const count = isObj ? item.count : null;
          const active = value === val;
          return (
            <Chip
              key={String(val)}
              label={labelText}
              icon={icon}
              count={count}
              active={active}
              onPress={() => onChange(val)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const Chip = ({ label, icon, count, active, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animate(0.94)}
        onPressOut={() => animate(1)}
        style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={13}
            color={active ? colors.white : colors.primary}
            style={{ marginRight: 6 }}
          />
        ) : null}
        <Text style={[styles.text, active ? styles.textActive : styles.textIdle]} numberOfLines={1}>
          {label}
        </Text>
        {count != null ? (
          <View style={[styles.countBubble, active ? styles.countBubbleActive : styles.countBubbleIdle]}>
            <Text style={[styles.countText, active ? { color: colors.primary } : { color: colors.textLight }]}>
              {count}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '700',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  chipIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.redSoft,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  textIdle: { color: colors.text },
  textActive: { color: colors.white },
  countBubble: {
    marginLeft: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBubbleIdle: { backgroundColor: colors.surfaceAlt },
  countBubbleActive: { backgroundColor: colors.white },
  countText: { fontSize: 11, fontWeight: '800' },
});

export default FilterChips;
