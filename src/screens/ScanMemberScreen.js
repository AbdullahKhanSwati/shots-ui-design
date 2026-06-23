import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../styles/theme';
import { useShots } from '../store/ShotsStore';
import ScreenHeader from '../components/ScreenHeader';

// Scans a member's membership-card QR and opens that member's profile.
// The card QR encodes JSON like { id, name, type, exp } (see MembershipVirtualCard).
const ScanMemberScreen = ({ navigation }) => {
  const { members } = useShots();
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);
  const lockRef = useRef(false);

  // Re-arm the scanner every time the screen regains focus.
  useFocusEffect(
    useCallback(() => {
      setHandled(false);
      lockRef.current = false;
    }, [])
  );

  const resolveId = (raw) => {
    if (!raw) return null;
    // Try JSON payload first, then fall back to a bare ID string.
    try {
      const obj = JSON.parse(raw);
      if (obj && obj.id) return String(obj.id);
    } catch (_) { /* not JSON */ }
    const trimmed = String(raw).trim();
    return /^[A-Z]\d{6}$/.test(trimmed) ? trimmed : null;
  };

  const onScanned = ({ data }) => {
    if (lockRef.current || handled) return;
    lockRef.current = true;
    setHandled(true);

    const id = resolveId(data);
    const member = id ? members.find((m) => m.id === id) : null;

    if (member) {
      navigation.replace('MemberDetail', { memberId: member.id });
    } else {
      // Unknown / non-Shots QR — let them try again.
      setTimeout(() => { setHandled(false); lockRef.current = false; }, 1200);
    }
  };

  if (!permission) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Scan Member" subtitle="Camera" onBack={() => navigation.goBack()} variant="gradient" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Scan Member" subtitle="Camera access needed" onBack={() => navigation.goBack()} variant="gradient" />
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
          <Text style={styles.permText}>We need camera access to scan membership QR codes.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.85}>
            <Text style={styles.permBtnText}>Grant camera access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Scan Member" subtitle="Point at the card QR" onBack={() => navigation.goBack()} variant="gradient" />
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handled ? undefined : onScanned}
        />
        {/* Aiming frame */}
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.frame} />
          <Text style={styles.hint}>
            {handled ? 'No matching member — try again' : 'Align the QR code inside the frame'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  permText: { ...typography.body, color: colors.textLight, textAlign: 'center' },
  permBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: borderRadius.lg, backgroundColor: colors.primary,
  },
  permBtnText: { ...typography.body, color: colors.white, fontWeight: '800' },
  cameraWrap: { flex: 1, backgroundColor: colors.black },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 240, height: 240,
    borderRadius: borderRadius.xl,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'transparent',
  },
  hint: {
    marginTop: spacing.xl,
    color: colors.white,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
});

export default ScanMemberScreen;
