/**
 * AuthNavigator — Entry, onboarding, permissions, and auth flow.
 * Matches Figma Plates 1 and 2.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { SplashScreen } from '../screens/entry/SplashScreen';
import { OnboardingScreen } from '../screens/entry/OnboardingScreen';
import { LanguageSelectScreen } from '../screens/entry/LanguageSelectScreen';
import { NotificationsPromptScreen } from '../screens/entry/NotificationsPromptScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { Colors } from '../theme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Splash">
        {({ navigation }) => (
          <SplashScreen onContinue={() => navigation.navigate('Onboarding')} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Onboarding">
        {({ navigation }) => (
          <OnboardingScreen onFinish={() => navigation.navigate('LanguageSelect')} />
        )}
      </Stack.Screen>

      <Stack.Screen name="LanguageSelect">
        {({ navigation }) => (
          <LanguageSelectScreen
            onBack={() => navigation.goBack()}
            onContinue={() => navigation.navigate('NotificationsPrompt')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="NotificationsPrompt">
        {({ navigation }) => (
          <NotificationsPromptScreen
            onBack={() => navigation.goBack()}
            onAllow={() => navigation.navigate('Login')}
            onSkip={() => navigation.navigate('Login')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
