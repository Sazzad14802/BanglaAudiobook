/**
 * MainNavigator — 5-Tab Navigation matching Figma Plates 3, 4, 5.
 * Features custom bottom tab bar with docked persistent mini-player.
 * Tabs: ● হোম, ○ খুঁজুন, ○ লাইব্রেরি, ✦ তৈরি, ○ প্রোফাইল
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  CreateStackParamList,
  ExploreStackParamList,
  HomeStackParamList,
  LibraryStackParamList,
  MainTabParamList,
  ProfileStackParamList,
} from './types';
import { Colors } from '../theme';
import { CustomBottomTabBar } from './CustomBottomTabBar';

// Screens
import { HomeScreen } from '../screens/home/HomeScreen';
import { DiscoveryStatesScreen } from '../screens/home/DiscoveryStatesScreen';
import { ExploreScreen } from '../screens/explore/ExploreScreen';
import { SearchResultsScreen } from '../screens/explore/SearchResultsScreen';
import { LibraryScreen } from '../screens/library/LibraryScreen';
import { CreateAudiobookScreen } from '../screens/create/CreateAudiobookScreen';
import { UploadSourceScreen } from '../screens/create/UploadSourceScreen';
import { GenerationStatusScreen } from '../screens/create/GenerationStatusScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AudiobookDetailsScreen } from '../screens/audiobook/AudiobookDetailsScreen';
import { PlayerScreen } from '../screens/audiobook/PlayerScreen';
import { ChaptersQueueScreen } from '../screens/audiobook/ChaptersQueueScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const stackScreenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: Colors.background },
};

// 1. Home Stack
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="AudiobookDetails" component={AudiobookDetailsScreen} />
      <HomeStack.Screen name="Player" component={PlayerScreen} />
      <HomeStack.Screen name="ChaptersQueue" component={ChaptersQueueScreen} />
      <HomeStack.Screen name="DiscoveryStates" component={DiscoveryStatesScreen} />
    </HomeStack.Navigator>
  );
}

// 2. Explore Stack
const ExploreStack = createNativeStackNavigator<ExploreStackParamList>();
function ExploreStackNavigator() {
  return (
    <ExploreStack.Navigator screenOptions={stackScreenOptions}>
      <ExploreStack.Screen name="Explore" component={ExploreScreen} />
      <ExploreStack.Screen name="SearchResults" component={SearchResultsScreen} />
      <ExploreStack.Screen name="AudiobookDetails" component={AudiobookDetailsScreen} />
      <ExploreStack.Screen name="Player" component={PlayerScreen} />
    </ExploreStack.Navigator>
  );
}

// 3. Library Stack
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
function LibraryStackNavigator() {
  return (
    <LibraryStack.Navigator screenOptions={stackScreenOptions}>
      <LibraryStack.Screen name="Library" component={LibraryScreen} />
      <LibraryStack.Screen name="AudiobookDetails" component={AudiobookDetailsScreen} />
      <LibraryStack.Screen name="Player" component={PlayerScreen} />
    </LibraryStack.Navigator>
  );
}

// 4. Create Stack
const CreateStack = createNativeStackNavigator<CreateStackParamList>();
function CreateStackNavigator() {
  return (
    <CreateStack.Navigator screenOptions={stackScreenOptions}>
      <CreateStack.Screen name="CreateAudiobook" component={CreateAudiobookScreen} />
      <CreateStack.Screen name="UploadSource" component={UploadSourceScreen} />
      <CreateStack.Screen name="GenerationStatus" component={GenerationStatusScreen} />
      <CreateStack.Screen name="AudiobookDetails" component={AudiobookDetailsScreen} />
      <CreateStack.Screen name="Player" component={PlayerScreen} />
    </CreateStack.Navigator>
  );
}

// 5. Profile Stack
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOptions}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="AudiobookDetails" component={AudiobookDetailsScreen} />
      <ProfileStack.Screen name="Player" component={PlayerScreen} />
    </ProfileStack.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomBottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} />
      <Tab.Screen name="ExploreTab" component={ExploreStackNavigator} />
      <Tab.Screen name="LibraryTab" component={LibraryStackNavigator} />
      <Tab.Screen name="CreateTab" component={CreateStackNavigator} />
      <Tab.Screen name="ProfileTab" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}
