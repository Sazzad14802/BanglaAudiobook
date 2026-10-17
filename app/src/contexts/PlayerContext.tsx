/**
 * Player context — one app-wide audio session (Provider + Facade).
 *
 * Responsibilities:
 * - Load a book's signed chapter manifest (or a decrypted offline copy) and play it.
 * - Keep one listening session per book: chapter changes renew grants on the same
 *   session so the server's listening-time accounting is not reset.
 * - Sync position to the server and send listening heartbeats while playing.
 * - Auto-advance chapters, playback speed, sleep timer, lock-screen controls.
 * Errors are surfaced through `error` so screens can show them.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { ApiError, errorMessage } from '../api/client';
import { playbackApi } from '../api/playback';
import { MEDIA_GRANT_REFRESH_MS, PLAYBACK_SYNC_INTERVAL_MS, resolveMediaUrl } from '../config';
import { offline } from '../storage/offline';
import { Audiobook } from '../types/audiobook';
import { PlayManifestChapter } from '../types/domain';
import { useAuth } from './AuthContext';

export interface PlayerChapter extends PlayManifestChapter {
  /** Offline copies carry their license expiry (epoch ms). */
  offline_expires?: number;
}

interface PlayerState {
  audiobook: Audiobook | null;
  chapters: PlayerChapter[];
  currentChapterIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  positionSeconds: number;
  durationSeconds: number;
  playbackRate: number;
  sleepEndsAt: number | null;
  isOffline: boolean;
  error: string | null;
}

export interface LoadOptions {
  chapterIndex?: number;
  position?: number;
  /** Resume from the server-saved position (default true when no chapter is given). */
  resume?: boolean;
}

interface PlayerContextValue extends PlayerState {
  loadAudiobook: (book: Audiobook, options?: LoadOptions) => Promise<void>;
  loadOffline: (book: Audiobook, chapters: PlayerChapter[]) => Promise<void>;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => Promise<void>;
  skip: (deltaSeconds: number) => Promise<void>;
  selectChapter: (index: number) => Promise<void>;
  nextChapter: () => Promise<void>;
  prevChapter: () => Promise<void>;
  setSpeed: (rate: number) => void;
  setSleepTimer: (minutes: number) => void;
  stop: () => Promise<void>;
  clearError: () => void;
}

const initialState: PlayerState = {
  audiobook: null,
  chapters: [],
  currentChapterIndex: 0,
  isPlaying: false,
  isLoading: false,
  positionSeconds: 0,
  durationSeconds: 0,
  playbackRate: 1,
  sleepEndsAt: null,
  isOffline: false,
  error: null,
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<PlayerState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const player = useRef<AudioPlayer | null>(null);
  const subscription = useRef<{ remove: () => void } | null>(null);
  const sessionId = useRef<string | undefined>(undefined);
  const grantIssuedAt = useRef(0);
  const finished = useRef(false);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadEpoch = useRef(0);
  const advanceRef = useRef<() => void>(() => {});

  const disposePlayer = useCallback(() => {
    subscription.current?.remove();
    subscription.current = null;
    try {
      player.current?.setActiveForLockScreen(false);
    } catch {}
    player.current?.remove();
    player.current = null;
  }, []);

  const fail = useCallback((error: unknown) => {
    setState((s) => ({ ...s, isLoading: false, isPlaying: false, error: errorMessage(error) }));
  }, []);

  const stop = useCallback(async () => {
    loadEpoch.current++;
    disposePlayer();
    sessionId.current = undefined;
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
    sleepTimer.current = null;
    setState(initialState);
    offline.clearPlayback();
  }, [disposePlayer]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});
    return () => {
      disposePlayer();
      offline.clearPlayback();
      if (sleepTimer.current) clearTimeout(sleepTimer.current);
    };
  }, [disposePlayer]);

  // A different (or no) signed-in user must never inherit the previous session.
  useEffect(() => {
    stop();
  }, [user?.id, stop]);

  /** Push the current position to the server (best effort, online books only). */
  const syncProgress = useCallback(async () => {
    const s = stateRef.current;
    if (!s.audiobook || s.isOffline) return;
    const chapter = s.chapters[s.currentChapterIndex];
    await playbackApi
      .saveProgress(s.audiobook.id, { chapter_id: chapter?.id ?? null, position_seconds: s.positionSeconds })
      .catch(() => {});
  }, []);

  /** Create the native player for one chapter and start playback. */
  const startChapter = useCallback(
    (book: Audiobook, chapters: PlayerChapter[], index: number, position: number, isOffline: boolean) => {
      const chapter = chapters[index];
      const uri = resolveMediaUrl(chapter?.audio_url);
      if (!chapter || !uri) throw new Error('No audio is ready for this chapter yet.');

      disposePlayer();
      finished.current = false;
      const rate = stateRef.current.playbackRate;

      setState((s) => ({
        ...s,
        audiobook: book,
        chapters,
        currentChapterIndex: index,
        isLoading: true,
        isOffline,
        error: null,
        positionSeconds: position,
        durationSeconds: chapter.duration_seconds,
      }));

      const instance = createAudioPlayer({ uri }, { updateInterval: 500 });
      player.current = instance;
      subscription.current = instance.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (player.current !== instance) return;
        setState((s) => ({
          ...s,
          isPlaying: status.playing,
          positionSeconds: status.currentTime,
          durationSeconds: status.duration || chapter.duration_seconds,
          isLoading: !status.isLoaded || (status.isBuffering && !status.playing),
        }));
        if (status.didJustFinish && !finished.current) {
          finished.current = true;
          advanceRef.current();
        }
      });

      try {
        instance.setActiveForLockScreen(
          true,
          {
            title: `${book.title} · ${chapter.title}`,
            artist: book.author ?? 'BornoVerse',
            artworkUrl: resolveMediaUrl(book.cover_image_url),
          },
          { showSeekForward: true, showSeekBackward: true },
        );
      } catch {}

      if (rate !== 1) instance.setPlaybackRate(rate);
      if (position > 0) instance.seekTo(position).catch(() => {});
      instance.play();
    },
    [disposePlayer],
  );

  /** Fetch (or renew) signed URLs on the current listening session. */
  const fetchManifest = useCallback(async (book: Audiobook, renew: boolean) => {
    const manifest = await playbackApi.manifest(book.id, renew ? sessionId.current : undefined);
    sessionId.current = manifest.session_id;
    grantIssuedAt.current = Date.now();
    return manifest.chapters as PlayerChapter[];
  }, []);

  const loadAudiobook = useCallback(
    async (book: Audiobook, options: LoadOptions = {}) => {
      const epoch = ++loadEpoch.current;
      await syncProgress();
      sessionId.current = undefined;
      setState((s) => ({ ...s, audiobook: book, chapters: [], isLoading: true, error: null }));
      try {
        const chapters = await fetchManifest(book, false);
        if (epoch !== loadEpoch.current) return;
        if (!chapters.length) throw new Error('This audiobook has no playable audio yet.');

        let index = options.chapterIndex ?? 0;
        let position = options.position ?? 0;
        const resume = options.resume ?? options.chapterIndex === undefined;
        if (resume) {
          const saved = await playbackApi.progress(book.id).catch(() => null);
          const savedIndex = saved ? chapters.findIndex((c) => c.id === saved.chapter_id) : -1;
          if (saved && savedIndex >= 0) {
            index = savedIndex;
            // Restart a chapter that was effectively finished.
            const nearEnd = saved.position_seconds >= chapters[savedIndex].duration_seconds - 3;
            position = nearEnd ? 0 : saved.position_seconds;
          }
        }
        if (epoch !== loadEpoch.current) return;
        startChapter(book, chapters, Math.min(index, chapters.length - 1), position, false);
      } catch (error) {
        if (epoch === loadEpoch.current) fail(error);
        throw error;
      }
    },
    [fetchManifest, startChapter, syncProgress, fail],
  );

  const loadOffline = useCallback(
    async (book: Audiobook, chapters: PlayerChapter[]) => {
      loadEpoch.current++;
      await syncProgress();
      sessionId.current = undefined;
      try {
        startChapter(book, chapters, 0, 0, true);
      } catch (error) {
        fail(error);
        throw error;
      }
    },
    [startChapter, syncProgress, fail],
  );

  const offlineExpired = useCallback(() => {
    const s = stateRef.current;
    const expires = s.chapters[0]?.offline_expires ?? 0;
    return s.isOffline && Date.now() >= expires;
  }, []);

  const selectChapter = useCallback(
    async (index: number) => {
      const s = stateRef.current;
      if (!s.audiobook || index < 0 || index >= s.chapters.length) return;
      if (s.isOffline) {
        if (offlineExpired()) {
          await stop();
          throw new Error('Offline license expired. Connect to the internet and download again.');
        }
        startChapter(s.audiobook, s.chapters, index, 0, true);
        return;
      }
      await syncProgress();
      try {
        let chapters = s.chapters;
        if (Date.now() - grantIssuedAt.current > MEDIA_GRANT_REFRESH_MS) {
          chapters = await fetchManifest(s.audiobook, true);
        }
        startChapter(s.audiobook, chapters, index, 0, false);
      } catch (error) {
        fail(error);
        throw error;
      }
    },
    [fetchManifest, offlineExpired, startChapter, stop, syncProgress, fail],
  );

  advanceRef.current = () => {
    const s = stateRef.current;
    if (s.currentChapterIndex + 1 < s.chapters.length) {
      selectChapter(s.currentChapterIndex + 1).catch(() => {});
    } else {
      syncProgress();
    }
  };

  // Periodic progress sync + listening heartbeat while playing.
  useEffect(() => {
    const timer = setInterval(async () => {
      const s = stateRef.current;
      if (!s.audiobook) return;
      if (s.isOffline) {
        if (offlineExpired()) stop();
        return;
      }
      if (!s.isPlaying) return;
      try {
        await playbackApi.saveProgress(s.audiobook.id, {
          chapter_id: s.chapters[s.currentChapterIndex]?.id ?? null,
          position_seconds: s.positionSeconds,
        });
        if (sessionId.current) await playbackApi.heartbeat(sessionId.current, s.positionSeconds);
      } catch (error) {
        // Access was revoked (suspension, subscription lapse, moderation): stop playback.
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          player.current?.pause();
          fail(error);
        }
      }
    }, PLAYBACK_SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fail, offlineExpired, stop]);

  const play = useCallback(() => {
    if (offlineExpired()) {
      stop();
      fail(new Error('Offline license expired. Connect to the internet and download again.'));
      return;
    }
    if (finished.current) {
      finished.current = false;
      player.current?.seekTo(0).catch(() => {});
    }
    player.current?.play();
  }, [offlineExpired, stop, fail]);

  const pause = useCallback(() => {
    player.current?.pause();
    syncProgress();
  }, [syncProgress]);

  const togglePlay = useCallback(() => {
    if (stateRef.current.isPlaying) pause();
    else play();
  }, [play, pause]);

  const seek = useCallback(async (seconds: number) => {
    const duration = stateRef.current.durationSeconds;
    const target = Math.max(0, duration ? Math.min(seconds, duration - 0.5) : seconds);
    setState((s) => ({ ...s, positionSeconds: target }));
    await player.current?.seekTo(target);
  }, []);

  const skip = useCallback((delta: number) => seek(stateRef.current.positionSeconds + delta), [seek]);

  const setSpeed = useCallback((rate: number) => {
    player.current?.setPlaybackRate(rate);
    setState((s) => ({ ...s, playbackRate: rate }));
  }, []);

  const setSleepTimer = useCallback(
    (minutes: number) => {
      if (sleepTimer.current) clearTimeout(sleepTimer.current);
      sleepTimer.current = null;
      if (minutes <= 0) {
        setState((s) => ({ ...s, sleepEndsAt: null }));
        return;
      }
      const ms = minutes * 60_000;
      sleepTimer.current = setTimeout(() => {
        pause();
        setState((s) => ({ ...s, sleepEndsAt: null }));
      }, ms);
      setState((s) => ({ ...s, sleepEndsAt: Date.now() + ms }));
    },
    [pause],
  );

  const value = useMemo<PlayerContextValue>(
    () => ({
      ...state,
      loadAudiobook,
      loadOffline,
      play,
      pause,
      togglePlay,
      seek,
      skip,
      selectChapter,
      nextChapter: () => selectChapter(stateRef.current.currentChapterIndex + 1),
      prevChapter: () =>
        stateRef.current.positionSeconds > 5
          ? seek(0)
          : selectChapter(Math.max(0, stateRef.current.currentChapterIndex - 1)),
      setSpeed,
      setSleepTimer,
      stop,
      clearError: () => setState((s) => ({ ...s, error: null })),
    }),
    [state, loadAudiobook, loadOffline, play, pause, togglePlay, seek, skip, selectChapter, setSpeed, setSleepTimer, stop],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return value;
}
