/**
 * Navigation type definitions.
 * Centralized param lists for all navigators matching Figma architecture.
 */

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  LanguageSelect: undefined;
  NotificationsPrompt: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  AudiobookDetails: { audiobookId: string };
  Player: { audiobookId: string };
  ChaptersQueue: { audiobookId: string };
  DiscoveryStates: undefined;
};

export type ExploreStackParamList = {
  Explore: undefined;
  SearchResults: { query?: string };
  AudiobookDetails: { audiobookId: string };
  Player: { audiobookId: string };
};

export type LibraryStackParamList = {
  Library: undefined;
  AudiobookDetails: { audiobookId: string };
  Player: { audiobookId: string };
};

export type CreateStackParamList = {
  CreateAudiobook: undefined;
  UploadSource: { audiobookId: string };
  GenerationStatus: { audiobookId: string };
  AudiobookDetails: { audiobookId: string };
  Player: { audiobookId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  PublisherApplication: undefined;
  CopyrightReport: { audiobookId?: string };
  AudiobookDetails: { audiobookId: string };
  Player: { audiobookId: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  ExploreTab: undefined;
  LibraryTab: undefined;
  CreateTab: undefined;
  ProfileTab: undefined;
};
