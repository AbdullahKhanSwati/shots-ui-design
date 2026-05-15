import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, typography, spacing, borderRadius, shadows } from '../styles/theme';

const ScreenHeader = ({
  title,
  subtitle,
  onBack,
  onMenu,
  rightIcon,
  onRight,
  variant = 'light', // 'light' | 'dark' | 'gradient'
}) => {
  const insets = useSafeAreaInsets();
  const topPad = insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20);

  if (variant === 'gradient' || variant === 'dark') {
    const palette = variant === 'gradient' ? gradients.brand : gradients.cardDark;
    return (
      <LinearGradient colors={palette} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.dark, { paddingTop: topPad + spacing.sm }]}>
        <View style={styles.row}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={[styles.iconBtn, styles.iconBtnDark]} hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color={colors.white} />
            </TouchableOpacity>
          ) : onMenu ? (
            <TouchableOpacity onPress={onMenu} style={[styles.iconBtn, styles.iconBtnDark]} hitSlop={10}>
              <Ionicons name="menu" size={20} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.titleDark} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitleDark} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
          {rightIcon ? (
            <TouchableOpacity onPress={onRight} style={[styles.iconBtn, styles.iconBtnDark]} hitSlop={10}>
              <Ionicons name={rightIcon} size={20} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.light, { paddingTop: topPad + spacing.sm }]}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
        ) : onMenu ? (
          <TouchableOpacity onPress={onMenu} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="menu" size={20} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {rightIcon ? (
          <TouchableOpacity onPress={onRight} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name={rightIcon} size={20} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  light: {
    backgroundColor: colors.background,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dark: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
    ...shadows.redSoft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: 2,
    textTransform: 'none',
    letterSpacing: 0,
  },
  titleDark: {
    ...typography.h3,
    color: colors.white,
  },
  subtitleDark: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    textTransform: 'none',
    letterSpacing: 0,
  },
});

export default ScreenHeader;
