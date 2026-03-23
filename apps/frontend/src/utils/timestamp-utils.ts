export function parseTimestamp(timestamp: string): number | null {
  const match = timestamp.match(/^(\d{1,2}):(\d{2})$/);
  if (!match || match[1] === undefined || match[2] === undefined) {
    return null;
  }

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);

  if (minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null;
  }

  return minutes * 60 + seconds;
}

export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function normalizeTimestampSources(
  sources: string[],
  options?: { limit?: number }
): string[] {
  const limit = options?.limit ?? 5;
  const normalized: string[] = [];

  for (const source of sources) {
    if (normalized.length >= limit) {
      break;
    }

    const trimmed = source.trim();
    if (!trimmed) {
      continue;
    }

    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match && match[1] !== undefined && match[2] !== undefined) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);

      if (minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
        normalized.push(trimmed);
      }
    }
  }

  return normalized;
}
