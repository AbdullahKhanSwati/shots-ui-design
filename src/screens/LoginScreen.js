import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { colors, gradients, typography, spacing, borderRadius, shadows } from '../styles/theme';
import GradientButton from '../components/GradientButton';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const LoginScreen = ({ navigation, route }) => {
  const { login } = useAuth();
  const business = route.params?.business;
  const [email, setEmail] = useState(business?.defaultEmail || '');
  const [password, setPassword] = useState(business?.defaultPassword || '');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // The workspace picker is skipped, so no business is handed to us via params.
  // Prefill the Shots staff credentials directly (only while the fields are
  // still empty, so we never clobber something the user has typed).
  useEffect(() => {
    if (business) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('businesses')
        .select('default_email, default_password')
        .eq('id', 'shots')
        .maybeSingle();
      if (!active || !data) return;
      setEmail((prev) => prev || data.default_email || '');
      setPassword((prev) => prev || data.default_password || '');
    })();
    return () => { active = false; };
  }, [business]);

  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 12 }),
    ]).start();
  }, [fade, translateY]);

  const handleSubmit = async () => {
    if (!email || !password) {
      return Alert.alert('Missing info', 'Email & password are required.');
    }
    setLoading(true);
    try {
      await login(email, password);
      navigation.replace('Main');
    } catch (e) {
      Alert.alert('Sign in failed', e?.message || 'Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.splash} style={StyleSheet.absoluteFill} />
      <View style={styles.glowA} />
      <View style={styles.glowB} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          bottomOffset={24}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
            <View style={styles.brandRow}>
              <Image source={require('../../assets/brand-logo.png')} style={styles.brandLogo} resizeMode="cover" />
              <View>
                <Text style={styles.brandText}>SHOTS</Text>
                <Text style={styles.brandTag}>Staff Console</Text>
              </View>
            </View>

            <Animated.View style={[styles.card, { opacity: fade, transform: [{ translateY }] }]}>
              <Text style={styles.heading}>Welcome back</Text>
              <Text style={styles.sub}>Sign in to continue managing the club.</Text>

              <Field
                icon="mail-outline"
                label="Email"
                placeholder="staff@shots.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Field
                icon="lock-closed-outline"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                trailing={
                  <TouchableOpacity onPress={() => setShowPass((s) => !s)} hitSlop={10}>
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textLight} />
                  </TouchableOpacity>
                }
              />

              <View style={styles.rowBetween}>
                <View style={styles.rememberRow}>
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={12} color={colors.white} />
                  </View>
                  <Text style={styles.remember}>Remember me</Text>
                </View>
                <TouchableOpacity hitSlop={10}>
                  <Text style={styles.forgot}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <GradientButton
                label="Sign In"
                onPress={handleSubmit}
                loading={loading}
                icon="log-in-outline"
                style={{ marginTop: spacing.lg }}
              />
            </Animated.View>

            <Text style={styles.bottomNote}>
              New staff accounts are created from the admin dashboard.
            </Text>
          </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
};

const Field = ({ icon, label, trailing, ...rest }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={18} color={colors.textLight} />
      <TextInput
        {...rest}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      {trailing}
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  glowA: {
    position: 'absolute',
    top: -120, right: -120,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(229, 62, 62, 0.4)',
  },
  glowB: {
    position: 'absolute',
    bottom: -150, left: -100,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(127, 19, 24, 0.55)',
  },
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  brandLogo: {
    width: 48, height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.red,
  },
  brandText: {
    ...typography.h2,
    color: colors.white,
    letterSpacing: 3,
  },
  brandTag: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginTop: spacing.lg,
    ...shadows.lg,
  },
  heading: {
    ...typography.h1,
    color: colors.text,
  },
  sub: {
    ...typography.bodySmall,
    color: colors.textLight,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  field: { marginBottom: spacing.md },
  fieldLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '700',
    marginBottom: spacing.xs,
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  check: {
    width: 18, height: 18, borderRadius: 4,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  remember: {
    ...typography.bodySmall,
    color: colors.textLight,
  },
  forgot: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  bottomNote: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});

export default LoginScreen;
