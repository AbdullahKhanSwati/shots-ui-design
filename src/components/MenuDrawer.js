import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, typography, spacing, borderRadius, shadows } from '../styles/theme';

const MenuDrawer = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const groups = [
    {
      title: 'Workspace',
      items: [
        { icon: 'home-outline', label: 'Dashboard', onPress: () => navigation.navigate('MainTabs', { screen: 'Dashboard' }) },
        { icon: 'people-outline', label: 'Memberships', onPress: () => navigation.navigate('MainTabs', { screen: 'Memberships' }) },
        { icon: 'grid-outline', label: 'Bookings', onPress: () => navigation.navigate('MainTabs', { screen: 'Bookings' }) },
        { icon: 'wallet-outline', label: 'Finance', onPress: () => navigation.navigate('MainTabs', { screen: 'Finance' }) },
      ],
    },
    {
      title: 'Quick Actions',
      items: [
        { icon: 'cash-outline', label: 'Add Expense', onPress: () => navigation.getParent()?.navigate('AddExpense') },
      ],
    },
    {
      title: 'Settings',
      items: [

        {
          icon: 'log-out-outline', label: 'Logout', danger: true, onPress: () =>
            navigation.getParent()?.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] })
        },
      ],
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={gradients.cardDark} style={styles.header}>
        <View style={styles.glow} />
        <View style={styles.brandRow}>
          <LinearGradient colors={gradients.brand} style={styles.brandLogo}>
            <Ionicons name="game-controller" size={22} color={colors.white} />
          </LinearGradient>
          <View>
            <Text style={styles.brandName}>SHOTS</Text>
            <Text style={styles.brandTag}>Staff Console</Text>
          </View>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>S</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>Active Staff</Text>
            <Text style={styles.profileMeta}>staff@shots.com</Text>
          </View>
          <View style={styles.online}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 100 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {groups.map((g) => (
          <View key={g.title} style={{ marginTop: spacing.lg }}>
            <Text style={styles.groupTitle}>{g.title}</Text>
            {g.items.map((it) => (
              <DrawerItem key={it.label} item={it} onPress={() => { navigation.closeDrawer(); it.onPress?.(); }} />
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Text style={styles.version}>v1.0.0 · 2026 Shots</Text>
      </View>
    </View>
  );
};

const DrawerItem = ({ item, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
  >
    <View style={[styles.itemIcon, item.danger && { backgroundColor: colors.errorSoft }]}>
      <Ionicons name={item.icon} size={18} color={item.danger ? colors.error : colors.primary} />
    </View>
    <Text style={[styles.itemText, item.danger && { color: colors.error }]}>{item.label}</Text>
    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
  </Pressable>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -60, right: -40,
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(229,62,62,0.25)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  brandLogo: {
    width: 40, height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.redSoft,
  },
  brandName: { ...typography.h3, color: colors.white, letterSpacing: 3 },
  brandTag: { ...typography.caption, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.h4, color: colors.white },
  profileName: { ...typography.bodySmall, color: colors.white, fontWeight: '700' },
  profileMeta: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  online: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(16,185,129,0.18)',
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  onlineText: { fontSize: 10, color: colors.success, fontWeight: '700' },
  list: { flex: 1, paddingHorizontal: spacing.md },
  groupTitle: {
    ...typography.label,
    color: colors.textLight,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  itemPressed: { backgroundColor: colors.primarySoft },
  itemIcon: {
    width: 36, height: 36, borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  itemText: { flex: 1, ...typography.body, color: colors.text, fontWeight: '600' },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  version: { ...typography.caption, color: colors.textMuted },
});

export default MenuDrawer;
