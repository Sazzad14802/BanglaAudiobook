/**
 * MainNavigator — bottom-tab + nested stacks for authenticated users.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';

import {
  CreateStackParamList,
  HomeStackParamList,
  LibraryStackParamList,
  MainTabParamList,
  ProfileStackParamList,
} from './types';
import { Colors, FontSizes } from '../theme';

// Screens
import { HomeScreen } from '../screens/home/HomeScreen';
import { LibraryScreen } from '../screens/library/LibraryScreen';
import { CreateAudiobookScreen } from '../screens/create/CreateAudiobookScreen';
import { UploadSourceScreen } from '../screens/create/UploadSourceScreen';
import { GenerationStatusScreen } from '../screens/create/GenerationStatusScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AudiobookDetailsScreen } from '../screens/audiobook/AudiobookDetailsScreen';
import { PlayerScreen } from '../screens/audiobook/PlayerScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: Colors.surface },
  headerTintColor: Colors.textPrimary,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: Colors.background },
};

// --- Home Stack ---
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ title: 'Discover' }} />
      <HomeStack.Screen
        name="AudiobookDetails"
        component={AudiobookDetailsScreen}
        options={{ title: 'Audiobook Details' }}
      />
      <HomeStack.Screen
        name="Player"
        component={PlayerScreen}
        options={{ title: 'Now Playing', headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

// --- Library Stack ---
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
function LibraryStackNavigator() {
  return (
    <LibraryStack.Navigator screenOptions={stackScreenOptions}>
      <LibraryStack.Screen name="Library" component={LibraryScreen} options={{ title: 'My Library' }} />
      <LibraryStack.Screen
        name="AudiobookDetails"
        component={AudiobookDetailsScreen}
        options={{ title: 'Audiobook Details' }}
      />
      <LibraryStack.Screen
        name="Player"
        component={PlayerScreen}
        options={{ title: 'Now Playing', headerShown: false }}
      />
    </LibraryStack.Navigator>
  );
}

// --- Create Stack ---
const CreateStack = createNativeStackNavigator<CreateStackParamList>();
function CreateStackNavigator() {
  return (
    <CreateStack.Navigator screenOptions={stackScreenOptions}>
      <CreateStack.Screen
        name="CreateAudiobook"
        component={CreateAudiobookScreen}
        options={{ title: 'Create Audiobook' }}
      />
      <CreateStack.Screen
        name="UploadSource"
        component={UploadSourceScreen}
        options={{ title: 'Upload PDF' }}
      />
      <CreateStack.Screen
        name="GenerationStatus"
        component={GenerationStatusScreen}
        options={{ title: 'Generation Status' }}
      />
      <CreateStack.Screen
        name="AudiobookDetails"
        component={AudiobookDetailsScreen}
        options={{ title: 'Audiobook Details' }}
      />
      <CreateStack.Screen
        name="Player"
        component={PlayerScreen}
        options={{ title: 'Now Playing', headerShown: false }}
      />
    </CreateStack.Navigator>
  );
}

// --- Profile Stack ---
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOptions}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <ProfileStack.Screen
        name="AudiobookDetails"
        component={AudiobookDetailsScreen}
        options={{ title: 'Audiobook Details' }}
      />
      <ProfileStack.Screen
        name="Player"
        component={PlayerScreen}
        options={{ title: 'Now Playing', headerShown: false }}
      />
    </ProfileStack.Navigator>
  );
}

// --- Tab icon helper ---
function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
    </View>
  );
}

// --- Bottom Tab ---
export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.surfaceBorder,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: FontSizes.xs, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryStackNavigator}
        options={{
          tabBarLabel: 'Library',
          tabBarIcon: ({ focused }) => <TabIcon icon="📚" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="CreateTab"
        component={CreateStackNavigator}
        options={{
          tabBarLabel: 'Create',
          tabBarIcon: ({ focused }) => <TabIcon icon="➕" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
