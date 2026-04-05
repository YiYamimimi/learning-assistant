'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Tab } from '@/components/Tabs';
import AIChat from '@/components/AIChat';
import SubtitleList from '@/components/SubtitleList';
import ThemeList from '@/components/ThemeList';
import HistoryPanel from '@/components/HistoryPanel';
import Navbar from '@/components/Navbar';
import { useToast } from '@/components/Toast';
import { getVideoMetadata, updateChatMessages, getExampleChatMessages } from '@/utils/fileHash';

interface SubtitleItem {
  from: number;
  to: number;
  content: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamps?: string[];
}

interface VideoTheme {
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
}

export default function VideoContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const localVideo = searchParams.get('localVideo');
  const fileHash = searchParams.get('fileHash');
  const [isData, setIsData] = useState(searchParams.get('noData') ? false : true);
  const isExceed = searchParams.get('isExceed') ? true : false;
  const example = searchParams.get('example');
  const [subtitleData, setSubtitleData] = useState<SubtitleItem[] | null>(null);
  const [activeTab, setActiveTab] = useState('subtitles');
  const [subtitleStatus, setSubtitleStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLocalVideo, setIsLocalVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentVideoId] = useState<string>('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string>('');
  const [themeData, setThemeData] = useState<VideoTheme[]>([]);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [currentVideoHash, setCurrentVideoHash] = useState<string>('');
  const [aiUsageLimitReached, setAiUsageLimitReached] = useState(false);
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const hasRecordedUsageRef = useRef(false);
  const isRecordingRef = useRef(false);
  const usageLimitReachedRef = useRef(false);

  const recordUsage = useCallback(async () => {
    if (hasRecordedUsageRef.current || usageLimitReachedRef.current || isRecordingRef.current) {
      return;
    }

    isRecordingRef.current = true;
  }, []);

  const checkUsageStatus = async () => {
    try {
      // 检查AI聊天使用次数
      const aiUsageResponse = await fetch('/api/record-ai-usage');
      const aiUsageData = await aiUsageResponse.json();
      setAiUsageLimitReached(aiUsageData.used);
      setAiUsageCount(aiUsageData.usageCount || 0);
    } catch (error) {
      console.error('检查使用状态失败:', error);
    }
  };

  const loadExampleTheme = useCallback(async () => {
    try {
      const response = await fetch('/example/topic.json');
      if (!response.ok) {
        throw new Error(`Failed to load example theme: ${response.status}`);
      }
      const data = await response.json();
      setThemeData(data);
      console.log('主题', data, themeData);
    } catch (error) {
      console.error('加载示例主题失败:', error);
    }
  }, []);

  const loadExampleSubtitle = useCallback(async () => {
    try {
      setSubtitleStatus('正在加载示例字幕...');
      setErrorMessage('');

      const response = await fetch('/example/subtitle.json');

      if (!response.ok) {
        throw new Error(`Failed to load example subtitle: ${response.status}`);
      }

      const data = await response.json();

      const subtitles = data.resp.utterances.map(
        (item: { start_time: number; end_time: number; text: string }) => ({
          from: item.start_time / 1000,
          to: item.end_time / 1000,
          content: item.text,
        })
      );

      setSubtitleData(subtitles);
      setSubtitleStatus('示例字幕加载成功！');
      setTimeout(() => {
        setSubtitleStatus('');
      }, 2000);
    } catch (error) {
      setErrorMessage(`加载示例字幕失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setSubtitleStatus('');
    }
  }, []);

  // const updateVideoAccess = useCallback((hash: string) => {
  //   if (typeof window !== 'undefined') {
  //     const accessHistory = JSON.parse(localStorage.getItem('videoAccessHistory') || '{}');
  //     accessHistory[hash] = {
  //       lastAccess: new Date().toISOString(),
  //       accessCount: (accessHistory[hash]?.accessCount || 0) + 1
  //     };
  //     localStorage.setItem('videoAccessHistory', JSON.stringify(accessHistory));
  //   }
  // }, []);

  useEffect(() => {
    setIsClient(true);

    // const newVideoId = localVideo || example || '';
    // if (newVideoId !== currentVideoId) {
    //   setCurrentVideoId(newVideoId);
    //   // 立即体验视频不要清空聊天记录，以便从 localStorage 恢复
    //   if (!example) {
    //     setChatMessages([]);
    //   }
    //   hasRecordedUsageRef.current = false;
    //   isRecordingRef.current = false;
    // }
    setIsLocalVideo(true);

    if (localVideo) setVideoUrl(localVideo);
    if (example) {
      setVideoUrl('/example/videoplayback.mp4');
      loadExampleSubtitle();
      loadExampleTheme();
      const message = getExampleChatMessages();
      setChatMessages(message);
      setIsData(true);
    }

    if (fileHash) {
      setCurrentVideoHash(fileHash);
      console.log('获取视频哈希:', fileHash);
      const metadata = getVideoMetadata(fileHash);
      if (metadata) {
        console.log('找到视频元数据:', metadata);

        if (!usageLimitReachedRef.current && metadata.subtitleData && metadata.themeData) {
          const subtitleItems = metadata.subtitleData.resp.utterances.map((ut) => ({
            from: ut.start_time / 1000,
            to: ut.end_time / 1000,
            content: ut.text,
          }));

          console.log('转换后的字幕数据:', subtitleItems);
          setSubtitleData(subtitleItems);

          const themes = metadata.themeData.themes.map((theme) => ({
            id: theme.id,
            title: theme.title,
            duration: theme.duration,
            quote: theme.quote,
            segments: theme.segments,
          }));

          console.log('转换后的主题数据:', themes);
          setThemeData(themes);
          setChatMessages(metadata.chatMessages);
          recordUsage();
        }

        if (metadata.chatMessages && metadata.chatMessages.length > 0) {
          console.log('加载历史聊天记录:', metadata.chatMessages);
          setChatMessages(metadata.chatMessages);
        }
      } else {
        setIsData(false);
      }
      if (isData) {
        // 使用立即执行异步函数
        (async () => {
          await checkUsageStatus();
        })();
      }
    }
  }, [
    localVideo,
    example,
    loadExampleSubtitle,
    loadExampleTheme,
    currentVideoId,
    recordUsage,
    searchParams,
  ]);

  // const parseSRT = (srtContent: string): SubtitleItem[] => {
  //   const subtitles: SubtitleItem[] = [];
  //   const blocks = srtContent.trim().split(/\n\s*\n/);

  //   blocks.forEach((block) => {
  //     const lines = block.split('\n');
  //     if (lines.length >= 3) {
  //       const timeLine = lines[1];
  //       const timeMatch = timeLine.match(
  //         /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
  //       );

  //       if (timeMatch) {
  //         const from =
  //           parseInt(timeMatch[1]) * 3600 +
  //           parseInt(timeMatch[2]) * 60 +
  //           parseInt(timeMatch[3]) +
  //           parseInt(timeMatch[4]) / 1000;
  //         const to =
  //           parseInt(timeMatch[5]) * 3600 +
  //           parseInt(timeMatch[6]) * 60 +
  //           parseInt(timeMatch[7]) +
  //           parseInt(timeMatch[8]) / 1000;
  //         const content = lines.slice(2).join('\n');

  //         subtitles.push({ from, to, content });
  //       }
  //     }
  //   });

  //   return subtitles;
  // };

  // const parseVTT = (vttContent: string): SubtitleItem[] => {
  //   const subtitles: SubtitleItem[] = [];
  //   const lines = vttContent.split('\n');
  //   let currentTimeBlock: { from: number; to: number; content: string[] } | null = null;

  //   for (let i = 0; i < lines.length; i++) {
  //     const line = lines[i].trim();

  //     if (line === 'WEBVTT') {
  //       continue;
  //     }

  //     const timeMatch = line.match(
  //       /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
  //     );

  //     if (timeMatch) {
  //       if (currentTimeBlock) {
  //         subtitles.push({
  //           from: currentTimeBlock.from,
  //           to: currentTimeBlock.to,
  //           content: currentTimeBlock.content.join('\n'),
  //         });
  //       }

  //       const from =
  //         parseInt(timeMatch[1]) * 3600 +
  //         parseInt(timeMatch[2]) * 60 +
  //         parseInt(timeMatch[3]) +
  //         parseInt(timeMatch[4]) / 1000;
  //       const to =
  //         parseInt(timeMatch[5]) * 3600 +
  //         parseInt(timeMatch[6]) * 60 +
  //         parseInt(timeMatch[7]) +
  //         parseInt(timeMatch[8]) / 1000;
  //       currentTimeBlock = { from, to, content: [] };
  //     } else if (currentTimeBlock && line !== '') {
  //       currentTimeBlock.content.push(line);
  //     }
  //   }

  //   if (currentTimeBlock) {
  //     subtitles.push({
  //       from: currentTimeBlock.from,
  //       to: currentTimeBlock.to,
  //       content: currentTimeBlock.content.join('\n'),
  //     });
  //   }

  //   return subtitles;
  // };

  useEffect(() => {
    if (chatMessages.length > 0) {
      updateChatMessages(currentVideoHash, chatMessages);
    }
  }, [chatMessages]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar
        onBack={() => (window.location.href = '/')}
        onHistory={() => setIsHistoryPanelOpen(true)}
        onLogin={() => showToast('登录功能正在升级中，敬请期待！', 'info', 'top-right')}
      />

      <HistoryPanel
        isOpen={isHistoryPanelOpen}
        onClose={() => setIsHistoryPanelOpen(false)}
        currentVideoHash={currentVideoHash}
        onSelectHistory={(hash, filename, videoUrl) => {
          setCurrentVideoHash(hash);
          setVideoUrl(videoUrl);
          setIsHistoryPanelOpen(false);
          hasRecordedUsageRef.current = false;
          isRecordingRef.current = false;

          const metadata = getVideoMetadata(hash);
          if (metadata) {
            if (metadata.subtitleData && metadata.themeData) {
              const subtitleItems = metadata.subtitleData.resp.utterances.map((ut) => ({
                from: ut.start_time / 1000,
                to: ut.end_time / 1000,
                content: ut.text,
              }));
              setSubtitleData(subtitleItems);

              const themes = metadata.themeData.themes.map((theme) => ({
                id: theme.id,
                title: theme.title,
                duration: theme.duration,
                quote: theme.quote,
                segments: theme.segments,
              }));
              setThemeData(themes);
            }

            if (metadata.chatMessages && metadata.chatMessages.length > 0) {
              setChatMessages(metadata.chatMessages);
            } else {
              setChatMessages([]);
            }
          }
        }}
      />

      <div className="flex flex-col lg:flex-row p-5 flex-1 gap-6 mt-16 min-h-0">
        {/* Left side - 65% */}
        <div className="flex-[0.65] flex flex-col min-h-0">
          {/* Video player */}
          <div className="flex-1 bg-black rounded-2xl overflow-hidden relative flex items-center justify-center min-h-0">
            {isClient && isLocalVideo ? (
              <>
                {videoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p>视频加载中...</p>
                    </div>
                  </div>
                )}
                {videoError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <div className="text-white text-center p-6">
                      <p className="text-red-400 mb-2">视频加载失败</p>
                      <p className="text-sm">{videoError}</p>
                    </div>
                  </div>
                )}
                <video
                  src={videoUrl}
                  controls={true}
                  className="w-full h-full object-contain"
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => {
                    setVideoDuration(e.currentTarget.duration);
                    setVideoLoading(false);
                    setVideoError('');
                  }}
                  onLoadStart={() => setVideoLoading(true)}
                  onError={() => {
                    setVideoLoading(false);
                    setVideoError('无法加载视频文件，请检查文件格式是否正确');
                  }}
                />
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-white">
                No video URL provided
              </div>
            )}
          </div>

          {/* Theme list */}
          <div className="h-48 lg:h-60 bg-white border-t border-gray-200 p-4 overflow-hidden">
            <ThemeList
              currentTime={currentTime}
              videoDuration={videoDuration}
              themes={themeData}
              isData={isData}
              isExceed={isExceed}
              onSeekTime={(time) => {
                const videoElement = document.querySelector('video') as globalThis.HTMLVideoElement;
                if (videoElement) {
                  videoElement.currentTime = time;
                  videoElement.play();
                }
              }}
            />
          </div>
        </div>

        {/* Right side - 35% */}
        <div className="flex-[0.35] bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col min-w-0">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab}>
            <Tab id="subtitles" label="Subtitles" />
            <Tab id="chat" label="AI Chat" />
          </Tabs>

          <div className="flex-1 overflow-auto p-4 min-h-0 flex flex-col">
            {/* Usage warning */}
            {(isExceed || !isData) && (
              <div className="mb-4 p-3 bg-orange-50 text-orange-700 rounded-lg border border-orange-200">
                <div className="flex items-center">
                  <div className="text-2xl mr-2">⚠️</div>
                  <div>
                    <p className="font-medium">
                      {isExceed ? `已超出使用次数，请登录` : '暂无字幕'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status and error messages */}
            {subtitleStatus && (
              <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                {subtitleStatus}
              </div>
            )}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
                {errorMessage}
              </div>
            )}
            <div className="flex-1">
              {activeTab === 'chat' ? (
                <AIChat
                  subtitleData={subtitleData}
                  messages={chatMessages}
                  setMessages={setChatMessages}
                  disable={isExceed || !isData}
                  isExample={example}
                  aiUsageCount={aiUsageCount}
                  aiUsageLimitReached={aiUsageLimitReached}
                  onAiUsageUpdate={(count, limitReached) => {
                    setAiUsageCount(count);
                    setAiUsageLimitReached(limitReached);
                  }}
                />
              ) : (
                <SubtitleList subtitleData={subtitleData} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
