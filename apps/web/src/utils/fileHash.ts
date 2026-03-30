/* global File, crypto, localStorage */

export async function calculateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamps?: string[];
}

export interface VideoMetadata {
  filename: string;
  size: number;
  uploadedAt: number;
  subtitleData: SubtitleData | null;
  themeData: ThemeData | null;
  chatMessages: ChatMessage[];
}

export interface SubtitleData {
  resp: {
    utterances: Array<{
      start_time: number;
      end_time: number;
      text: string;
    }>;
  };
}

export interface ThemeData {
  themes: Array<{
    id: string;
    title: string;
    duration: number;
    quote: {
      text: string;
      timestamp: string;
    };
    segments: Array<{
      start: number;
      end: number;
      text: string;
      confidence: number;
    }>;
  }>;
}

export function generateSubtitleData(filename: string): SubtitleData {
  return {
    resp: {
      utterances: [
        {
          start_time: 0,
          end_time: 10000,
          text: `00:00 ${filename}`,
        },
        {
          start_time: 10000,
          end_time: 20000,
          text: '高光时刻',
        },
      ],
    },
  };
}

export function generateThemeData(): ThemeData {
  return {
    themes: [
      {
        id: '1',
        title: '高光',
        duration: 10000,
        quote: {
          text: '精彩瞬间',
          timestamp: '00:10',
        },
        segments: [
          {
            start: 10000,
            end: 20000,
            text: '高光时刻',
            confidence: 1,
          },
        ],
      },
    ],
  };
}

export function saveVideoMetadata(hash: string, metadata: VideoMetadata) {
  const history = JSON.parse(localStorage.getItem('videoHashHistory') || '{}');
  history[hash] = metadata;
  localStorage.setItem('videoHashHistory', JSON.stringify(history));
}

export function updateChatMessages(hash: string, messages: ChatMessage[]) {
  const history = JSON.parse(localStorage.getItem('videoHashHistory') || '{}');
  if (history[hash]) {
    history[hash].chatMessages = messages;
    localStorage.setItem('videoHashHistory', JSON.stringify(history));
  }
}

export function getVideoMetadata(hash: string): VideoMetadata | null {
  const history = JSON.parse(localStorage.getItem('videoHashHistory') || '{}');
  return history[hash] || null;
}

export function isVideoUploaded(hash: string): boolean {
  return getVideoMetadata(hash) !== null;
}

export function getUploadHistory(): Array<{ hash: string } & VideoMetadata> {
  const history = JSON.parse(localStorage.getItem('videoHashHistory') || '{}');
  return Object.entries(history).map(([hash, metadata]) => ({
    hash,
    ...(metadata as VideoMetadata),
  }));
}

export function clearUploadHistory() {
  localStorage.removeItem('videoHashHistory');
}

export function removeVideoMetadata(hash: string) {
  const history = JSON.parse(localStorage.getItem('videoHashHistory') || '{}');
  delete history[hash];
  localStorage.setItem('videoHashHistory', JSON.stringify(history));
}

export function cleanExpiredUploads(maxAge: number = 7 * 24 * 60 * 60 * 1000) {
  const history = JSON.parse(localStorage.getItem('videoHashHistory') || '{}');
  const now = Date.now();

  Object.entries(history).forEach(([hash, metadata]) => {
    if (now - (metadata as VideoMetadata).uploadedAt > maxAge) {
      delete history[hash];
    }
  });

  localStorage.setItem('videoHashHistory', JSON.stringify(history));
}
