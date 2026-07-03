import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardProvider, KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { membershipDurations, membershipTiers } from '../data/mockData';
import { useShots } from '../store/ShotsStore';
import { signedUrl, uploadToBucket } from '../lib/supabase';
import MembershipVirtualCard from '../components/MembershipVirtualCard';
import ScreenHeader from '../components/ScreenHeader';
import GradientButton from '../components/GradientButton';

const MemberDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { members, bookings, updateMember, addFinanceEntry, businessName } = useShots();
  const id = route.params?.memberId;
  const member = members.find((m) => m.id === id);
  const visits = bookings.filter((b) => b.memberId === id);

  const [renewOpen, setRenewOpen] = useState(false);
  const [renewDuration, setRenewDuration] = useState(membershipDurations[3]);
  const [renewPrice, setRenewPrice] = useState('');
  const [sharing, setSharing] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [photoViewer, setPhotoViewer] = useState(null); // image uri to show full-screen, or null
  const [replacing, setReplacing] = useState(null); // 'photo' | 'front' | 'back' | null
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 }); // measured for hi-res capture

  // Edit member info
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({ name: '', phone: '', email: '', idCardNumber: '', type: 'Premium', expiryDate: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Resolve viewable URLs for the (private) ID card images.
  const [cnicUrls, setCnicUrls] = useState({ front: null, back: null });
  useEffect(() => {
    let active = true;
    (async () => {
      const [front, back] = await Promise.all([
        signedUrl('member-cnic', member?.cnicImage),
        signedUrl('member-cnic', member?.cnicImageBack),
      ]);
      if (active) setCnicUrls({ front, back });
    })();
    return () => { active = false; };
  }, [member?.cnicImage, member?.cnicImageBack]);

  const cardRef = useRef(null);

  const captureCard = async () => {
    // Capture at 3x the on-screen size so the saved/shared card (and the member's
    // face) stays crisp instead of blurry.
    const opts = { format: 'png', quality: 1.0, result: 'tmpfile' };
    if (cardSize.width > 0 && cardSize.height > 0) {
      opts.width = Math.round(cardSize.width * 3);
      opts.height = Math.round(cardSize.height * 3);
    }
    return captureRef(cardRef, opts);
  };

  const shareMessage = () =>
    `Hello ${member.name}, here is your Shots Members Club card.\n\nMember ID: ${member.id}\nType: ${member.type}\nValid until: ${member.expiryDate}\n\nShow this card or have it scanned at the entrance.`;

  // One share button — opens the native share sheet (WhatsApp, Email, etc.)
  // with the rendered card image attached. The user decides how to send it.
  const handleShare = async () => {
    try {
      setSharing(true);
      const uri = await captureCard();
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Share ${member.name}'s membership card`,
          UTI: 'public.png',
        });
      } else {
        // Fallback: text-only mailto if a share sheet isn't available.
        const url = member.email
          ? `mailto:${member.email}?subject=${encodeURIComponent('Your Shots Members Club card')}&body=${encodeURIComponent(shareMessage())}`
          : null;
        if (url) await Linking.openURL(url);
        else throw new Error('Sharing is not available on this device.');
      }
    } catch (e) {
      Alert.alert('Could not share card', e?.message || 'Try again in a moment.');
    } finally {
      setSharing(false);
    }
  };

  // Save the rendered card image straight into the phone's photo gallery.
  const saveCardToPhone = async () => {
    if (savingCard) return;
    try {
      setSavingCard(true);
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        return Alert.alert('Permission needed', 'Allow photo library access to save the card to your phone.');
      }
      const uri = await captureCard();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', `${member.name}'s card was saved to your phone's gallery.`);
    } catch (e) {
      Alert.alert('Could not save card', e?.message || 'Try again in a moment.');
    } finally {
      setSavingCard(false);
    }
  };

  // Replace an existing image (member face photo or ID card front/back).
  const launchReplace = async (target, source) => {
    try {
      const opts = { mediaTypes: ['images'], allowsEditing: false, quality: 0.9 };
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert('Permission needed', 'Camera access is required to take a photo.');
        result = await ImagePicker.launchCameraAsync(opts);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return Alert.alert('Permission needed', 'Photo library access is required to choose an image.');
        result = await ImagePicker.launchImageLibraryAsync(opts);
      }
      if (result.canceled || !result.assets?.[0]) return;
      const a = result.assets[0];
      setReplacing(target);
      const file = { uri: a.uri, name: a.fileName, type: a.mimeType };
      if (target === 'photo') {
        const url = await uploadToBucket('member-photos', file, 'members/');
        await updateMember(member.id, { photo: url });
      } else {
        const path = await uploadToBucket('member-cnic', file, 'cnic/');
        await updateMember(member.id, target === 'front' ? { cnicImage: path } : { cnicImageBack: path });
      }
    } catch (e) {
      Alert.alert('Could not replace image', e?.message || 'Please try again.');
    } finally {
      setReplacing(null);
    }
  };

  const replaceImage = (target, label) => {
    Alert.alert(`Replace ${label}`, 'Choose a source', [
      { text: 'Take Photo', onPress: () => launchReplace(target, 'camera') },
      { text: 'Choose from Gallery', onPress: () => launchReplace(target, 'library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const copyValue = async (label, value) => {
    if (!value) {
      return Alert.alert(`No ${label.toLowerCase()}`, `This member has no ${label.toLowerCase()} on file.`);
    }
    await Clipboard.setStringAsync(String(value));
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  const openEdit = () => {
    setEdit({
      name: member.name || '',
      phone: member.phone || '',
      email: member.email || '',
      idCardNumber: member.idCardNumber || '',
      type: member.type || 'Premium',
      expiryDate: member.expiryDate || '',
    });
    setEditOpen(true);
  };

  // Extend the editable expiry by 1 year (from today or current expiry, whichever is later).
  const extendEditOneYear = () => {
    const cur = edit.expiryDate ? new Date(edit.expiryDate) : new Date();
    const base = cur > new Date() ? new Date(cur) : new Date();
    base.setFullYear(base.getFullYear() + 1);
    setEdit((s) => ({ ...s, expiryDate: base.toISOString().slice(0, 10) }));
  };

  const saveEdit = async () => {
    if (!edit.name || !edit.phone) {
      return Alert.alert('Missing info', 'Name and phone are required.');
    }
    if (savingEdit) return;
    setSavingEdit(true);
    try {
      const patch = {
        name: edit.name,
        phone: edit.phone,
        email: edit.email || null,
        idCardNumber: edit.idCardNumber,
        type: edit.type,
      };
      if (edit.expiryDate) {
        patch.expiryDate = edit.expiryDate;
        patch.status = new Date(edit.expiryDate) >= new Date() ? 'Active' : 'Expired';
      }
      await updateMember(member.id, patch);
      setEditOpen(false);
    } catch (e) {
      Alert.alert('Could not save changes', e?.message || 'Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const applyRenewal = async () => {
    // Extend from whichever is later: today or the current expiry date.
    const base = (() => {
      const current = member.expiryDate ? new Date(member.expiryDate) : null;
      const now = new Date();
      return current && current > now ? current : now;
    })();
    base.setMonth(base.getMonth() + renewDuration.months);
    const newExpiry = base.toISOString().slice(0, 10);

    try {
      await updateMember(member.id, { expiryDate: newExpiry, status: 'Active' });
      if (renewPrice && Number(renewPrice) > 0) {
        await addFinanceEntry({
          type: 'In',
          category: 'Membership',
          amount: Number(renewPrice),
          description: `Membership renewal (${renewDuration.label}) — ${member.name}`,
        });
      }
      const priceMsg = renewPrice
        ? ` Rs. ${Number(renewPrice).toLocaleString()} added to revenue.`
        : '';
      Alert.alert('Renewed', `${member.name}'s membership renewed for ${renewDuration.label}.${priceMsg}`);
      setRenewOpen(false);
      setRenewPrice('');
    } catch (e) {
      Alert.alert('Could not renew', e?.message || 'Please try again.');
    }
  };

  const confirmRenew = () => {
    Alert.alert(
      'Renew membership?',
      `This will extend ${member.name}'s membership by ${renewDuration.label}. Make sure this is correct before continuing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm Renewal', style: 'default', onPress: applyRenewal },
      ]
    );
  };

  const handleSuspend = () => {
    Alert.alert(
      'Suspend member?',
      `This will mark ${member.name} as inactive (Expired). You can re-activate them later by renewing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateMember(member.id, { status: 'Expired' });
              Alert.alert('Suspended', `${member.name} suspended.`);
            } catch (e) {
              Alert.alert('Could not suspend', e?.message || 'Please try again.');
            }
          },
        },
      ]
    );
  };

  if (!member) {
    return (
      <View style={styles.root}>
        <ScreenHeader
          title="Member"
          subtitle="Not found"
          onBack={() => navigation.goBack()}
          variant="gradient"
        />
        <View style={styles.empty}>
          <Ionicons name="person-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>This member could not be loaded.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={member.name}
        subtitle={member.id}
        onBack={() => navigation.goBack()}
        variant="gradient"
        rightIcon="create-outline"
        onRight={openEdit}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          ref={cardRef}
          collapsable={false}
          style={styles.cardWrap}
          onLayout={(e) => setCardSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
          <MembershipVirtualCard member={member} businessName={businessName} />
        </View>

        {/* Share / Save card */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            onPress={handleShare}
            disabled={sharing}
            style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
            activeOpacity={0.85}
          >
            <Ionicons name="share-social" size={18} color={colors.primary} />
            <Text style={styles.shareText}>{sharing ? 'Preparing…' : 'Share Card'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={saveCardToPhone}
            disabled={savingCard}
            style={[styles.shareBtn, savingCard && styles.shareBtnDisabled]}
            activeOpacity={0.85}
          >
            <Ionicons name="download-outline" size={18} color={colors.primary} />
            <Text style={styles.shareText}>{savingCard ? 'Saving…' : 'Save to Phone'}</Text>
          </TouchableOpacity>
        </View>

        {/* Copy contact details to populate a message manually */}
        <View style={styles.copyRow}>
          <TouchableOpacity
            onPress={() => copyValue('Phone', member.phone)}
            style={styles.copyBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="call-outline" size={16} color={colors.text} />
            <Text style={styles.copyText} numberOfLines={1}>Copy Phone</Text>
            <Ionicons name="copy-outline" size={14} color={colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => copyValue('Email', member.email)}
            style={styles.copyBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="mail-outline" size={16} color={colors.text} />
            <Text style={styles.copyText} numberOfLines={1}>Copy Email</Text>
            <Ionicons name="copy-outline" size={14} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.statRow}>
          <QuickStat icon="time" label="Visits" value={visits.length} />
          <QuickStat icon="cash" label="Spent" value={`Rs. ${visits.reduce((s, v) => s + v.amount, 0).toLocaleString()}`} />
          <QuickStat icon="calendar" label="Since" value={new Date(member.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Personal Info</Text>
            <TouchableOpacity onPress={openEdit} style={styles.editPill} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={14} color={colors.primary} />
              <Text style={styles.editPillText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <InfoRow icon="card" label="CNIC" value={member.idCardNumber} />
          <InfoRow icon="mail" label="Email" value={member.email || '—'} />
          <InfoRow icon="call" label="Phone" value={member.phone} />
          <InfoRow icon="calendar-outline" label="Joined" value={member.joinDate} />
          <InfoRow icon="time-outline" label="Expires" value={member.expiryDate} isLast />
        </View>

        {/* Member face photo — tap to enlarge, replace if needed */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Member Photo</Text>
            <TouchableOpacity onPress={() => replaceImage('photo', 'member photo')} style={styles.editPill} activeOpacity={0.85}>
              {replacing === 'photo'
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="camera-outline" size={14} color={colors.primary} />}
              <Text style={styles.editPillText}>{replacing === 'photo' ? 'Saving…' : 'Replace'}</Text>
            </TouchableOpacity>
          </View>
          {member.photo ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setPhotoViewer(member.photo)} style={styles.facePhotoWrap}>
              <Image source={{ uri: member.photo }} style={styles.facePhoto} resizeMode="cover" />
              <View style={styles.enlargeChip}>
                <Ionicons name="expand-outline" size={13} color={colors.white} />
                <Text style={styles.enlargeChipText}>Tap to enlarge</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="person-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>No member photo on file</Text>
            </View>
          )}
        </View>

        {/* ID card images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ID Card</Text>
          <View style={styles.idCardRow}>
            <IdCardView
              label="Front"
              url={cnicUrls.front}
              onView={() => cnicUrls.front && setPhotoViewer(cnicUrls.front)}
              onReplace={() => replaceImage('front', 'ID front')}
              busy={replacing === 'front'}
            />
            <IdCardView
              label="Back"
              url={cnicUrls.back}
              onView={() => cnicUrls.back && setPhotoViewer(cnicUrls.back)}
              onReplace={() => replaceImage('back', 'ID back')}
              busy={replacing === 'back'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Visits</Text>
          {visits.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>No visits yet</Text>
            </View>
          ) : (
            visits.map((v) => (
              <View key={v.id} style={styles.visitRow}>
                <View style={styles.visitBubble}>
                  <Text style={styles.visitBubbleText}>T{v.tableNumber}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.visitTitle}>Table #{v.tableNumber}</Text>
                  <Text style={styles.visitMeta}>{v.date} · {v.start} → {v.end}</Text>
                </View>
                <Text style={styles.visitAmt}>Rs. {v.amount}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={handleSuspend}
        >
          <Ionicons name="pause-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.outlineBtnText}>Suspend</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <GradientButton
            label="Renew Membership"
            icon="refresh"
            onPress={() => setRenewOpen(true)}
          />
        </View>
      </View>

      {/* Renew sheet */}
      <Modal visible={renewOpen} transparent animationType="slide" onRequestClose={() => setRenewOpen(false)}>
        <KeyboardProvider>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior="padding" style={{ width: '100%' }}>
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.md }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHead}>
                <View>
                  <Text style={styles.modalTitle}>Renew Membership</Text>
                  <Text style={styles.modalSub}>{member.name} · {member.id}</Text>
                </View>
                <TouchableOpacity onPress={() => setRenewOpen(false)} hitSlop={10}>
                  <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.warnBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.warning} />
                <Text style={styles.warnText}>You'll be asked to confirm before the renewal is applied.</Text>
              </View>

              <Text style={styles.fieldLabel}>Extend by</Text>
              <View style={styles.durationRow}>
                {membershipDurations.map((d) => (
                  <Pressable
                    key={d.label}
                    onPress={() => setRenewDuration(d)}
                    style={[styles.duration, renewDuration.label === d.label && styles.durationActive]}
                  >
                    <Text style={[styles.durationText, renewDuration.label === d.label && { color: colors.white }]}>
                      {d.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Renewal Price (optional)</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currency}>Rs.</Text>
                <TextInput
                  value={renewPrice}
                  onChangeText={setRenewPrice}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.amountInput}
                />
              </View>
              <Text style={styles.fieldHint}>Added to today's revenue.</Text>

              <View style={{ marginTop: spacing.lg }}>
                <GradientButton label="Continue" icon="arrow-forward" onPress={confirmRenew} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
        </KeyboardProvider>
      </Modal>

      {/* Edit member info */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <KeyboardProvider>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior="padding" style={{ width: '100%' }}>
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.md }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHead}>
                <View>
                  <Text style={styles.modalTitle}>Edit Member</Text>
                  <Text style={styles.modalSub}>{member.id}</Text>
                </View>
                <TouchableOpacity onPress={() => setEditOpen(false)} hitSlop={10}>
                  <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                value={edit.name}
                onChangeText={(v) => setEdit((s) => ({ ...s, name: v }))}
                placeholder="Member name"
                placeholderTextColor={colors.textMuted}
                style={styles.editInput}
              />

              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                value={edit.phone}
                onChangeText={(v) => setEdit((s) => ({ ...s, phone: v }))}
                placeholder="+92 300 1234567"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                style={styles.editInput}
              />

              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                value={edit.email}
                onChangeText={(v) => setEdit((s) => ({ ...s, email: v }))}
                placeholder="member@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.editInput}
              />

              <Text style={styles.fieldLabel}>CNIC</Text>
              <TextInput
                value={edit.idCardNumber}
                onChangeText={(v) => setEdit((s) => ({ ...s, idCardNumber: v }))}
                placeholder="35202-1234567-1"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                style={styles.editInput}
              />

              <Text style={styles.fieldLabel}>Membership Tier</Text>
              <View style={styles.durationRow}>
                {membershipTiers.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setEdit((s) => ({ ...s, type: t }))}
                    style={[styles.duration, edit.type === t && styles.durationActive]}
                  >
                    <Text style={[styles.durationText, edit.type === t && { color: colors.white }]}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Expiry Date (YYYY-MM-DD)</Text>
              <TextInput
                value={edit.expiryDate}
                onChangeText={(v) => setEdit((s) => ({ ...s, expiryDate: v }))}
                placeholder="2027-06-13"
                placeholderTextColor={colors.textMuted}
                style={styles.editInput}
              />
              <TouchableOpacity onPress={extendEditOneYear} style={styles.extendBtn} activeOpacity={0.85}>
                <Ionicons name="calendar" size={16} color={colors.primary} />
                <Text style={styles.extendBtnText}>Extend 1 year</Text>
              </TouchableOpacity>

              <View style={{ marginTop: spacing.lg }}>
                <GradientButton
                  label="Save Changes"
                  icon="checkmark-circle"
                  onPress={saveEdit}
                  loading={savingEdit}
                  disabled={savingEdit}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
        </KeyboardProvider>
      </Modal>

      {/* Full-screen photo viewer (member photo / ID card) */}
      <Modal visible={!!photoViewer} transparent animationType="fade" onRequestClose={() => setPhotoViewer(null)}>
        <View style={styles.viewerOverlay}>
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setPhotoViewer(null)}
            hitSlop={12}
          >
            <Ionicons name="close" size={26} color={colors.white} />
          </TouchableOpacity>
          {photoViewer ? (
            <Image source={{ uri: photoViewer }} style={styles.viewerImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

const QuickStat = ({ icon, label, value }) => (
  <View style={styles.qs}>
    <View style={styles.qsIcon}>
      <Ionicons name={icon} size={16} color={colors.primary} />
    </View>
    <Text style={styles.qsValue} numberOfLines={1}>{value}</Text>
    <Text style={styles.qsLabel}>{label}</Text>
  </View>
);

const InfoRow = ({ icon, label, value, isLast }) => (
  <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={14} color={colors.primary} />
    </View>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
  </View>
);

const IdCardView = ({ label, url, onView, onReplace, busy }) => (
  <View style={{ flex: 1 }}>
    <Text style={styles.idCardLabel}>{label}</Text>
    {url ? (
      <TouchableOpacity activeOpacity={0.9} onPress={onView}>
        <Image source={{ uri: url }} style={styles.idCardThumb} resizeMode="cover" />
      </TouchableOpacity>
    ) : (
      <View style={[styles.idCardThumb, styles.idCardEmpty]}>
        <Ionicons name="image-outline" size={22} color={colors.textMuted} />
        <Text style={styles.idCardEmptyText}>Not uploaded</Text>
      </View>
    )}
    <TouchableOpacity onPress={onReplace} style={styles.idReplaceBtn} activeOpacity={0.85} disabled={busy}>
      {busy
        ? <ActivityIndicator size="small" color={colors.primary} />
        : <Ionicons name={url ? 'camera-outline' : 'add-circle-outline'} size={14} color={colors.primary} />}
      <Text style={styles.idReplaceText}>{busy ? 'Saving…' : url ? 'Replace' : 'Add'}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },
  cardWrap: { marginBottom: spacing.md },
  cardActionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    ...shadows.xs,
  },
  shareText: { ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  shareBtnDisabled: { opacity: 0.55 },
  copyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  copyText: { ...typography.caption, color: colors.text, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  qs: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  qsIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  qsValue: { ...typography.h4, color: colors.text },
  qsLabel: { ...typography.caption, color: colors.textLight, marginTop: 2 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  editPillText: { ...typography.caption, color: colors.primary, fontWeight: '800', textTransform: 'none', letterSpacing: 0 },
  facePhotoWrap: { borderRadius: borderRadius.lg, overflow: 'hidden', ...shadows.sm },
  facePhoto: { width: '100%', height: 240, backgroundColor: colors.surfaceAlt },
  enlargeChip: {
    position: 'absolute', bottom: spacing.sm, right: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm + 2, paddingVertical: 5,
    borderRadius: borderRadius.round,
  },
  enlargeChipText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  idReplaceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginTop: spacing.sm, paddingVertical: spacing.sm,
    borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  idReplaceText: { ...typography.caption, color: colors.primary, fontWeight: '800', textTransform: 'none', letterSpacing: 0 },
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerClose: {
    position: 'absolute', top: 48, right: 20, zIndex: 2,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  viewerImage: { width: '100%', height: '80%' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { ...typography.bodySmall, color: colors.textLight, width: 80 },
  infoValue: { flex: 1, ...typography.bodySmall, color: colors.text, fontWeight: '700', textAlign: 'right' },
  idCardRow: { flexDirection: 'row', gap: spacing.md },
  idCardLabel: { ...typography.caption, color: colors.textLight, fontWeight: '700', marginBottom: spacing.xs },
  idCardThumb: {
    width: '100%', height: 110,
    borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  idCardEmpty: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  idCardEmptyText: { ...typography.caption, color: colors.textMuted, textTransform: 'none', letterSpacing: 0 },
  extendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: spacing.sm, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  extendBtnText: { ...typography.bodySmall, color: colors.primary, fontWeight: '800' },
  empty: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textLight },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  visitBubble: {
    width: 36, height: 36, borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  visitBubbleText: { ...typography.caption, color: colors.primaryDark, fontWeight: '800' },
  visitTitle: { ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  visitMeta: { ...typography.caption, color: colors.textLight, marginTop: 2, textTransform: 'none', letterSpacing: 0 },
  visitAmt: { ...typography.bodySmall, color: colors.text, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  outlineBtnText: { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.divider,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.h3, color: colors.text },
  modalSub: { ...typography.bodySmall, color: colors.textLight, marginTop: 2 },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  warnText: { flex: 1, ...typography.caption, color: colors.text, textTransform: 'none', letterSpacing: 0 },
  fieldLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
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
  currency: { ...typography.h4, color: colors.primary, fontWeight: '800', marginRight: spacing.sm },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    paddingVertical: 0,
  },
  fieldHint: { ...typography.caption, color: colors.textMuted, textTransform: 'none', letterSpacing: 0, marginTop: 4 },
  editInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
  },
});

export default MemberDetailScreen;
