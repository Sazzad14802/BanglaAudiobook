/**
 * Player context.
 * Manages audio playback state using expo-audio.
 * Keeps playback alive when navigating between screens.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AudioPlayer,
  createAudioPlayer,
  setAudioModeAsync,
  AudioStatus,
} from 'expo-audio';
import { Chapter } from '../types/chapter';
import { Audiobook } from '../types/audiobook';
import { playbackApi } from '../api/playback';
import { API_BASE_URL, PLAYBACK_SYNC_INTERVAL_MS } from '../config';

export interface PlayerState {
  audiobook: Audiobook | null;
  chapters: Chapter[];
  currentChapterIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  positionSeconds: number;
  durationSeconds: number;
}

interface PlayerContextValue extends PlayerState {
  loadAudiobook: (
    audiobook: Audiobook,
    arg2?: any,
    arg3?: any,
    arg4?: any
  ) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  nextChapter: () => Promise<void>;
  prevChapter: () => Promise<void>;
  stop: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

const INITIAL_STATE: PlayerState = {
  audiobook: null,
  chapters: [],
  currentChapterIndex: 0,
  isPlaying: false,
  isLoading: false,
  positionSeconds: 0,
  durationSeconds: 0,
};

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlayerState>(INITIAL_STATE);
  const playerRef = useRef<AudioPlayer | null>(null);
  const subRef = useRef<{ remove: () => void } | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Position and metadata tracking refs for background sync
  const currentAudiobookIdRef = useRef<string | null>(null);
  const currentChapterIdRef = useRef<string | null>(null);
  const currentPosRef = useRef<number>(0);
  const chaptersRef = useRef<Chapter[]>([]);
  const chapterIdxRef = useRef<number>(0);

  // Cleanup on unmount & initialize audio mode
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => {});

    return () => {
      if (subRef.current) {
        subRef.current.remove();
        subRef.current = null;
      }
      if (playerRef.current) {
        try {
          playerRef.current.remove();
        } catch {}
        playerRef.current = null;
      }
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, []);

  const stopSyncTimer = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  const saveProgress = useCallback(
    async (audiobookId: string, chapterId: string | null, position: number) => {
      try {
        await playbackApi.save(audiobookId, {
          chapter_id: chapterId,
          position_seconds: position,
        });
      } catch {
        // Non-fatal: best-effort progress sync
      }
    },
    [],
  );

  const startSyncTimer = useCallback(() => {
    stopSyncTimer();
    syncTimerRef.current = setInterval(() => {
      if (currentAudiobookIdRef.current) {
        saveProgress(
          currentAudiobookIdRef.current,
          currentChapterIdRef.current,
          currentPosRef.current,
        );
      }
    }, PLAYBACK_SYNC_INTERVAL_MS);
  }, [stopSyncTimer, saveProgress]);

  const loadAudiobook = useCallback(
    async (
      audiobook: Audiobook,
      arg2?: any,
      _arg3?: any,
      arg4?: any,
    ) => {
      // Support both loadAudiobook(audiobook, startPosition)
      // and legacy loadAudiobook(audiobook, chapters, startChapterIndex, startPosition)
      let startPosition = 0;
      let rawAudioUrl = audiobook.audio_url;

      if (typeof arg2 === 'number') {
        startPosition = arg2;
      } else if (Array.isArray(arg2) && arg2.length > 0) {
        if (!rawAudioUrl && arg2[0]?.audio_url) {
          rawAudioUrl = arg2[0].audio_url;
        }
        if (typeof arg4 === 'number') {
          startPosition = arg4;
        }
      }

      if (!rawAudioUrl) {
        setState((s) => ({ ...s, isLoading: false }));
        return;
      }

      currentAudiobookIdRef.current = audiobook.id;
      currentPosRef.current = startPosition;

      // Cleanup previous player & listener
      if (subRef.current) {
        subRef.current.remove();
        subRef.current = null;
      }
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.remove();
        } catch {}
        playerRef.current = null;
      }

      setState((s) => ({
        ...s,
        audiobook,
        isLoading: true,
        positionSeconds: startPosition,
        durationSeconds: audiobook.duration_seconds || s.durationSeconds,
      }));

      try {
        const fullAudioUrl = rawAudioUrl.startsWith('http')
          ? rawAudioUrl
          : `${API_BASE_URL}${rawAudioUrl.startsWith('/') ? '' : '/'}${rawAudioUrl}`;

        const player = createAudioPlayer(
          { uri: fullAudioUrl },
          { updateInterval: 500 },
        );

        playerRef.current = player;

        const sub = player.addListener(
          'playbackStatusUpdate',
          (status: AudioStatus) => {
            currentPosRef.current = status.currentTime;
            setState((s) => ({
              ...s,
              isPlaying: status.playing,
              positionSeconds: status.currentTime,
              durationSeconds: status.duration || audiobook.duration_seconds || s.durationSeconds,
              isLoading: status.isBuffering && !status.playing,
            }));
          },
        );
        subRef.current = sub;

        if (startPosition > 0) {
          await player.seekTo(startPosition);
        }
        player.play();

        setState((s) => ({
          ...s,
          isLoading: false,
          isPlaying: true,
        }));

        startSyncTimer();
      } catch {
        setState((s) => ({ ...s, isLoading: false }));
      }
    },
    [startSyncTimer],
  );

  const play = useCallback(async () => {
    playerRef.current?.play();
    setState((s) => ({ ...s, isPlaying: true }));
  }, []);

  const pause = useCallback(async () => {
    playerRef.current?.pause();
    setState((s) => ({ ...s, isPlaying: false }));

    if (currentAudiobookIdRef.current) {
      await saveProgress(
        currentAudiobookIdRef.current,
        currentChapterIdRef.current,
        currentPosRef.current,
      );
    }
  }, [saveProgress]);

  const seek = useCallback(async (seconds: number) => {
    currentPosRef.current = seconds;
    setState((s) => ({ ...s, positionSeconds: seconds }));
    await playerRef.current?.seekTo(seconds);
  }, []);

  const nextChapter = useCallback(async () => {
    // Jump forward 15 seconds
    currentPosRef.current += 15;
    await seek(currentPosRef.current);
  }, [seek]);

  const prevChapter = useCallback(async () => {
    // Jump back 15 seconds
    currentPosRef.current = Math.max(0, currentPosRef.current - 15);
    await seek(currentPosRef.current);
  }, [seek]);

  const stop = useCallback(async () => {
    stopSyncTimer();
    if (subRef.current) {
      subRef.current.remove();
      subRef.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.remove();
      } catch {}
      playerRef.current = null;
    }
    currentAudiobookIdRef.current = null;
    currentChapterIdRef.current = null;
    currentPosRef.current = 0;
    setState(INITIAL_STATE);
  }, [stopSyncTimer]);

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        loadAudiobook,
        play,
        pause,
        seek,
        nextChapter,
        prevChapter,
        stop,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}
