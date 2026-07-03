import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { generateMemberId, membershipDurations, membershipTiers } from '../data/mockData';
import { useShots } from '../store/ShotsStore';
import { uploadToBucket } from '../lib/supabase';
import GradientButton from '../components/GradientButton';
import MembershipVirtualCard from '../components/MembershipVirtualCard';
import ScreenHeader from '../components/ScreenHeader';

const AddMemberScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { members, addMember, addFinanceEntry, businessName } = useShots();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [idCardImage, setIdCardImage] = useState(null);
  const [idCardImageBack, setIdCardImageBack] = useState(null);
  const [memberPhoto, setMemberPhoto] = useState(null);
  const [tier, setTier] = useState('Premium');
  const [duration, setDuration] = useState(membershipDurations[3]); // 1 Year
  const [isCustom, setIsCustom] = useState(false);
  const [customMonths, setCustomMonths] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const existingIds = useMemo(() => members.map((m) => m.id), [members]);
  const memberId = useMemo(() => {
    if (!idCardNumber || idCardNumber.replace(/\D/g, '').length < 6) return null;
    return generateMemberId(idCardNumber, existingIds);
  }, [idCardNumber, existingIds]);

  const expiryDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + duration.months);
    return d.toISOString().slice(0, 10);
  }, [duration]);

  const previewMember = {
    id: memberId || 'A------',
    name: name || 'NEW MEMBER',
    type: tier,
    idCardNumber: idCardNumber || '',
    expiryDate,
    status: 'Active',
    photo: memberPhoto?.uri || null,
  };

  const canSubmit = name && phone && idCardNumber && memberId && duration.months >= 1;

  // Pick an image from the camera or gallery, then hand the selected asset to `setter`.
  // Note: allowsEditing is intentionally off — the Android system crop screen has
  // hard-to-see controls; images are used as-is and auto-fit their frames.
  const launchPicker = async (source, setter) => {
    try {
      const opts = { mediaTypes: ['images'], allowsEditing: false, quality: 0.9 };
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          return Alert.alert('Permission needed', 'Camera access is required to take a photo.');
        }
        result = await ImagePicker.launchCameraAsync(opts);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          return Alert.alert('Permission needed', 'Photo library access is required to choose an image.');
        }
        result = await ImagePicker.launchImageLibraryAsync(opts);
      }
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        setter({ uri: a.uri, mimeType: a.mimeType, fileName: a.fileName });
      }
    } catch (e) {
      Alert.alert('Could not open picker', e?.message || 'Please try again.');
    }
  };

  const pickImage = (setter) => {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Take Photo', onPress: () => launchPicker('camera', setter) },
      { text: 'Choose from Gallery', onPress: () => launchPicker('library', setter) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return Alert.alert('Incomplete', 'Name, phone and CNIC are required.');
    }
    if (saving) return;
    setSaving(true);
    try {
      // Upload the picked profile photo / ID card to Storage and persist the
      // returned references. Image uploads need internet — if we're offline the
      // upload fails and we create the member without images (they can be added
      // later from the member's page once back online).
      let imagesSkipped = false;
      const tryUpload = async (bucket, file, prefix) => {
        try {
          return await uploadToBucket(bucket, file, prefix);
        } catch (e) {
          imagesSkipped = true;
          return null;
        }
      };

      let photoUrl = null;
      if (memberPhoto?.uri) {
        photoUrl = await tryUpload(
          'member-photos',
          { uri: memberPhoto.uri, name: memberPhoto.fileName, type: memberPhoto.mimeType },
          'members/',
        );
      }
      let cnicImage = null;
      if (idCardImage?.uri) {
        cnicImage = await tryUpload(
          'member-cnic',
          { uri: idCardImage.uri, name: idCardImage.fileName, type: idCardImage.mimeType },
          'cnic/',
        );
      }
      let cnicImageBack = null;
      if (idCardImageBack?.uri) {
        cnicImageBack = await tryUpload(
          'member-cnic',
          { uri: idCardImageBack.uri, name: idCardImageBack.fileName, type: idCardImageBack.mimeType },
          'cnic/',
        );
      }

      await addMember({
        id: memberId,
        name,
        phone,
        email: email || null,
        idCardNumber,
        type: tier,
        joinDate: new Date().toISOString().slice(0, 10),
        expiryDate,
        status: 'Active',
        visits: 0,
        totalSpent: Number(price) || 0,
        photo: photoUrl,
        cnicImage,
        cnicImageBack,
      });

      if (price && Number(price) > 0) {
        await addFinanceEntry({
          type: 'In',
          category: 'Membership',
          amount: Number(price),
          description: `New ${tier} membership — ${name}`,
        });
      }

      const priceMsg = price ? ` Rs. ${Number(price).toLocaleString()} added to revenue.` : '';
      const imgMsg = imagesSkipped
        ? '\n\nNote: photos couldn’t be uploaded (offline). Add them from the member’s page once you’re back online.'
        : '';
      Alert.alert('Member Added', `${name} registered with ID ${memberId}.${priceMsg}${imgMsg}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Could not add member', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="New Member"
        subtitle="Create a virtual membership card"
        onBack={() => navigation.goBack()}
        variant="gradient"
      />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        bottomOffset={100}
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
          {/* Live preview card */}
          <View style={styles.previewWrap}>
            <Text style={styles.sectionLabel}>Live Preview</Text>
            <MembershipVirtualCard member={previewMember} businessName={businessName} compact />
            {memberId ? (
              <View style={styles.idHint}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.idHintText}>
                  Auto-generated Member ID:{' '}
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>{memberId}</Text>
                  {memberId.startsWith('B') ? '  •  Prefix A was taken, used B' : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Member photo */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Member Photo</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => (memberPhoto ? setMemberPhoto(null) : pickImage(setMemberPhoto))}
              style={styles.photoBox}
            >
              {memberPhoto ? (
                <View style={styles.uploadedRow}>
                  <Image source={{ uri: memberPhoto.uri }} style={styles.thumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadedTitle}>Photo Attached</Text>
                    <Text style={styles.uploadedMeta}>Tap to remove</Text>
                  </View>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <View style={styles.uploadIcon}>
                    <Ionicons name="camera-outline" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.uploadTitle}>Add Member Photo</Text>
                  <Text style={styles.uploadHint}>Appears on the membership card</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Personal Details</Text>

            <Field label="Full Name" icon="person-outline" placeholder="e.g. Ahmed Khan" value={name} onChangeText={setName} />
            <Field label="Phone Number" icon="call-outline" placeholder="+92 300 1234567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Field label="Email (optional)" icon="mail-outline" placeholder="member@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Identity Verification</Text>

            <Text style={styles.fieldLabel}>ID Card — Front</Text>
            <TouchableOpacity
              style={styles.uploadBox}
              activeOpacity={0.85}
              onPress={() => (idCardImage ? setIdCardImage(null) : pickImage(setIdCardImage))}
            >
              {idCardImage ? (
                <View style={styles.uploadedRow}>
                  <Image source={{ uri: idCardImage.uri }} style={styles.thumbWide} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadedTitle}>Front Attached</Text>
                    <Text style={styles.uploadedMeta}>Tap to remove</Text>
                  </View>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <View style={styles.uploadIcon}>
                    <Ionicons name="cloud-upload-outline" size={26} color={colors.primary} />
                  </View>
                  <Text style={styles.uploadTitle}>Upload Front</Text>
                  <Text style={styles.uploadHint}>Tap to capture or pick from gallery</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>ID Card — Back</Text>
            <TouchableOpacity
              style={styles.uploadBox}
              activeOpacity={0.85}
              onPress={() => (idCardImageBack ? setIdCardImageBack(null) : pickImage(setIdCardImageBack))}
            >
              {idCardImageBack ? (
                <View style={styles.uploadedRow}>
                  <Image source={{ uri: idCardImageBack.uri }} style={styles.thumbWide} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadedTitle}>Back Attached</Text>
                    <Text style={styles.uploadedMeta}>Tap to remove</Text>
                  </View>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <View style={styles.uploadIcon}>
                    <Ionicons name="cloud-upload-outline" size={26} color={colors.primary} />
                  </View>
                  <Text style={styles.uploadTitle}>Upload Back</Text>
                  <Text style={styles.uploadHint}>Tap to capture or pick from gallery</Text>
                </View>
              )}
            </TouchableOpacity>

            <Field
              label="ID Card Number (CNIC)"
              icon="card-outline"
              placeholder="35202-1234567-1"
              value={idCardNumber}
              onChangeText={setIdCardNumber}
              keyboardType="number-pad"
              maxLength={20}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Membership Tier</Text>
            <View style={styles.tierRow}>
              {membershipTiers.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTier(t)}
                  style={[styles.tierCard, tier === t && styles.tierCardActive]}
                >
                  <View style={[styles.tierIcon, tier === t && { backgroundColor: colors.primarySoft }]}>
                    <Ionicons
                      name={t === 'Premium' ? 'diamond' : t === 'Standard' ? 'star' : 'ribbon'}
                      size={18}
                      color={tier === t ? colors.primary : colors.textLight}
                    />
                  </View>
                  <Text style={[styles.tierName, tier === t && { color: colors.primary }]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Expiration</Text>
            <View style={styles.durationRow}>
              {membershipDurations.map((d) => {
                const active = !isCustom && duration.label === d.label;
                return (
                  <Pressable
                    key={d.label}
                    onPress={() => { setIsCustom(false); setDuration(d); }}
                    style={[styles.duration, active && styles.durationActive]}
                  >
                    <Text style={[styles.durationText, active && styles.durationTextActive]}>
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => {
                  setIsCustom(true);
                  const m = Number(customMonths) || 1;
                  setDuration({ label: 'Custom', months: m });
                }}
                style={[styles.duration, isCustom && styles.durationActive]}
              >
                <Text style={[styles.durationText, isCustom && styles.durationTextActive]}>Custom</Text>
              </Pressable>
            </View>

            {isCustom ? (
              <View style={styles.customRow}>
                <Ionicons name="calendar-number-outline" size={18} color={colors.primary} />
                <TextInput
                  value={customMonths}
                  onChangeText={(v) => {
                    const clean = v.replace(/\D/g, '');
                    setCustomMonths(clean);
                    setDuration({ label: 'Custom', months: Number(clean) || 0 });
                  }}
                  placeholder="e.g. 18"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={styles.customInput}
                />
                <Text style={styles.customUnit}>months</Text>
              </View>
            ) : null}

            <View style={styles.expiryHint}>
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={styles.expiryHintText}>
                Expires{' '}
                <Text style={{ fontWeight: '800', color: colors.primaryDark }}>
                  {new Date(expiryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </Text>
            </View>
          </View>

          {/* Membership Price */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Membership Price</Text>
            <Text style={styles.fieldHint}>Optional — added to today's revenue when the member is created.</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>Rs.</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                style={styles.amountInput}
              />
            </View>
          </View>
        </KeyboardAwareScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <GradientButton
            label="Create Membership"
            icon="checkmark-circle"
            onPress={handleSubmit}
            loading={saving}
            disabled={!canSubmit || saving}
          />
        </View>
    </View>
  );
};

const Field = ({ label, icon, ...rest }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={18} color={colors.textLight} />
      <TextInput
        {...rest}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  previewWrap: { marginBottom: spacing.lg },
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
  field: { marginBottom: spacing.md },
  fieldLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  fieldHint: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'none',
    letterSpacing: 0,
    marginBottom: spacing.sm,
    marginTop: -spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    height: 50,
    borderRadius: borderRadius.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
  },
  photoBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  uploadIcon: {
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  uploadTitle: { ...typography.body, color: colors.primary, fontWeight: '800' },
  uploadHint: { ...typography.caption, color: colors.textLight, marginTop: 4, textTransform: 'none', letterSpacing: 0 },
  uploadedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: {
    width: 48, height: 48, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  thumbWide: {
    width: 64, height: 40, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  uploadedIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.successSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  uploadedTitle: { ...typography.body, color: colors.text, fontWeight: '700' },
  uploadedMeta: { ...typography.caption, color: colors.textLight, textTransform: 'none', letterSpacing: 0 },
  idHint: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: borderRadius.md,
  },
  idHintText: { flex: 1, ...typography.bodySmall, color: colors.text },
  tierRow: { flexDirection: 'row', gap: spacing.sm },
  tierCard: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tierCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tierIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tierName: { ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  duration: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  durationActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  durationText: { ...typography.bodySmall, color: colors.text, fontWeight: '600' },
  durationTextActive: { color: colors.white },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    height: 50,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  customInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    fontWeight: '800',
    paddingVertical: 0,
  },
  customUnit: { ...typography.bodySmall, color: colors.textLight, fontWeight: '700' },
  expiryHint: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.md,
  },
  expiryHintText: { ...typography.bodySmall, color: colors.text, flex: 1 },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.lg,
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  currency: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '800',
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    paddingVertical: 0,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default AddMemberScreen;
