export interface SubtitleItem {
  from: number;
  to: number;
  content: string;
  lang: string;
}

export interface ProcessedSubtitle {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  content: string;
  lang: string;
}

export interface VectorData {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    startTime: number;
    endTime: number;
    lang: string;
    url?: string;
  };
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function processSubtitles(subtitles: SubtitleItem[]): ProcessedSubtitle[] {
  return subtitles.map((subtitle, index) => ({
    id: `subtitle-${index}`,
    startTime: formatTime(subtitle.from),
    endTime: formatTime(subtitle.to),
    duration: subtitle.to - subtitle.from,
    content: subtitle.content,
    lang: subtitle.lang,
  }));
}

export function prepareVectorData(subtitles: SubtitleItem[], url?: string): VectorData[] {
  return subtitles.map((subtitle, index) => ({
    id: `vector-${index}`,
    content: subtitle.content,
    metadata: {
      startTime: subtitle.from,
      endTime: subtitle.to,
      lang: subtitle.lang,
      url,
    },
  }));
}

export function groupSubtitlesByTime(
  subtitles: ProcessedSubtitle[],
  intervalMinutes: number = 5
): Map<string, ProcessedSubtitle[]> {
  const groups = new Map<string, ProcessedSubtitle[]>();

  subtitles.forEach((subtitle) => {
    const startTime = subtitle.startTime;
    const [minutes, _] = startTime.split(':').map(Number);
    const groupKey = Math.floor((minutes || 0) / intervalMinutes) * intervalMinutes;
    const key = `${groupKey.toString().padStart(2, '0')}:00-${(groupKey + intervalMinutes).toString().padStart(2, '0')}:00`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(subtitle);
  });

  return groups;
}
