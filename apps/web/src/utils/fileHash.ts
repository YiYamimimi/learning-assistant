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

// 新增函数：更新视频历史列表
export function updateVideoHistory(hash: string, metadata: VideoMetadata) {
  const videoHistory = JSON.parse(localStorage.getItem('videoHistoryList') || '[]');

  // 检查是否已存在
  const existingIndex = videoHistory.findIndex((item: any) => item.hash === hash);

  if (existingIndex >= 0) {
    // 更新现有记录
    videoHistory[existingIndex] = {
      hash,
      filename: metadata.filename,
      uploadedAt: metadata.uploadedAt,
      lastAccessed: Date.now(),
      accessCount: (videoHistory[existingIndex].accessCount || 0) + 1,
    };
  } else {
    // 添加新记录
    videoHistory.unshift({
      hash,
      filename: metadata.filename,
      uploadedAt: metadata.uploadedAt,
      lastAccessed: Date.now(),
      accessCount: 1,
    });
  }

  // 保持列表长度（最多保留10个）
  const trimmedHistory = videoHistory.slice(0, 10);
  localStorage.setItem('videoHistoryList', JSON.stringify(trimmedHistory));
}

// 新增函数：获取视频历史列表
export function getVideoHistory() {
  return JSON.parse(localStorage.getItem('videoHistoryList') || '[]');
}

// 新增函数：添加AI聊天记录到指定视频
export function addChatMessageToVideo(hash: string, message: ChatMessage) {
  const history = JSON.parse(localStorage.getItem('videoHashHistory') || '{}');

  if (history[hash]) {
    if (!history[hash].chatMessages) {
      history[hash].chatMessages = [];
    }

    // 添加时间戳
    const messageWithTimestamp = {
      ...message,
      timestamp: Date.now(),
    };

    history[hash].chatMessages.push(messageWithTimestamp);
    localStorage.setItem('videoHashHistory', JSON.stringify(history));

    // 更新访问记录
    updateVideoAccess(hash);

    return true;
  }

  return false;
}

// 新增函数：更新视频访问记录
export function updateVideoAccess(hash: string) {
  const history = JSON.parse(localStorage.getItem('videoHashHistory') || '{}');

  if (history[hash]) {
    history[hash].lastAccessed = Date.now();
    history[hash].accessCount = (history[hash].accessCount || 0) + 1;
    localStorage.setItem('videoHashHistory', JSON.stringify(history));

    // 同时更新历史列表
    const videoHistory = JSON.parse(localStorage.getItem('videoHistoryList') || '[]');
    const existingIndex = videoHistory.findIndex((item: any) => item.hash === hash);

    if (existingIndex >= 0) {
      videoHistory[existingIndex].lastAccessed = Date.now();
      videoHistory[existingIndex].accessCount = (videoHistory[existingIndex].accessCount || 0) + 1;

      // 将最近访问的视频移到最前面
      const item = videoHistory.splice(existingIndex, 1)[0];
      videoHistory.unshift(item);

      localStorage.setItem('videoHistoryList', JSON.stringify(videoHistory.slice(0, 10)));
    }
  }
}

// 新增函数：获取指定视频的AI聊天记录
export function getChatMessagesForVideo(hash: string): ChatMessage[] {
  const history = JSON.parse(localStorage.getItem('videoHashHistory') || '{}');
  return history[hash]?.chatMessages || [];
}

// 新增函数：清除指定视频的AI聊天记录
export function clearChatMessagesForVideo(hash: string) {
  const history = JSON.parse(localStorage.getItem('videoHashHistory') || '{}');

  if (history[hash]) {
    history[hash].chatMessages = [];
    localStorage.setItem('videoHashHistory', JSON.stringify(history));
    return true;
  }

  return false;
}

// 新增函数：保存示例聊天记录
export function saveExampleChatMessages(messages: ChatMessage[]) {
  localStorage.setItem('exampleChatMessages', JSON.stringify(messages));
}

// 新增函数：获取示例聊天记录
export function getExampleChatMessages(): ChatMessage[] {
  try {
    const stored = localStorage.getItem('exampleChatMessages');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('获取示例聊天记录失败:', error);
    return [];
  }
}

// 新增函数：添加消息到示例聊天记录
export function addMessageToExampleChat(message: ChatMessage) {
  const currentMessages = getExampleChatMessages();
  const newMessages = [...currentMessages, message];
  saveExampleChatMessages(newMessages);
  return newMessages;
}

// 新增函数：更新示例聊天记录
export function updateExampleChatMessages(messages: ChatMessage[]) {
  saveExampleChatMessages(messages);
}

// 新增函数：清除示例聊天记录
export function clearExampleChatMessages() {
  localStorage.removeItem('exampleChatMessages');
}
