import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from "expo-audio";
import { Audiobook } from "../types/audiobook";
import { Chapter } from "../types/chapter";
import { apiClient } from "../api/client";
import { getActiveApiBaseUrl } from "../config";
import { useAuth } from "./AuthContext";
import { offline } from "../storage/offline";

interface State {
  audiobook: Audiobook | null;
  chapters: Chapter[];
  currentChapterIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  positionSeconds: number;
  durationSeconds: number;
  error: string;
}
interface Value extends State {
  loadAudiobook: (
    book: Audiobook,
    arg2?: any,
    arg3?: any,
    arg4?: any,
  ) => Promise<void>;
  loadOffline: (book: Audiobook, chapters: any[]) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (value: number) => Promise<void>;
  nextChapter: () => Promise<void>;
  prevChapter: () => Promise<void>;
  stop: () => Promise<void>;
  selectChapter: (index: number) => Promise<void>;
  setSpeed: (speed: number) => void;
  setSleep: (minutes: number) => void;
}
const initial: State = {
  audiobook: null,
  chapters: [],
  currentChapterIndex: 0,
  isPlaying: false,
  isLoading: false,
  positionSeconds: 0,
  durationSeconds: 0,
  error: "",
};
const Context = createContext<Value | null>(null);
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState(initial);
  const ref = useRef(state);
  ref.current = state;
  const audio = useRef<AudioPlayer | null>(null);
  const subscription = useRef<{ remove: () => void } | null>(null);
  const session = useRef("");
  const local = useRef(false);
  const expires = useRef(0);
  const ended = useRef(false);
  const sleep = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advance = useRef<() => void>(() => {});
  const generation = useRef(0);
  function dispose() {
    subscription.current?.remove();
    subscription.current = null;
    audio.current?.remove();
    audio.current = null;
  }
  async function stop() {
    generation.current++;
    dispose();
    session.current = "";
    if (sleep.current) clearTimeout(sleep.current);
    setState(initial);
    offline.clearPlayback();
  }
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => {});
    return () => {
      dispose();
      offline.clearPlayback();
      if (sleep.current) clearTimeout(sleep.current);
    };
  }, []);
  useEffect(() => {
    stop();
  }, [user?.id]);
  async function start(
    index: number,
    chapters = ref.current.chapters,
    book = ref.current.audiobook,
    position = 0,
  ) {
    const chapter = chapters[index];
    if (!chapter?.audio_url || !book) throw new Error("No audio is ready yet.");
    dispose();
    ended.current = false;
    const uri =
      chapter.audio_url.startsWith("file:") ||
      chapter.audio_url.startsWith("http")
        ? chapter.audio_url
        : `${getActiveApiBaseUrl()}${chapter.audio_url}`;
    setState((s) => ({
      ...s,
      audiobook: book,
      chapters,
      currentChapterIndex: index,
      isLoading: true,
      error: "",
      positionSeconds: position,
      durationSeconds: chapter.duration_seconds,
    }));
    const player = createAudioPlayer({ uri }, { updateInterval: 500 });
    audio.current = player;
    subscription.current = player.addListener(
      "playbackStatusUpdate",
      (status) => {
        setState((s) => ({
          ...s,
          isPlaying: status.playing,
          positionSeconds: status.currentTime,
          durationSeconds: status.duration || chapter.duration_seconds,
          isLoading: status.isBuffering,
        }));
        if (status.didJustFinish && !ended.current) {
          ended.current = true;
          advance.current();
        }
      },
    );
    if (position > 0) await player.seekTo(position);
    player.play();
  }
  async function manifest(book: Audiobook) {
    return apiClient.post<{ session_id: string; chapters: Chapter[] }>(
      `/audiobooks/${book.id}/play`,
    );
  }
  async function loadAudiobook(
    book: Audiobook,
    arg2?: any,
    arg3?: any,
    arg4?: any,
  ) {
    const epoch = ++generation.current;
    const data = await manifest(book);
    if (epoch !== generation.current) return;
    local.current = false;
    session.current = data.session_id;
    let position = typeof arg2 === "number" ? arg2 : 0;
    let index = typeof arg3 === "number" ? arg3 : 0;
    if (typeof arg4 === "number") position = arg4;
    if (arg2 === undefined) {
      const saved = await apiClient
        .get<any>(`/playback/${book.id}`)
        .catch(() => null);
      if (saved) {
        const i = data.chapters.findIndex((c) => c.id === saved.chapter_id);
        if (i >= 0) {
          index = i;
          position = saved.position_seconds;
        }
      }
    }
    await start(index, data.chapters, book, position);
  }
  async function loadOffline(book: Audiobook, chapters: any[]) {
    local.current = true;
    session.current = "";
    expires.current = chapters[0]?.offline_expires || 0;
    await start(0, chapters, book);
  }
  async function selectChapter(index: number) {
    const s = ref.current;
    if (!s.audiobook) return;
    if (local.current) {
      if (Date.now() >= expires.current) {
        await stop();
        throw new Error("Offline license expired");
      }
      await start(index);
    } else {
      const data = await manifest(s.audiobook);
      session.current = data.session_id;
      await start(index, data.chapters, s.audiobook);
    }
  }
  advance.current = () => {
    if (ref.current.currentChapterIndex + 1 < ref.current.chapters.length)
      selectChapter(ref.current.currentChapterIndex + 1).catch((e) =>
        setState((s) => ({ ...s, error: e.message })),
      );
  };
  useEffect(() => {
    const timer = setInterval(async () => {
      const s = ref.current;
      if (!s.audiobook) return;
      if (local.current) {
        if (Date.now() >= expires.current) await stop();
        return;
      }
      try {
        await apiClient.put(`/playback/${s.audiobook.id}`, {
          chapter_id: s.chapters[s.currentChapterIndex]?.id,
          position_seconds: s.positionSeconds,
        });
        if (session.current && s.isPlaying)
          await apiClient.post(`/plays/${session.current}/heartbeat`, {
            position: Math.floor(s.positionSeconds),
          });
        if (ended.current) {
          const data = await manifest(s.audiobook);
          if (data.chapters.length > s.currentChapterIndex + 1) {
            session.current = data.session_id;
            await start(s.currentChapterIndex + 1, data.chapters, s.audiobook);
          }
        }
      } catch (e) {
        const error = e as any;
        if (
          error.status === 401 ||
          error.status === 403 ||
          error.status === 404
        ) {
          audio.current?.pause();
          setState((x) => ({ ...x, isPlaying: false, error: error.message }));
        }
      }
    }, 10000);
    return () => clearInterval(timer);
  }, []);
  async function play() {
    if (local.current && Date.now() >= expires.current) {
      await stop();
      throw new Error("Offline license expired");
    }
    audio.current?.play();
  }
  async function pause() {
    audio.current?.pause();
  }
  async function seek(value: number) {
    await audio.current?.seekTo(
      Math.max(0, Math.min(value, ref.current.durationSeconds)),
    );
  }
  function setSpeed(speed: number) {
    audio.current?.setPlaybackRate(speed);
  }
  function setSleep(minutes: number) {
    if (sleep.current) clearTimeout(sleep.current);
    if (minutes > 0)
      sleep.current = setTimeout(() => audio.current?.pause(), minutes * 60000);
  }
  return (
    <Context.Provider
      value={{
        ...state,
        loadAudiobook,
        loadOffline,
        play,
        pause,
        seek,
        stop,
        selectChapter,
        nextChapter: () =>
          selectChapter(
            Math.min(
              ref.current.chapters.length - 1,
              ref.current.currentChapterIndex + 1,
            ),
          ),
        prevChapter: () =>
          selectChapter(Math.max(0, ref.current.currentChapterIndex - 1)),
        setSpeed,
        setSleep,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePlayer() {
  const value = useContext(Context);
  if (!value) throw new Error("PlayerProvider missing");
  return value;
}
