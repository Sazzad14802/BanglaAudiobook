/**
 * Navigation type definitions.
 * Centralized param lists for all navigators.
 */

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
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
  AudiobookDetails: { audiobookId: string };
  Player: { audiobookId: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  LibraryTab: undefined;
  CreateTab: undefined;
  ProfileTab: undefined;
};
