/**
 * Canonical genres. The stable `key` is stored on the audiobook; labels are
 * localized for display. Unknown legacy values are shown as-is.
 */

export interface Genre {
  key: string;
  bn: string;
  en: string;
}

export const GENRES: Genre[] = [
  { key: 'novel', bn: 'উপন্যাস', en: 'Novel' },
  { key: 'story', bn: 'গল্প', en: 'Short stories' },
  { key: 'poetry', bn: 'কবিতা', en: 'Poetry' },
  { key: 'children', bn: 'শিশুতোষ', en: 'Children' },
  { key: 'mystery', bn: 'রহস্য', en: 'Mystery' },
  { key: 'history', bn: 'ইতিহাস', en: 'History' },
  { key: 'religion', bn: 'ধর্ম', en: 'Religion' },
  { key: 'self-help', bn: 'আত্মোন্নয়ন', en: 'Self-help' },
  { key: 'science', bn: 'বিজ্ঞান', en: 'Science' },
  { key: 'education', bn: 'শিক্ষা', en: 'Education' },
];

export function genreLabel(key: string | null | undefined, english: boolean): string {
  if (!key) return '';
  const genre = GENRES.find((g) => g.key === key);
  return genre ? (english ? genre.en : genre.bn) : key;
}

export const LANGUAGES = [
  { key: 'bn', bn: 'বাংলা', en: 'Bangla' },
  { key: 'en', bn: 'ইংরেজি', en: 'English' },
] as const;

export function languageLabel(code: string, english: boolean): string {
  const language = LANGUAGES.find((l) => l.key === code);
  return language ? (english ? language.en : language.bn) : code;
}
