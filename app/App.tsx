/**
 * Root component: composes the app-wide providers (language → session →
 * notifications → audio player) and mounts the navigator.
 */

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { NotificationsProvider } from './src/contexts/NotificationsContext';
import { PlayerProvider } from './src/contexts/PlayerContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationsProvider>
            <PlayerProvider>
              <AppNavigator />
              <StatusBar style="dark" />
            </PlayerProvider>
          </NotificationsProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
