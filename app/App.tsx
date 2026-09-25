/**
 * Root App component.
 * Wraps the app in AuthProvider and PlayerProvider,
 * then mounts the AppNavigator.
 */

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { PlayerProvider } from './src/contexts/PlayerContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PlayerProvider>
          <AppNavigator />
          <StatusBar style="dark" />
        </PlayerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
