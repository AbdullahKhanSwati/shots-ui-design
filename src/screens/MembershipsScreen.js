import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { useShots } from '../store/ShotsStore';
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
  const { members } = useShots();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [scanOpen, setScanOpen] = useState(false);

  const list = useMemo(() => {
    return members.filter((m) => {
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
  }, [members, query, filter]);

  const activeCount = members.filter((m) => m.status === 'Active').length;
  const expiredCount = members.filter((m) => m.status === 'Expired').length;

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.brand} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.heroTop}>
          <TouchableOpacity onPress={() => navigation.openDrawer?.()} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="menu" size={20} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Memberships</Text>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.iconBtn} hitSlop={10} onPress={() => setScanOpen(true)}>
              <Ionicons name="scan-outline" size={20} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} hitSlop={10} onPress={() => navigation.navigate('AddMember')}>
              <Ionicons name="add" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <HeroPill label="Total" value={members.length} icon="people" />
          <HeroPill label="Active" value={activeCount} icon="checkmark-circle" />
          <HeroPill label="Expired" value={expiredCount} icon="time" />
        </View>
      </LinearGradient>

      <View style={styles.controls}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search by name, ID or phone…" />
      </View>

      <FilterChips items={buildFilters(members)} value={filter} onChange={setFilter} />

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

      {/* Scan QR — placeholder; camera wiring requires expo-camera */}
      <Modal visible={scanOpen} transparent animationType="fade" onRequestClose={() => setScanOpen(false)}>
        <View style={styles.scanOverlay}>
          <View style={styles.scanCard}>
            <TouchableOpacity onPress={() => setScanOpen(false)} hitSlop={10} style={styles.scanClose}>
              <Ionicons name="close" size={20} color={colors.white} />
            </TouchableOpacity>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <Ionicons name="qr-code" size={70} color="rgba(255,255,255,0.4)" />
              <View style={styles.scanLine} />
            </View>
            <Text style={styles.scanTitle}>Scan Member QR</Text>
            <Text style={styles.scanHint}>Align the QR code inside the frame.</Text>
          </View>
        </View>
      </Modal>
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
  heroActions: { flexDirection: 'row', gap: spacing.sm },
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

  scanOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  scanCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  scanClose: {
    position: 'absolute',
    top: 0, right: 0,
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanFrame: {
    width: 240, height: 240,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  scanLine: {
    position: 'absolute',
    left: 16, right: 16, top: '50%',
    height: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  corner: {
    position: 'absolute',
    width: 28, height: 28,
    borderColor: colors.primary,
  },
  cornerTL: { top: 8, left: 8, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: 8, right: 8, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: 8, left: 8, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 8, right: 8, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  scanTitle: { ...typography.h3, color: colors.white },
  scanHint: { ...typography.bodySmall, color: 'rgba(255,255,255,0.65)', marginTop: 4, textAlign: 'center' },
});

export default MembershipsScreen;
