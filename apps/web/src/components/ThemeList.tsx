import { useState, useEffect, useRef } from 'react';

/* global HTMLDivElement */

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

interface ThemeListProps {
  currentTime: number;
  videoDuration: number;
  onSeekTime: (time: number) => void;
  themes?: VideoTheme[];
  usageLimitReached?: boolean;
  usageCount?: number;
}

export default function ThemeList({
  currentTime,
  videoDuration,
  onSeekTime,
  themes: externalThemes,
  usageLimitReached,
  usageCount,
}: ThemeListProps) {
  const [themes] = useState<VideoTheme[]>(externalThemes || []);
  const [isLoading] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const parseTimestamp = (timestamp: string): { start: number; end: number } => {
    const match = timestamp.match(/\[(\d+):(\d+)-(\d+):(\d+)\]/);
    if (match) {
      const startMinutes = parseInt(match[1]);
      const startSeconds = parseInt(match[2]);
      const endMinutes = parseInt(match[3]);
      const endSeconds = parseInt(match[4]);

      return {
        start: startMinutes * 60 + startSeconds,
        end: endMinutes * 60 + endSeconds,
      };
    }
    return { start: 0, end: 0 };
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleThemeClick = (startTime: number, quoteTimestamp: string) => {
    console.log('Seek to theme start time:', startTime);
    console.log('Quote timestamp:', quoteTimestamp);
    onSeekTime(startTime);
  };

  const getDotColor = (index: number): string => {
    const colors = [
      '#a855f7', // 紫色
      '#eab308', // 黄色
      '#f97316', // 橙色
      '#22c55e', // 绿色
      '#ec4899', // 粉色
    ];
    return colors[index % colors.length];
  };

  const getBackgroundColor = (index: number): string => {
    const colors = [
      '#f3e8ff', // 浅紫背景
      '#fef3c7', // 浅黄背景
      '#fef2f2', // 浅橙背景
      '#dcfce7', // 浅绿背景
      '#fce7f3', // 浅粉背景
    ];
    return colors[index % colors.length];
  };

  const getProgressColor = (index: number): string => {
    const colors = [
      '#d8b4fe', // 浅紫色
      '#fde68a', // 浅黄色
      '#fdba74', // 浅橙色
      '#a7f3d0', // 浅绿色
      '#f9a8d4', // 浅粉色
    ];
    return colors[index % colors.length];
  };

  const generateTimeMarkers = (duration: number, width: number) => {
    const markers: { time: number; label: string }[] = [];

    const minSpacing = 50;
    const maxMarkers = Math.floor(width / minSpacing);

    let interval: number;
    if (maxMarkers <= 5) {
      interval = Math.ceil(duration / 5);
    } else if (maxMarkers <= 10) {
      interval = Math.ceil(duration / 10);
    } else if (maxMarkers <= 20) {
      interval = Math.ceil(duration / 20);
    } else {
      interval = Math.ceil(duration / 30);
    }

    interval = Math.max(interval, 10);

    for (let time = 0; time <= duration; time += interval) {
      markers.push({
        time,
        label: formatTime(time),
      });
    }

    return markers;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-gray-500">加载主题中...</div>
      </div>
    );
  }



  // Use video duration if available, otherwise fall back to calculated total time
  const effectiveTotalTime = videoDuration;
  const timeMarkers = generateTimeMarkers(effectiveTotalTime, containerWidth);

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      {/* Time markers */}
      <div className="relative h-6 mb-1">
        {timeMarkers.map((marker, index) => (
          <div
            key={`marker-${index}`}
            className="absolute top-0 transform -translate-x-1/2"
            style={{ left: `${(marker.time / effectiveTotalTime) * 100}%` }}
          >
            <div className="text-xs text-gray-500 whitespace-nowrap">{marker.label}</div>
            <div className="w-px h-2 bg-gray-300 mx-auto"></div>
          </div>
        ))}
      </div>

      {/* Progress bar with theme colors */}
      <div className="relative h-4 bg-gray-100 rounded-full mb-4 overflow-hidden">
        {/* Play indicator - red vertical line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 transition-all duration-300"
          style={{
            left: `${(currentTime / effectiveTotalTime) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        ></div>

        {/* Theme color blocks */}
        {themes.map((theme, index) => {
          const { start, end } = parseTimestamp(theme.quote.timestamp);
          const duration = end - start;
          const startPercent = effectiveTotalTime > 0 ? (start / effectiveTotalTime) * 100 : 0;
          const widthPercent = effectiveTotalTime > 0 ? (duration / effectiveTotalTime) * 100 : 0;

          return (
            <div
              key={`progress-${theme.id}`}
              className="absolute top-0 bottom-0 rounded-full"
              style={{
                left: `${startPercent}%`,
                width: `${widthPercent}%`,
                backgroundColor: getProgressColor(index),
                opacity: 0.8,
              }}
            ></div>
          );
        })}
      </div>

      {/* Theme list */}
      {(usageLimitReached && themes.length === 0) ? (<div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="font-medium text-orange-700">已超出使用次数，请登录</p>
          <p className="text-sm text-gray-400">已使用 {usageCount}/2 次</p>
        </div>
      </div>) : (<div className="flex-1 overflow-auto">
        <div className="space-y-1">
          {themes.length > 0 ?
           (themes.map((theme, index) => {
            const { start } = parseTimestamp(theme.quote.timestamp);
            return (
              <div
                key={theme.id}
                className="p-3 rounded-lg cursor-pointer hover:shadow-sm transition-shadow hover:cursor-pointer"
                style={{ backgroundColor: getBackgroundColor(index) }}
                onClick={() => handleThemeClick(start, theme.quote.timestamp)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: getDotColor(index) }}
                    ></div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{theme.title}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">{formatTime(start)}</div>
                </div>
              </div>
            );
          })) : 
          (<div className="flex items-center justify-center h-full text-gray-400 text-sm">暂无主题</div>
          )}

        </div>
      </div>)}
    </div>
  );
}
