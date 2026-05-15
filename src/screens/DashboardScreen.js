import React, { useEffect, useRef } from 'react';
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
import { mockStats, mockTables, mockBookings, tableFreeIn } from '../data/mockData';
import StatCard from '../components/StatCard';
import TableCard from '../components/TableCard';

const DashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fade]);

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const activeBookings = mockBookings.filter((b) => b.status === 'Active');

  return (
    <View style={styles.root}>
      {/* Animated gradient hero */}
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
          <Text style={styles.greetingDate}>{todayDate}</Text>

          <View style={styles.heroStatsRow}>
            <HeroStat label="Today's Revenue" value={`Rs. ${mockStats.todayRevenue.toLocaleString()}`} />
            <View style={styles.divider} />
            <HeroStat label="Bookings" value={mockStats.todayBookings} />
            <View style={styles.divider} />
            <HeroStat label="Available" value={`${mockStats.availableTables}/${mockTables.length}`} />
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction
            icon="calendar"
            label="Book Table"
            colorFrom="#1A1A1A"
            colorTo="#3B0A0A"
            onPress={() => navigation.navigate('Tables')}
          />
          <QuickAction
            icon="cash"
            label="Add Expense"
            colorFrom="#F4B860"
            colorTo="#B47A2B"
            onPress={() => navigation.navigate('AddExpense')}
          />
          <QuickAction
            icon="people"
            label="Members"
            colorFrom="#E53E3E"
            colorTo="#B91C2C"
            onPress={() => navigation.navigate('Memberships')}
          />
          <QuickAction
            icon="wallet"
            label="Finance"
            colorFrom="#FF6B6B"
            colorTo="#E53E3E"
            onPress={() => navigation.navigate('Finance')}
          />
        </View>

        {/* Stat grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              label="Total Revenue"
              value={`Rs. ${mockStats.totalRevenue.toLocaleString()}`}
              icon="trending-up"
              color={colors.success}
              trend={{ positive: true, label: '+12%' }}
              delay={0}
            />
            <StatCard
              label="Expenses"
              value={`Rs. ${mockStats.totalExpenses.toLocaleString()}`}
              icon="trending-down"
              color={colors.error}
              trend={{ positive: false, label: '-3%' }}
              delay={80}
            />
            <StatCard
              label="Active Members"
              value={mockStats.activeMembers}
              icon="people"
              color={colors.primary}
              delay={160}
            />
            <StatCard
              label="Repairs Pending"
              value={mockStats.maintenanceTables}
              icon="construct"
              color={colors.warning}
              delay={240}
            />
          </View>
        </View>

        {/* Active bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Active Bookings</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tables')}>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>

          {activeBookings.map((b, i) => (
            <BookingRow key={b.id} booking={b} delay={i * 80} />
          ))}
        </View>

        {/* Live tables */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Live Tables</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tables')}>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>
          {mockTables.slice(0, 3).map((t, i) => (
            <TableCard
              key={t.id}
              table={t}
              delay={i * 80}
              onPress={() => navigation.navigate('TableDetail', { tableId: t.id })}
            />
          ))}
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
        <Text style={styles.quickLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

const BookingRow = ({ booking, delay }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, delay, useNativeDriver: true, speed: 14 }),
    ]).start();
  }, [opacity, translateX, delay]);

  return (
    <Animated.View style={[styles.booking, { opacity, transform: [{ translateX }] }]}>
      <View style={styles.bookingNum}>
        <Text style={styles.bookingNumText}>T{booking.tableNumber}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={styles.bookingName}>{booking.memberName}</Text>
        <View style={styles.bookingMeta}>
          <Ionicons name="time-outline" size={11} color={colors.textLight} />
          <Text style={styles.bookingTime}>{booking.start} → {booking.end}</Text>
        </View>
      </View>
      <View style={styles.bookingAmount}>
        <Text style={styles.bookingAmountText}>Rs. {booking.amount}</Text>
        <Text style={styles.bookingStatus}>Active</Text>
      </View>
    </Animated.View>
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
  heroDecor1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroDecor2: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconBtnGlass: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  heroBrand: {
    ...typography.h3,
    color: colors.white,
    letterSpacing: 4,
    fontWeight: '900',
  },
  greeting: {
    ...typography.h1,
    color: colors.white,
  },
  greetingDate: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  heroStatsRow: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.18)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroStatVal: {
    ...typography.h4,
    color: colors.white,
  },
  heroStatLab: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingTop: spacing.lg,
  },
  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  quickLabel: {
    ...typography.caption,
    color: colors.text,
    marginTop: spacing.sm,
    fontWeight: '700',
    textTransform: 'none',
    letterSpacing: 0,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  viewAll: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  booking: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.xs,
  },
  bookingNum: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingNumText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 13,
  },
  bookingName: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '700',
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  bookingTime: {
    ...typography.caption,
    color: colors.textLight,
    textTransform: 'none',
    letterSpacing: 0,
  },
  bookingAmount: {
    alignItems: 'flex-end',
  },
  bookingAmountText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '800',
  },
  bookingStatus: {
    fontSize: 10,
    color: colors.success,
    marginTop: 2,
    fontWeight: '700',
  },
});

export default DashboardScreen;
