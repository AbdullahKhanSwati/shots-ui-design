import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, gradients, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { mockBusinesses } from '../data/mockData';
import GradientButton from '../components/GradientButton';

const BusinessSelectionScreen = ({ navigation }) => {
  const [selected, setSelected] = useState(mockBusinesses[0]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.brandSoft} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <LinearGradient colors={gradients.brand} style={styles.brandLogo}>
              <Ionicons name="business" size={20} color={colors.white} />
            </LinearGradient>
            <Text style={styles.brandText}>Choose Workspace</Text>
          </View>
          <Text style={styles.title}>Hello, Staff 👋</Text>
          <Text style={styles.subtitle}>Select the business you want to manage today.</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {mockBusinesses.map((business, i) => (
            <BusinessCard
              key={business.id}
              business={business}
              selected={selected?.id === business.id}
              onPress={() => setSelected(business)}
              delay={i * 80}
            />
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <GradientButton
            label={`Continue as Shots Staff`}
            icon="arrow-forward"
            onPress={() => navigation.replace('Login', { business: selected })}
            disabled={!selected}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

const BusinessCard = ({ business, selected, onPress, delay }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 360, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, speed: 14 }),
    ]).start();
  }, [opacity, translateY, delay]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
        style={[styles.card, selected && styles.cardSelected]}
      >
        <View style={[styles.logoBox, { backgroundColor: business.color + '22' }]}>
          <Text style={styles.logoEmoji}>{business.logo}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{business.name}</Text>
            <View style={[styles.tag, { backgroundColor: business.color + '20' }]}>
              <Text style={[styles.tagText, { color: business.color }]}>{business.tag}</Text>
            </View>
          </View>
          <Text style={styles.type}>{business.type}</Text>
        </View>
        <View style={[styles.radio, selected && styles.radioActive]}>
          {selected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  brandLogo: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: { ...typography.h1, color: colors.text },
  subtitle: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    ...shadows.redSoft,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 28 },
  info: { flex: 1, marginLeft: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.h4, color: colors.text },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  type: { ...typography.caption, color: colors.textLight, marginTop: 4, textTransform: 'none', letterSpacing: 0 },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
});

export default BusinessSelectionScreen;
