import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { mockMemberships } from '../data/mockData';
import MembershipCard from '../components/MembershipCard';
import SearchBar from '../components/SearchBar';
import FilterChips from '../components/FilterChips';

const buildFilters = (members) => [
  { value: 'All', label: 'All', icon: 'apps', count: members.length },
  { value: 'Active', label: 'Active', icon: 'checkmark-circle', count: members.filter((m) => m.status === 'Active').length },
  { value: 'Expired', label: 'Expired', icon: 'time', count: members.filter((m) => m.status === 'Expired').length },
  { value: 'Premium', label: 'Premium', icon: 'diamond' },
  { value: 'Standard', label: 'Standard', icon: 'star' },
  { value: 'Basic', label: 'Basic', icon: 'ribbon' },
];

const MembershipsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  const list = useMemo(() => {
    return mockMemberships.filter((m) => {
      const q = query.trim().toLowerCase();
      const matchQ =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.phone?.toLowerCase().includes(q);
      const matchF =
        filter === 'All' ||
        m.status === filter ||
        m.type === filter;
      return matchQ && matchF;
    });
  }, [query, filter]);

  const activeCount = mockMemberships.filter((m) => m.status === 'Active').length;
  const expiredCount = mockMemberships.filter((m) => m.status === 'Expired').length;

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.brand} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.heroTop}>
          <TouchableOpacity onPress={() => navigation.openDrawer?.()} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="menu" size={20} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Memberships</Text>
          <TouchableOpacity style={styles.iconBtn} hitSlop={10} onPress={() => navigation.navigate('AddMember')}>
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <HeroPill label="Total" value={mockMemberships.length} icon="people" />
          <HeroPill label="Active" value={activeCount} icon="checkmark-circle" />
          <HeroPill label="Expired" value={expiredCount} icon="time" />
        </View>
      </LinearGradient>

      <View style={styles.controls}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search by name, ID or phone…" />
      </View>

      <FilterChips items={buildFilters(mockMemberships)} value={filter} onChange={setFilter} />

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: 90 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <MembershipCard
            member={item}
            delay={index * 60}
            onPress={() => navigation.navigate('MemberDetail', { memberId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No members match your filters</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('AddMember')}
      >
        <LinearGradient colors={gradients.brand} style={styles.fabGrad}>
          <Ionicons name="person-add" size={22} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const HeroPill = ({ label, value, icon }) => (
  <View style={styles.heroPill}>
    <View style={styles.heroPillIcon}>
      <Ionicons name={icon} size={14} color={colors.white} />
    </View>
    <View>
      <Text style={styles.heroPillValue}>{value}</Text>
      <Text style={styles.heroPillLabel}>{label}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    ...shadows.redSoft,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: {
    ...typography.h3,
    color: colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroPillIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroPillValue: { ...typography.h4, color: colors.white },
  heroPillLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  controls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.bodySmall, color: colors.textLight },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 58, height: 58,
    borderRadius: 29,
    ...shadows.red,
  },
  fabGrad: {
    width: '100%', height: '100%',
    borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
  },
});

export default MembershipsScreen;
