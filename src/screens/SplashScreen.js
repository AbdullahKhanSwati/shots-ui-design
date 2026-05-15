import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, typography, spacing } from '../styles/theme';

const SplashScreen = ({ navigation }) => {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const dotsAnim = useRef([new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 6, bounciness: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.loop(
        Animated.timing(rotate, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true })
      ),
    ]).start();

    const animateDots = () => {
      Animated.sequence([
        Animated.stagger(180, dotsAnim.map((d) =>
          Animated.sequence([
            Animated.timing(d, { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.timing(d, { toValue: 0.3, duration: 280, useNativeDriver: true }),
          ])
        )),
      ]).start(() => animateDots());
    };
    animateDots();

    const timer = setTimeout(() => navigation.replace('BusinessSelection'), 2200);
    return () => clearTimeout(timer);
  }, [navigation, scale, opacity, rotate, dotsAnim]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <LinearGradient colors={gradients.splash} style={styles.container}>
      <Animated.View style={[styles.ringOuter, { transform: [{ rotate: spin }] }]} />
      <Animated.View style={[styles.ringInner, { transform: [{ rotate: spin }] }]} />

      <Animated.View style={[styles.logoWrap, { transform: [{ scale }], opacity }]}>
        <LinearGradient colors={gradients.brand} style={styles.logoCircle}>
          <Ionicons name="game-controller" size={56} color={colors.white} />
        </LinearGradient>
      </Animated.View>

      <Animated.View style={{ opacity, alignItems: 'center' }}>
        <Text style={styles.appName}>SHOTS</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>Snooker & Pool Club Manager</Text>
      </Animated.View>

      <View style={styles.dotsRow}>
        {dotsAnim.map((d, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: d, transform: [{ scale: d }] }]} />
        ))}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    borderWidth: 1,
    borderColor: 'rgba(229,62,62,0.15)',
    borderStyle: 'dashed',
  },
  ringInner: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: 'rgba(229,62,62,0.25)',
  },
  logoWrap: {
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53E3E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  appName: {
    ...typography.display,
    color: colors.white,
    letterSpacing: 8,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginVertical: spacing.md,
  },
  subtitle: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});

export default SplashScreen;
