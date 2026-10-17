/**
 * Root AppNavigator: auth flow while signed out, the tab app once signed in.
 * Deep links (`bornoverse://…`, Expo Go `exp://…/--/…`) are handled by the
 * payment flow through expo-web-browser, so no linking config is needed here.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { Loading } from '../components/Loading';
import { navigationRef } from './navigationRef';

export function AppNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <Loading fullScreen message="" />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
