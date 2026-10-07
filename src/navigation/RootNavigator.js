import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Platform, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import SplashScreen from '../screens/SplashScreen';
import BusinessSelectionScreen from '../screens/BusinessSelectionScreen';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import MembershipsScreen from '../screens/MembershipsScreen';
import TablesScreen from '../screens/TablesScreen';
import FinanceScreen from '../screens/FinanceScreen';
import AddMemberScreen from '../screens/AddMemberScreen';
import MemberDetailScreen from '../screens/MemberDetailScreen';
import TableDetailScreen from '../screens/TableDetailScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import BookingFormScreen from '../screens/BookingFormScreen';
import ScanMemberScreen from '../screens/ScanMemberScreen';
import MenuDrawer from '../components/MenuDrawer';
import { useAuth } from '../context/AuthContext';
import { colors, gradients } from '../styles/theme';

// Dashboard (revenue/finance overview) is only shown to admins/owners.
export function isAdminRole(role) {
  return ['admin', 'owner'].includes(String(role || '').toLowerCase());
}

// Where a signed-in user lands: the Dashboard when they may see it, otherwise
// Bookings. `initialRouteName` is read ONCE when the tabs mount, so the role has
// to be known by then — see the gate in DashboardTabNavigator.
function landingTab(role) {
  return isAdminRole(role) ? 'Dashboard' : 'Bookings';
}

// How long to wait for the role before giving up and showing Bookings. Only
// reached when the profile can't be fetched (offline with nothing cached).
const ROLE_WAIT_MS = 2500;

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Same order as the side drawer
// NOTE: Finance is intentionally hidden from the tab bar for now (the screen
// and its code are kept — see FinanceScreen / the commented Tab.Screen below).
const TAB_ICONS = {
  Dashboard:   { active: 'home',    inactive: 'home-outline' },
  Members:     { active: 'people',  inactive: 'people-outline' },
  Bookings:    { active: 'grid',    inactive: 'grid-outline' },
  Expense:     { active: 'receipt', inactive: 'receipt-outline' },
};

const DashboardTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const role = session?.profile?.role;
  const isAdmin = isAdminRole(role);

  // The profile (and with it the role) is fetched after sign-in, so right after
  // logging in the role is usually still unknown. Mounting the tabs then would
  // fix the landing tab as Bookings for everyone — admins included, which is
  // why they used to land on the wrong screen. Hold the tabs for a moment until
  // the role is known, with a short cap so an unreachable profile can't hang.
  const [roleReady, setRoleReady] = useState(() => !!role);
  useEffect(() => {
    if (role) { setRoleReady(true); return undefined; }
    const t = setTimeout(() => setRoleReady(true), ROLE_WAIT_MS);
    return () => clearTimeout(t);
  }, [role]);

  if (!roleReady) {
    return (
      <View style={styles.landingGate}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Tab.Navigator
      initialRouteName={landingTab(role)}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarItemStyle: { paddingTop: 6 },
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: (insets.bottom || 0) + 10,
          height: 64,
          borderRadius: 24,
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          paddingHorizontal: 4,
          shadowColor: '#0A0A0A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 14,
        },
        tabBarIcon: ({ focused, color }) => {
          const meta = TAB_ICONS[route.name];
          if (!meta) return null;
          if (focused) {
            return (
              <LinearGradient
                colors={gradients.brand}
                style={styles.activeIconWrap}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={meta.active} size={16} color={colors.white} />
              </LinearGradient>
            );
          }
          return <Ionicons name={meta.inactive} size={20} color={color} />;
        },
      })}
    >
      {isAdmin && <Tab.Screen name="Dashboard"   component={DashboardScreen} />}
      <Tab.Screen name="Members"     component={MembershipsScreen} />
      <Tab.Screen name="Bookings"    component={TablesScreen} />
      {/* Finance hidden for now — keep the screen, just don't surface the tab.
      <Tab.Screen name="Finance"     component={FinanceScreen} /> */}
      <Tab.Screen name="Expense"     component={AddExpenseScreen} options={{ title: 'Add' }} />
    </Tab.Navigator>
  );
};

const MainDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <MenuDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: colors.surface, width: 280 },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textLight,
      }}
    >
      <Drawer.Screen name="MainTabs" component={DashboardTabNavigator} />
    </Drawer.Navigator>
  );
};

const RootNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="BusinessSelection" component={BusinessSelectionScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={MainDrawerNavigator} />
      <Stack.Screen name="AddMember" component={AddMemberScreen} />
      <Stack.Screen name="MemberDetail" component={MemberDetailScreen} />
      <Stack.Screen name="TableDetail" component={TableDetailScreen} />
      <Stack.Screen name="BookingForm" component={BookingFormScreen} />
      <Stack.Screen name="ScanMember" component={ScanMemberScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  landingGate: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  activeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
});

export default RootNavigator;
