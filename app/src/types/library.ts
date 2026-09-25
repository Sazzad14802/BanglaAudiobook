/**
 * Library-related TypeScript types.
 * Mirrors the Platform API library schemas.
 */

import { Audiobook } from './audiobook';

export interface LibraryItem {
  id: string;
  user_id: string;
  audiobook_id: string;
  added_at: string;
  audiobook: Audiobook;
}

export interface LibraryListResponse {
  items: LibraryItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
