import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { expenseCategories } from '../data/mockData';
import { useShots } from '../store/ShotsStore';
import GradientButton from '../components/GradientButton';
import ScreenHeader from '../components/ScreenHeader';

const NO_TABLE = -1;

const AddExpenseScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { tables, finance, addFinanceEntry } = useShots();
  const initialTableId = route.params?.tableId;

  // 'list' shows the history; 'form' shows the add-expense form.
  const [mode, setMode] = useState('list');
  const [tableId, setTableId] = useState(initialTableId ?? NO_TABLE);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Repair');
  const [saving, setSaving] = useState(false);

  // Always land on the list when the tab is opened.
  useFocusEffect(useCallback(() => { setMode('list'); }, []));

  const selectedTable = tables.find((t) => t.id === tableId);

  // All expenses (most recent first) for the history list.
  const allExpenses = useMemo(() => {
    return finance
      .filter((e) => e.type === 'Out')
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.time || '').localeCompare(a.time || ''));
  }, [finance]);
  const expensesTotal = allExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory('Repair');
    setTableId(initialTableId ?? NO_TABLE);
  };

  const openForm = () => {
    resetForm();
    setMode('form');
  };

  const handleSave = async () => {
    if (!amount || !description) {
      return Alert.alert('Missing info', 'Amount and description are required.');
    }
    if (saving) return;
    setSaving(true);
    try {
      await addFinanceEntry({
        type: 'Out',
        category,
        amount: Number(amount),
        description,
        table: tableId === NO_TABLE ? null : selectedTable?.number ?? null,
      });
      resetForm();
      setMode('list'); // back to the history, which now includes the new entry
    } catch (e) {
      Alert.alert('Could not save expense', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ---- List mode -----------------------------------------------------------
  if (mode === 'list') {
    return (
      <View style={styles.root}>
        <ScreenHeader
          title="Expenses"
          subtitle="All logged costs"
          onMenu={() => navigation.openDrawer?.()}
          variant="gradient"
          rightIcon="add"
          onRight={openForm}
        />

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.totalCard}>
            <View>
              <Text style={styles.totalCardLabel}>Total Expenses</Text>
              <Text style={styles.totalCardValue}>Rs. {expensesTotal.toLocaleString()}</Text>
            </View>
            <View style={styles.totalCardIcon}>
              <Ionicons name="receipt" size={22} color={colors.error} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>History ({allExpenses.length})</Text>
            {allExpenses.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyText}>No expenses logged yet.</Text>
              </View>
            ) : (
              allExpenses.map((e, i) => (
                <View key={e.id} style={[styles.histRow, i === allExpenses.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.histIcon}>
                    <Ionicons name="receipt" size={14} color={colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.histDesc} numberOfLines={1}>{e.description}</Text>
                    <Text style={styles.histMeta}>
                      {e.category} · {e.date}{e.table ? ` · Table #${e.table}` : ' · General'}
                    </Text>
                  </View>
                  <Text style={styles.histAmt}>- Rs. {(e.amount || 0).toLocaleString()}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 84 }]}>
          <GradientButton label="Add Expense" icon="add-circle" onPress={openForm} />
        </View>
      </View>
    );
  }

  // ---- Form mode -----------------------------------------------------------
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Add Expense"
        subtitle="Log a new cost"
        onBack={() => setMode('list')}
        variant="gradient"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Table picker (optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Allocate to Table</Text>
            <Text style={styles.fieldHint}>Pick a table or choose "No specific table" for general expenses.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              <Pressable
                key="none"
                onPress={() => setTableId(NO_TABLE)}
                style={[styles.tableChip, tableId === NO_TABLE && styles.tableChipActive]}
              >
                <Ionicons
                  name="ban-outline"
                  size={18}
                  color={tableId === NO_TABLE ? colors.white : colors.textLight}
                />
                <Text style={[styles.tableChipType, tableId === NO_TABLE && { color: colors.white }]}>
                  No table
                </Text>
              </Pressable>

              {tables.map((t) => {
                const active = tableId === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTableId(t.id)}
                    style={[styles.tableChip, active && styles.tableChipActive]}
                  >
                    <Text style={[styles.tableChipNum, active && { color: colors.white }]}>#{t.number}</Text>
                    <Text style={[styles.tableChipType, active && { color: 'rgba(255,255,255,0.85)' }]}>
                      {t.type}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Amount + Category */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Expense Details</Text>

            <Text style={styles.fieldLabel}>Amount (Rs.)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>Rs.</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                style={styles.amountInput}
              />
            </View>

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.catRow}>
              {expenseCategories.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.catChip, category === c && styles.catChipActive]}
                >
                  <Text style={[styles.catText, category === c && { color: colors.white }]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What was this expense for?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              style={styles.descInput}
            />
          </View>
        </ScrollView>

        {/* This screen is the "Expense" tab, so the floating tab bar (~74px)
            overlaps the bottom — pad the footer up so the button stays tappable. */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 84 }]}>
          <GradientButton label="Save Expense" icon="save" onPress={handleSave} loading={saving} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  sectionLabel: { ...typography.label, color: colors.primaryDark, marginBottom: spacing.md },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  totalCardLabel: { fontSize: 11, color: colors.textLight, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalCardValue: { ...typography.h2, color: colors.error, marginTop: 4 },
  totalCardIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.errorSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  fieldHint: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'none',
    letterSpacing: 0,
    marginBottom: spacing.sm,
    marginTop: -spacing.sm,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '700',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  tableChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    minHeight: 60,
  },
  tableChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tableChipNum: { ...typography.h4, color: colors.text },
  tableChipType: {
    ...typography.caption,
    color: colors.textLight,
    textTransform: 'none',
    letterSpacing: 0,
    marginTop: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.lg,
    height: 64,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  currency: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '800',
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    paddingVertical: 0,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  descInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
    ...typography.body,
    color: colors.text,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalPill: {
    backgroundColor: colors.errorSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  totalPillText: { ...typography.caption, color: colors.error, fontWeight: '800' },
  empty: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textLight },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  histIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.warningSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  histDesc: { ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  histMeta: { ...typography.caption, color: colors.textLight, marginTop: 2, textTransform: 'none', letterSpacing: 0 },
  histAmt: { ...typography.bodySmall, color: colors.error, fontWeight: '800' },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default AddExpenseScreen;
