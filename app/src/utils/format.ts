/**
 * Presentation formatters shared across screens.
 */

/** 3725 → "1h 2m", 95 → "1m 35s". */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return s && m < 10 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

/** Player clock: 65 → "1:05", 3725 → "1:02:05". */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function formatMoney(amount: string | number): string {
  const value = Number(amount);
  return `৳${Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : amount}`;
}

export function formatDate(iso: string | null | undefined, english: boolean): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(english ? 'en-GB' : 'bn-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Time-of-day greeting key for the home header. */
export function greetingPeriod(date = new Date()): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = date.getHours();
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

export function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
