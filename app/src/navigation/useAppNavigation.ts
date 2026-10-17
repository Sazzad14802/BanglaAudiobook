/**
 * Typed navigation helpers shared by every screen.
 */

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CreateStackParamList,
  ExploreStackParamList,
  MainTabParamList,
  ProfileStackParamList,
  SharedStackParamList,
} from './types';

/** Union of every stack route so any screen can push a shared or local route. */
export type AppStackParamList = SharedStackParamList &
  ExploreStackParamList &
  CreateStackParamList &
  ProfileStackParamList & { Home: undefined; Library: undefined };

export type AppNavigation = NativeStackNavigationProp<AppStackParamList>;

export function useAppNavigation() {
  const navigation = useNavigation<AppNavigation>();

  /** Jump to a screen that lives in another tab's stack (e.g. Subscription in Profile). */
  function goToTab<T extends keyof MainTabParamList>(tab: T, params?: MainTabParamList[T]) {
    const target: { navigate: (name: string, params?: object) => void } = navigation.getParent() ?? (navigation as any);
    target.navigate(tab, params as object | undefined);
  }

  return { navigation, goToTab };
}
