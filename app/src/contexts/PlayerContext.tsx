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
import { PLAYBACK_SYNC_INTERVAL_MS } from '../config';

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
    chapters: Chapter[],
    startChapterIndex?: number,
    startPosition?: number
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

  const loadChapter = useCallback(
    async (chapters: Chapter[], index: number, startPosition = 0) => {
      const chapter = chapters[index];
      if (!chapter?.audio_url) {
        setState((s) => ({ ...s, isLoading: false }));
        return;
      }

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

      chapterIdxRef.current = index;
      chaptersRef.current = chapters;
      currentChapterIdRef.current = chapter.id;
      currentPosRef.current = startPosition;

      setState((s) => ({
        ...s,
        isLoading: true,
        currentChapterIndex: index,
        positionSeconds: startPosition,
      }));

      try {
        const player = createAudioPlayer(
          { uri: chapter.audio_url },
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
              durationSeconds: status.duration || s.durationSeconds,
              isLoading: status.isBuffering && !status.playing,
            }));

            // Auto-advance to next chapter if finished
            if (status.didJustFinish) {
              const nextIndex = chapterIdxRef.current + 1;
              if (nextIndex < chaptersRef.current.length) {
                loadChapter(chaptersRef.current, nextIndex, 0);
              }
            }
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
      } catch {
        setState((s) => ({ ...s, isLoading: false }));
      }
    },
    [],
  );

  const loadAudiobook = useCallback(
    async (
      audiobook: Audiobook,
      chapters: Chapter[],
      startChapterIndex = 0,
      startPosition = 0,
    ) => {
      currentAudiobookIdRef.current = audiobook.id;
      chaptersRef.current = chapters;
      chapterIdxRef.current = startChapterIndex;

      setState((s) => ({ ...s, audiobook, chapters, isLoading: true }));

      await loadChapter(chapters, startChapterIndex, startPosition);
      startSyncTimer();
    },
    [loadChapter, startSyncTimer],
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
    const nextIndex = chapterIdxRef.current + 1;
    if (nextIndex < chaptersRef.current.length) {
      await loadChapter(chaptersRef.current, nextIndex, 0);
    }
  }, [loadChapter]);

  const prevChapter = useCallback(async () => {
    const prevIndex = chapterIdxRef.current - 1;
    if (prevIndex >= 0) {
      await loadChapter(chaptersRef.current, prevIndex, 0);
    } else {
      await seek(0);
    }
  }, [loadChapter, seek]);

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
