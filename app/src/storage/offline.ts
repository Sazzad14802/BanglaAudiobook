import { Directory, File, Paths } from "expo-file-system";
import {
  AESEncryptionKey,
  AESSealedData,
  aesEncryptAsync,
  aesDecryptAsync,
} from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { ApiError } from "../api/client";
import { playbackApi } from "../api/playback";
import { resolveMediaUrl } from "../config";
import { Audiobook } from "../types/audiobook";
import type { PlayerChapter } from "../contexts/PlayerContext";
function getFolder(): Directory {
  return new Directory(Paths.document, "bornoverse-offline");
}
function getPlayback(): Directory {
  return new Directory(Paths.cache, "bornoverse-playback");
}
const indexKey = (user: string) => `offline-index-${user}`;
const keyName = (id: string, user: string) => `offline-${user}-${id}`;
async function index(user: string): Promise<string[]> {
  return JSON.parse((await SecureStore.getItemAsync(indexKey(user))) || "[]");
}
export const offline = {
  async download(book: Audiobook, user: string) {
    const license = await playbackApi.offlineLicense(book.id);
    if (!license.chapters.length)
      throw new Error("No completed audio is available.");
    const folder = getFolder();
    folder.create({ idempotent: true, intermediates: true });
    const key = await AESEncryptionKey.generate();
    const chapters: Omit<PlayerChapter, "audio_url">[] = [];
    for (const chapter of license.chapters) {
      const response = await fetch(resolveMediaUrl(chapter.audio_url)!);
      if (!response.ok) throw new Error("Audio download failed. Please retry.");
      const sealed = await aesEncryptAsync(
        new Uint8Array(await response.arrayBuffer()),
        key,
      );
      const file = new File(folder, `${user}-${book.id}-${chapter.id}.enc`);
      file.create({ overwrite: true });
      file.write(await sealed.combined());
      const { audio_url: _signedUrl, ...metadata } = chapter;
      chapters.push(metadata);
    }
    const manifest = new File(folder, `${user}-${book.id}.json`);
    manifest.create({ overwrite: true });
    manifest.write(JSON.stringify({ book, chapters }));
    await SecureStore.setItemAsync(
      keyName(book.id, user),
      JSON.stringify({
        key: await key.encoded("hex"),
        expires: Date.parse(license.expires_at),
        lastSeen: Date.now(),
      }),
    );
    await SecureStore.setItemAsync(
      indexKey(user),
      JSON.stringify([...new Set([...(await index(user)), book.id])]),
    );
  },
  async list(user: string): Promise<Audiobook[]> {
    const result: Audiobook[] = [];
    for (const id of await index(user)) {
      const stored = await SecureStore.getItemAsync(keyName(id, user));
      if (!stored) continue;
      const lease = JSON.parse(stored);
      if (Date.now() > lease.expires || Date.now() < lease.lastSeen - 60000) {
        await this.remove(id, user);
        continue;
      }
      const file = new File(getFolder(), `${user}-${id}.json`);
      if (file.exists) result.push(JSON.parse(await file.text()).book);
    }
    return result;
  },
  async open(id: string, user: string): Promise<PlayerChapter[]> {
    const stored = await SecureStore.getItemAsync(keyName(id, user));
    if (!stored) throw new Error("Download unavailable.");
    const lease = JSON.parse(stored);
    if (Date.now() > lease.expires || Date.now() < lease.lastSeen - 60000) {
      await this.remove(id, user);
      throw new Error("Offline license expired. Connect and download again.");
    }
    // Check revocation whenever the server is reachable; only network failures permit offline fallback.
    try {
      await playbackApi.offlineLicense(id);
    } catch (e) {
      if (e instanceof ApiError && e.status !== 0) {
        await this.remove(id, user);
        throw e;
      }
    }
    lease.lastSeen = Date.now();
    await SecureStore.setItemAsync(keyName(id, user), JSON.stringify(lease));
    this.clearPlayback();
    const playback = getPlayback();
    const folder = getFolder();
    playback.create({ idempotent: true, intermediates: true });
    const key = await AESEncryptionKey.import(lease.key, "hex");
    const manifest = JSON.parse(
      await new File(folder, `${user}-${id}.json`).text(),
    );
    const chapters: PlayerChapter[] = [];
    for (const chapter of manifest.chapters) {
      const cipher = await new File(
        folder,
        `${user}-${id}-${chapter.id}.enc`,
      ).bytes();
      const plain = await aesDecryptAsync(
        AESSealedData.fromCombined(cipher),
        key,
      );
      const file = new File(playback, `${chapter.id}.audio`);
      file.create({ overwrite: true });
      file.write(new Uint8Array(plain));
      chapters.push({
        ...chapter,
        audio_url: file.uri,
        offline_expires: lease.expires,
      });
    }
    return chapters;
  },
  clearPlayback() {
    try {
      const playback = getPlayback();
      if (playback.exists) playback.delete();
    } catch {}
  },
  async remove(id: string, user: string) {
    try {
      const folder = getFolder();
      if (folder.exists)
        for (const file of folder.list())
          if (file.name.startsWith(`${user}-${id}`)) file.delete();
    } catch {}
    await SecureStore.deleteItemAsync(keyName(id, user));
    await SecureStore.setItemAsync(
      indexKey(user),
      JSON.stringify((await index(user)).filter((item) => item !== id)),
    );
  },
  async clear(user: string) {
    for (const id of await index(user)) await this.remove(id, user);
    this.clearPlayback();
  },
};
