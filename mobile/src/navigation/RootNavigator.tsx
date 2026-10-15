import React from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, useTheme } from 'react-native-paper';

import { useAppSelector } from '../store/hooks';
import BrandGlyph from '../components/BrandGlyph';
import type {
  AuthStackParamList,
  MainStackParamList,
  TabParamList,
} from './types';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import TransactionFormScreen from '../screens/TransactionFormScreen';
import BudgetsScreen from '../screens/BudgetsScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AccountsScreen from '../screens/AccountsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import SafetyScreen from '../screens/SafetyScreen';
import { navigationRef } from './navigationRef';
import EditProfileScreen from '../screens/EditProfileScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// [selected icon, unselected icon]
const TAB_ICONS: Record<keyof TabParamList, [string, string]> = {
  Home: ['home', 'home-outline'],
  Assistant: ['creation', 'creation-outline'],
  Activity: ['chart-box', 'chart-box-outline'],
  Goals: ['bullseye-arrow', 'bullseye'],
  Safety: ['shield-check', 'shield-check-outline'],
};

function tabIcon(name: keyof TabParamList) {
  return ({
    focused,
    color,
    size,
  }: {
    focused: boolean;
    color: string;
    size: number;
  }) =>
    React.createElement(Icon, {
      source: TAB_ICONS[name][focused ? 0 : 1],
      color,
      size: focused ? size + 2 : size,
    });
}

const TAB_ICON_RENDERERS: Record<
  keyof TabParamList,
  (props: { focused: boolean; color: string; size: number }) => React.ReactNode
> = {
  Home: tabIcon('Home'),
  Assistant: ({ focused, color, size }) =>
    React.createElement(BrandGlyph, {
      size: focused ? size + 2 : size,
      color,
      strokeWidth: 7,
    }),
  Activity: tabIcon('Activity'),
  Goals: tabIcon('Goals'),
  Safety: tabIcon('Safety'),
};

function Tabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.secondary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          borderTopWidth: 1,
          height: 68,
          paddingTop: 7,
          paddingBottom: 7,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarItemStyle: { borderRadius: 14, marginHorizontal: 3 },
        tabBarIcon: TAB_ICON_RENDERERS[route.name],
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Assistant" component={ChatScreen} />
      <Tab.Screen name="Activity" component={TransactionsScreen} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen name="Safety" component={SafetyScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const theme = useTheme();
  const signedIn = useAppSelector(s => s.auth.signedIn);

  const base = theme.dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
      notification: theme.colors.error,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {signedIn ? (
        <MainStack.Navigator>
          <MainStack.Screen
            name="Tabs"
            component={Tabs}
            options={{ headerShown: false }}
          />
          <MainStack.Screen
            name="TransactionForm"
            component={TransactionFormScreen}
            options={{
              title: 'Add transaction',
              presentation: 'modal',
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.onSurface,
            }}
          />
          <MainStack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{
              title: 'Edit profile',
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.onSurface,
            }}
          />
          <MainStack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: 'Profile & settings',
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.onSurface,
            }}
          />
          <MainStack.Screen
            name="Budgets"
            component={BudgetsScreen}
            options={{
              title: 'Monthly budgets',
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.onSurface,
            }}
          />
          <MainStack.Screen
            name="Accounts"
            component={AccountsScreen}
            options={{
              title: 'Accounts & balances',
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.onSurface,
            }}
          />
        </MainStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Signup" component={SignupScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
