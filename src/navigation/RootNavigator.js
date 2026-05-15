import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
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
import MenuDrawer from '../components/MenuDrawer';
import { colors, gradients } from '../styles/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const ICONS = {
  Dashboard:   { active: 'home', inactive: 'home-outline' },
  Memberships: { active: 'people', inactive: 'people-outline' },
  Tables:      { active: 'grid', inactive: 'grid-outline' },
  Finance:     { active: 'wallet', inactive: 'wallet-outline' },
};

const DashboardTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const bottomPad = (insets.bottom || (Platform.OS === 'android' ? 8 : 16)) + 6;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingTop: 6,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: (insets.bottom || 0) + 10,
          height: 64,
          borderRadius: 24,
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          paddingHorizontal: 6,
          shadowColor: '#0A0A0A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 14,
        },
        tabBarIcon: ({ focused, color }) => {
          const meta = ICONS[route.name];
          if (!meta) return null;
          if (focused) {
            return (
              <LinearGradient
                colors={gradients.brand}
                style={styles.activeIconWrap}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={meta.active} size={18} color={colors.white} />
              </LinearGradient>
            );
          }
          return <Ionicons name={meta.inactive} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Memberships" component={MembershipsScreen} />
      <Tab.Screen name="Tables" component={TablesScreen} />
      <Tab.Screen name="Finance" component={FinanceScreen} />
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
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  activeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
