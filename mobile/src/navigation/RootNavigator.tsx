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
import { navigationRef } from './navigationRef';
import EditProfileScreen from '../screens/EditProfileScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// [selected icon, unselected icon]
const TAB_ICONS: Record<keyof TabParamList, [string, string]> = {
  Home: ['home', 'home-outline'],
  Transactions: ['clipboard-list', 'clipboard-list-outline'],
  Budgets: ['wallet', 'wallet-outline'],
  Chat: ['chat-processing', 'chat-processing-outline'],
  Profile: ['account-circle', 'account-circle-outline'],
};

function Tabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.onSurface,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => (
          <Icon
            source={TAB_ICONS[route.name][focused ? 0 : 1]}
            color={color}
            size={size + 2}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'AI Chat' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
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
