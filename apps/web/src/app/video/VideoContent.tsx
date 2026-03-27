'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Tab } from '@/components/Tabs';
import AIChat from '@/components/AIChat';
import SubtitleList from '@/components/SubtitleList';
import ThemeList from '@/components/ThemeList';

/* global localStorage */

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

interface VideoHistory {
  videoId: string;
  videoUrl: string;
  bvid?: string;
  messages: ChatMessage[];
  timestamp: number;
}

export default function VideoContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');
  const localVideo = searchParams.get('localVideo');
  const localSubtitle = searchParams.get('localSubtitle');
  const example = searchParams.get('example');
  const [bvid, setBvid] = useState('');
  const [subtitleData, setSubtitleData] = useState<SubtitleItem[] | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [subtitleStatus, setSubtitleStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLocalVideo, setIsLocalVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentVideoId, setCurrentVideoId] = useState<string>('');

  const getMockData = () => {
    setSubtitleData([
      { from: 0, to: 10, content: '这是一段模拟的字幕内容1' },
      { from: 10, to: 20, content: '这是一段模拟的字幕内容2' },
      { from: 20, to: 30, content: '这是一段模拟的字幕内容3' },
      { from: 30, to: 40, content: '这是一段模拟的字幕内容4' },
      { from: 40, to: 50, content: '这是一段模拟的字幕内容5' },
    ]);
  };

  const loadVideoHistory = (videoId: string) => {
    const existingHistory = JSON.parse(localStorage.getItem('videoHistory') || '[]');
    const history = existingHistory.find((h: VideoHistory) => h.videoId === videoId);
    if (history && history.messages.length > 0) {
      setChatMessages(history.messages);
      console.log('已加载历史对话记录');
    }
  };

  const fetchSubtitleData = useCallback(async (bvid: string) => {
    setSubtitleStatus('正在获取字幕数据...');
    setErrorMessage('');

    try {
      const wbiUrl = `https://api.bilibili.com/x/player/wbi/v2?bvid=${bvid}`;
      setSubtitleStatus('正在获取视频信息...');

      const response = await fetch(wbiUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Referer: `https://www.bilibili.com/video/${bvid}/`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      const data = JSON.parse(text);

      if (data.data && data.data.subtitle && data.data.subtitle.subtitles) {
        setSubtitleStatus('正在解析字幕信息...');

        let targetSubtitle = data.data.subtitle.subtitles.find((i: any) => i.lan === 'ai-zh');
        if (!targetSubtitle) {
          targetSubtitle = data.data.subtitle.subtitles[0];
        }

        if (targetSubtitle && targetSubtitle.subtitle_url) {
          let subtitleUrl = targetSubtitle.subtitle_url;
          if (!subtitleUrl.startsWith('http')) {
            subtitleUrl = `https:${subtitleUrl}`;
          }
          setSubtitleStatus('正在下载字幕...');

          const subtitleResponse = await fetch(subtitleUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              Referer: `https://www.bilibili.com/video/${bvid}/`,
            },
          });

          if (!subtitleResponse.ok) {
            throw new Error(`HTTP error! status: ${subtitleResponse.status}`);
          }

          const subtitleText = await subtitleResponse.text();
          const subtitleData = JSON.parse(subtitleText);

          const finalData = subtitleData.body || subtitleData;

          setSubtitleData(finalData);
          setSubtitleStatus('字幕获取成功！');
        } else {
          setErrorMessage('未找到字幕 URL');
          setSubtitleStatus('');
          getMockData();
        }
      } else {
        setErrorMessage('未找到字幕信息');
        setSubtitleStatus('');
        getMockData();
      }
    } catch (error) {
      setErrorMessage(`获取字幕失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setSubtitleStatus('');
      getMockData();
    }
  }, []);

  const loadLocalSubtitle = useCallback(async (subtitleName: string) => {
    try {
      setSubtitleStatus('正在加载本地字幕...');
      setErrorMessage('');

      const response = await fetch(`/uploads/${subtitleName}`);

      if (!response.ok) {
        throw new Error(`Failed to load subtitle: ${response.status}`);
      }

      const content = await response.text();
      const extension = subtitleName.split('.').pop()?.toLowerCase();

      let subtitles: SubtitleItem[] = [];

      if (extension === 'srt') {
        subtitles = parseSRT(content);
      } else if (extension === 'vtt') {
        subtitles = parseVTT(content);
      } else if (extension === 'json') {
        subtitles = JSON.parse(content);
      } else {
        throw new Error('Unsupported subtitle format');
      }

      setSubtitleData(subtitles);
      setSubtitleStatus('本地字幕加载成功！');
    } catch (error) {
      setErrorMessage(`加载本地字幕失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setSubtitleStatus('');
      getMockData();
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

      const subtitles = data.resp.utterances.map((item: any) => ({
        from: item.start_time / 1000,
        to: item.end_time / 1000,
        content: item.text,
      }));

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

  useEffect(() => {
    setIsClient(true);

    const newVideoId = url || localVideo || example || '';
    if (newVideoId !== currentVideoId) {
      setCurrentVideoId(newVideoId);
      setChatMessages([]);
      loadVideoHistory(newVideoId);
    }

    if (example) {
      setIsLocalVideo(true);
      setVideoUrl('/example/videoplayback.mp4');

      loadExampleSubtitle();
    } else if (localVideo) {
      setIsLocalVideo(true);
      setVideoUrl(localVideo);

      if (localSubtitle) {
        loadLocalSubtitle(localSubtitle);
      }
    } else if (url) {
      setIsLocalVideo(false);
      let extractedBvid = '';

      const patterns = [/bvid=([a-zA-Z0-9]+)/, /\/video\/([a-zA-Z0-9]+)\/?/, /BV[a-zA-Z0-9]+/];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          extractedBvid = match[1] || match[0];
          break;
        }
      }

      if (extractedBvid) {
        if (!extractedBvid.startsWith('BV')) {
          extractedBvid = 'BV' + extractedBvid;
        }
        setBvid(extractedBvid);
      } else {
        const testBvid = 'BV1ojfDBSEPv';
        setBvid(testBvid);
      }
    }
  }, [url, localVideo, localSubtitle, example, loadLocalSubtitle, loadExampleSubtitle]);

  const parseSRT = (srtContent: string): SubtitleItem[] => {
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
  };

  const parseVTT = (vttContent: string): SubtitleItem[] => {
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
  };

  useEffect(() => {
    if (bvid) {
      fetchSubtitleData(bvid);
    }
  }, [bvid, fetchSubtitleData]);

  useEffect(() => {
    if (currentVideoId && chatMessages.length > 0) {
      const history: VideoHistory = {
        videoId: currentVideoId,
        videoUrl,
        bvid,
        messages: chatMessages,
        timestamp: Date.now(),
      };

      const existingHistory = JSON.parse(localStorage.getItem('videoHistory') || '[]');
      const filteredHistory = existingHistory.filter(
        (h: VideoHistory) => h.videoId !== currentVideoId
      );
      const newHistory = [history, ...filteredHistory].slice(0, 10);
      localStorage.setItem('videoHistory', JSON.stringify(newHistory));
    }
  }, [chatMessages, currentVideoId, videoUrl, bvid]);

  return (
    <div className="flex flex-col lg:flex-row p-5 h-screen bg-gray-50 gap-6">
      {/* Left side - 65% */}
      <div className="flex-[0.65] flex flex-col min-w-0">
        {/* Video player */}
        <div className="flex-1 bg-black rounded-2xl overflow-hidden min-h-0">
          {isClient && isLocalVideo ? (
            <video
              src={videoUrl}
              controls={true}
              className="w-full h-full object-contain"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
            />
          ) : isClient && bvid ? (
            <iframe
              src={`https://player.bilibili.com/player.html?bvid=${bvid}&page=1`}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen={true}
              title="Bilibili Video"
            />
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
          <Tab id="chat" label="AI Chat" />
          <Tab id="subtitles" label="Subtitles" />
        </Tabs>

        <div className="flex-1 overflow-auto p-4 min-h-0 flex flex-col">
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
              />
            ) : (
              <SubtitleList subtitleData={subtitleData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
