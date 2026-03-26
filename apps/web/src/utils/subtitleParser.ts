export interface SubtitleItem {
  from: number;
  to: number;
  content: string;
}

export function parseSRT(srtContent: string): SubtitleItem[] {
  const subtitles: SubtitleItem[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  blocks.forEach((block) => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const timeLine = lines[1];
      const timeMatch = timeLine.match(
        /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
      );

      if (timeMatch) {
        const from =
          parseInt(timeMatch[1]) * 3600 +
          parseInt(timeMatch[2]) * 60 +
          parseInt(timeMatch[3]) +
          parseInt(timeMatch[4]) / 1000;
        const to =
          parseInt(timeMatch[5]) * 3600 +
          parseInt(timeMatch[6]) * 60 +
          parseInt(timeMatch[7]) +
          parseInt(timeMatch[8]) / 1000;
        const content = lines.slice(2).join('\n');

        subtitles.push({ from, to, content });
      }
    }
  });

  return subtitles;
}

export function parseVTT(vttContent: string): SubtitleItem[] {
  const subtitles: SubtitleItem[] = [];
  const lines = vttContent.split('\n');
  let currentTimeBlock: { from: number; to: number; content: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'WEBVTT') {
      continue;
    }

    const timeMatch = line.match(
      /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
    );

    if (timeMatch) {
      if (currentTimeBlock) {
        subtitles.push({
          from: currentTimeBlock.from,
          to: currentTimeBlock.to,
          content: currentTimeBlock.content.join('\n'),
        });
      }

      const from =
        parseInt(timeMatch[1]) * 3600 +
        parseInt(timeMatch[2]) * 60 +
        parseInt(timeMatch[3]) +
        parseInt(timeMatch[4]) / 1000;
      const to =
        parseInt(timeMatch[5]) * 3600 +
        parseInt(timeMatch[6]) * 60 +
        parseInt(timeMatch[7]) +
        parseInt(timeMatch[8]) / 1000;
      currentTimeBlock = { from, to, content: [] };
    } else if (currentTimeBlock && line !== '') {
      currentTimeBlock.content.push(line);
    }
  }

  if (currentTimeBlock) {
    subtitles.push({
      from: currentTimeBlock.from,
      to: currentTimeBlock.to,
      content: currentTimeBlock.content.join('\n'),
    });
  }

  return subtitles;
}

export function parseSubtitleFile(file: globalThis.File): Promise<SubtitleItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new globalThis.FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      const extension = file.name.split('.').pop()?.toLowerCase();

      try {
        if (extension === 'srt') {
          resolve(parseSRT(content));
        } else if (extension === 'vtt') {
          resolve(parseVTT(content));
        } else {
          reject(new Error('Unsupported subtitle format'));
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
