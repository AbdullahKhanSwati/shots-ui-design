import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { getMTDFinance, dateKey } from '../data/mockData';
import { useShots } from '../store/ShotsStore';
import StatCard from '../components/StatCard';

const DashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { bookings, finance, members } = useShots();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fade]);

  const todayDate = new Date();
  const todayLabel = todayDate.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const monthLabel = todayDate.toLocaleDateString('en-US', { month: 'long' });

  // Today's calculations
  const todayKey = dateKey(todayDate);
  const todayBookings = bookings.filter((b) => b.date === todayKey).length;
  const todayRevenue = bookings
    .filter((b) => b.date === todayKey)
    .reduce((s, b) => s + (b.amount || 0), 0);

  // Month-to-date calculations
  const mtd = useMemo(() => getMTDFinance(finance, todayDate), [finance]);
  const mtdRevenue = mtd.filter((f) => f.type === 'In').reduce((s, f) => s + (f.amount || 0), 0);
  const mtdExpenses = mtd.filter((f) => f.type === 'Out').reduce((s, f) => s + (f.amount || 0), 0);
  const mtdNet = mtdRevenue - mtdExpenses;
  const activeMembers = members.filter((m) => m.status === 'Active').length;

  return (
    <View style={styles.root}>
      {/* Hero */}
      <LinearGradient colors={gradients.brand} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.heroDecor1} />
        <View style={styles.heroDecor2} />
        <View style={styles.heroTop}>
          <TouchableOpacity
            onPress={() => navigation.openDrawer?.()}
            style={styles.iconBtnGlass}
            hitSlop={10}
          >
            <Ionicons name="menu" size={20} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.heroBrand}>SHOTS</Text>
          </View>
          <TouchableOpacity style={styles.iconBtnGlass} hitSlop={10}>
            <Ionicons name="notifications-outline" size={18} color={colors.white} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        <Animated.View style={{ opacity: fade }}>
          <Text style={styles.greeting}>Good day, Staff 👋</Text>
          <Text style={styles.greetingDate}>{todayLabel}</Text>

          <View style={styles.heroStatsRow}>
            <HeroStat label="Today's Revenue" value={`Rs. ${todayRevenue.toLocaleString()}`} />
            <View style={styles.divider} />
            <HeroStat label="Bookings Today" value={todayBookings} />
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick actions — same order as the side drawer (Members, Bookings, Finance, Add Expense) */}
        <View style={styles.quickRow}>
          <QuickAction
            icon="people"
            label="Members"
            colorFrom="#E53E3E"
            colorTo="#B91C2C"
            onPress={() => navigation.navigate('Members')}
          />
          <QuickAction
            icon="grid"
            label="Bookings"
            colorFrom="#1A1A1A"
            colorTo="#3B0A0A"
            onPress={() => navigation.navigate('Bookings')}
          />
          <QuickAction
            icon="wallet"
            label="Finance"
            colorFrom="#FF6B6B"
            colorTo="#E53E3E"
            onPress={() => navigation.navigate('Finance')}
          />
          <QuickAction
            icon="receipt"
            label="Add Expense"
            colorFrom="#F4B860"
            colorTo="#B47A2B"
            onPress={() => navigation.navigate('Expense')}
          />
        </View>

        {/* Overview — Month-to-date */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.mtdPill}>
              <Ionicons name="calendar-outline" size={11} color={colors.primaryDark} />
              <Text style={styles.mtdPillText}>{monthLabel} · to date</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              label="MTD Revenue"
              value={`Rs. ${mtdRevenue.toLocaleString()}`}
              icon="trending-up"
              color={colors.success}
              delay={0}
            />
            <StatCard
              label="MTD Expenses"
              value={`Rs. ${mtdExpenses.toLocaleString()}`}
              icon="trending-down"
              color={colors.error}
              delay={80}
            />
            <StatCard
              label="MTD Net Profit"
              value={`Rs. ${mtdNet.toLocaleString()}`}
              icon="cash"
              color={mtdNet >= 0 ? colors.success : colors.error}
              delay={160}
            />
            <StatCard
              label="Active Members"
              value={activeMembers}
              icon="people"
              color={colors.primary}
              delay={240}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const HeroStat = ({ label, value }) => (
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text style={styles.heroStatVal}>{value}</Text>
    <Text style={styles.heroStatLab}>{label}</Text>
  </View>
);

const QuickAction = ({ icon, label, colorFrom, colorTo, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 40 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
      style={{ flex: 1 }}
    >
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        <LinearGradient colors={[colorFrom, colorTo]} style={styles.quickIcon}>
          <Ionicons name={icon} size={22} color={colors.white} />
        </LinearGradient>
        <Text style={styles.quickLabel} numberOfLines={1}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    ...shadows.redSoft,
  },
  heroDecor1: { position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroDecor2: { position: 'absolute', bottom: -40, left: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  iconBtnGlass: {
    width: 38, height: 38, borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: 8, right: 9,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.gold,
    borderWidth: 1.5, borderColor: colors.primary,
  },
  heroBrand: { ...typography.h3, color: colors.white, letterSpacing: 4, fontWeight: '900' },
  greeting: { ...typography.h1, color: colors.white },
  greetingDate: { ...typography.bodySmall, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  heroStatsRow: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.18)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroStatVal: { ...typography.h4, color: colors.white },
  heroStatLab: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2, letterSpacing: 0.5 },
  scrollContent: { paddingTop: spacing.lg },
  quickRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm },
  quickIcon: {
    width: 52, height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.md,
  },
  quickLabel: {
    ...typography.caption, color: colors.text, marginTop: spacing.sm,
    fontWeight: '700', textTransform: 'none', letterSpacing: 0,
  },
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h4, color: colors.text },
  mtdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mtdPillText: { ...typography.caption, color: colors.primaryDark, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});

export default DashboardScreen;
