/**
 * Playback-related TypeScript types.
 * Mirrors the Platform API playback schemas.
 */

export interface PlaybackProgress {
  id: string;
  user_id: string;
  audiobook_id: string;
  chapter_id: string | null;
  position_seconds: number;
  updated_at: string;
}

export interface PlaybackProgressUpdate {
  chapter_id?: string | null;
  position_seconds: number;
}
