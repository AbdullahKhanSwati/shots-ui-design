import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, typography, spacing, borderRadius, shadows } from '../styles/theme';

const GradientButton = ({
  label,
  onPress,
  icon,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();

  const palette =
    variant === 'primary'
      ? gradients.brand
      : variant === 'dark'
      ? gradients.cardDark
      : variant === 'wine'
      ? gradients.cardRed
      : gradients.brand;

  const heightFor = { sm: 38, md: 46, lg: 54 }[size] || 54;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPressIn={() => !disabled && animate(0.96)}
        onPressOut={() => animate(1)}
        onPress={() => !disabled && !loading && onPress?.()}
        disabled={disabled || loading}
        style={[styles.wrap, disabled && styles.disabled]}
      >
        <LinearGradient
          colors={palette}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, { height: heightFor }]}
        >
          {icon ? (
            <Ionicons name={icon} size={size === 'sm' ? 16 : 20} color={colors.white} style={{ marginRight: spacing.sm }} />
          ) : null}
          <Text style={[styles.label, size === 'sm' && { fontSize: 13 }]}>
            {loading ? 'Please wait…' : label}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.red,
  },
  btn: {
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.h4,
    color: colors.white,
    letterSpacing: 0.4,
  },
  disabled: {
    opacity: 0.55,
  },
});

export default GradientButton;
