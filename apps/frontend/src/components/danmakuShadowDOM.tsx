/* eslint-disable no-undef */
import ReactDOM from 'react-dom/client';
import { SubtitleList } from './SubtitleList';
import { SubtitleItem, processSubtitles } from './subtitleUtils';
import { useState, useEffect } from 'react';
import { ThemeList } from './ThemeList';
import { generateVideoThemes, VideoTheme } from '../services/themeService';

function ShadowTabs({ tabs, activeTab, onTabChange }: any) {
  return (
    <div className="tabs-container">
      <div className="tabs-list">
        {tabs.map((tab: any) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tab-panel-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={`tab-panel-${tabs.find((tab: any) => tab.id === activeTab)?.id}`}
        role="tabpanel"
        className="tab-panel"
      >
        {tabs.find((tab: any) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}

function DanmakuPanel() {
  const [activeTab, setActiveTab] = useState('subtitles');
  const [subtitleItems, setSubtitleItems] = useState<SubtitleItem[]>([]);
  const [themes, setThemes] = useState<VideoTheme[]>([]);
  const [isLoadingThemes, setIsLoadingThemes] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  useEffect(() => {
    const loadSubtitles = () => {
      chrome.storage.local.get(['subtitleData'], (result) => {
        console.log('=== 侧边栏: 字幕加载调试 ===');
        console.log('从 storage 读取的字幕数据:', result.subtitleData);

        let items: SubtitleItem[] = [];

        if (result.subtitleData) {
          const data = result.subtitleData as any;

          if (Array.isArray(data)) {
            items = data;
            console.log('数据格式: 直接数组');
          } else if (data.data && Array.isArray(data.data.subtitles)) {
            items = data.data.subtitles;
            console.log('数据格式: data.subtitles 数组');
          } else if (data.body && data.body.data && Array.isArray(data.body.data.subtitles)) {
            items = data.body.data.subtitles;
            console.log('数据格式: body.data.subtitles 数组');
          } else {
            console.warn('⚠️ 字幕数据格式不匹配:', data);
          }
        } else {
          console.warn('⚠️ subtitleData 为空或不存在');
        }

        console.log(`解析出 ${items.length} 条字幕`);
        if (items.length > 0) {
          console.log('前 3 条字幕示例:');
          items.slice(0, 3).forEach((item, i) => {
            console.log(
              `  ${i + 1}. [${item.from}s-${item.to}s] ${item.content.substring(0, 50)}...`
            );
          });
        }
        console.log('==================\n');

        setSubtitleItems(items);
      });
    };

    loadSubtitles();

    let debounceTimer: any;

    const handleStorageChange = (changes: any, namespace: string) => {
      if (namespace === 'local' && changes.subtitleData) {
        const newData = JSON.stringify(changes.subtitleData.newValue);
        const oldData = JSON.stringify(changes.subtitleData.oldValue);

        if (newData === oldData) {
          console.log('字幕数据未变化，跳过重新加载');
          return;
        }

        console.log('字幕数据已更新，重新加载');

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadSubtitles();
        }, 300);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      clearTimeout(debounceTimer);
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleGenerateThemes = async () => {
    if (subtitleItems.length === 0) {
      setThemeError('暂无字幕数据，无法生成主题');
      return;
    }

    setIsLoadingThemes(true);
    setThemeError(null);

    try {
      const generatedThemes = await generateVideoThemes(subtitleItems);

      console.log(generatedThemes, 'generatedThemes');

      setThemes(generatedThemes);

      chrome.storage.local.set(
        {
          themeData: generatedThemes,
          themeTimestamp: Date.now(),
        },
        () => {
          console.log('主题数据已存储到 chrome.storage');
        }
      );
    } catch (error) {
      console.error('生成主题失败:', error);
      setThemeError(error instanceof Error ? error.message : '生成主题失败，请稍后重试');
    } finally {
      setIsLoadingThemes(false);
    }
  };

  const handleThemeClick = (time: number) => {
    window.postMessage(
      {
        type: 'SEEK_TO_TIME',
        time: time,
      },
      '*'
    );
  };

  const tabs = [
    {
      id: 'subtitles',
      label: '字幕列表',
      content: (
        <div>
          {!subtitleItems.length ? (
            <div className="loading-container">
              <div className="loading-dots">
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
              <div className="loading-text">加载中...</div>
            </div>
          ) : (
            <div style={{ height: '350px' }}>
              <SubtitleList subtitles={processSubtitles(subtitleItems)} />
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'theme',
      label: '视频主题',
      content: (
        <div className="theme-panel">
          {themes.length === 0 && !isLoadingThemes && !themeError ? (
            <div className="theme-empty">
              <div className="theme-empty-icon">🎬</div>
              <div className="theme-empty-text">点击下方按钮生成视频主题</div>
              <button className="generate-themes-button" onClick={handleGenerateThemes}>
                生成主题
              </button>
            </div>
          ) : (
            <>
              <ThemeList
                themes={themes}
                onThemeClick={handleThemeClick}
                isLoading={isLoadingThemes}
                error={themeError}
              />
              {!isLoadingThemes && !themeError && themes.length > 0 && (
                <button className="regenerate-themes-button" onClick={handleGenerateThemes}>
                  重新生成
                </button>
              )}
              {themeError && (
                <button className="retry-themes-button" onClick={handleGenerateThemes}>
                  重试
                </button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return <ShadowTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
}

let existingShadowHost: any | null = null;
let isPanelCreated = false;

const waitForElement = (selector: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!document.body) {
      reject(new Error('Document body is not available'));
      return;
    }

    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer: any = new (window as any).MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // setTimeout(() => {
    //   observer.disconnect();
    //   reject(new Error(`Timeout waiting for element: ${selector}`));
    // }, timeout);
  });
};

const waitForPageStable = (_timeout = 3000): Promise<void> => {
  return new Promise((resolve) => {
    if (!document.body) {
      console.log('Document body is not available, skipping stability check');
      resolve();
      return;
    }

    let timer: any;
    let lastMutationTime = Date.now();

    const observer: any = new (window as any).MutationObserver(() => {
      lastMutationTime = Date.now();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    timer = setInterval(() => {
      const timeSinceLastMutation = Date.now() - lastMutationTime;
      if (timeSinceLastMutation > 500) {
        clearInterval(timer);
        observer.disconnect();
        console.log('页面已稳定，准备插入 Shadow DOM');
        resolve();
      }
    }, 100);

    // setTimeout(() => {
    //   clearInterval(timer);
    //   observer.disconnect();
    //   console.log('等待页面稳定超时，直接插入 Shadow DOM');
    //   resolve();
    // }, timeout);
  });
};

const waitForVideoLoaded = (videoElement: HTMLVideoElement, timeout = 15000): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (videoElement.readyState >= 3) {
      console.log('视频已加载完成');
      resolve();
      return;
    }

    console.log('等待视频加载完成...');

    const handleCanPlay = () => {
      console.log('视频 canplay 事件触发');
      cleanup();
      resolve();
    };

    const handleLoadedData = () => {
      console.log('视频 loadeddata 事件触发');
      cleanup();
      resolve();
    };

    const handleError = (error: Event) => {
      console.error('视频加载失败:', error);
      cleanup();
      reject(new Error('视频加载失败'));
    };

    const cleanup = () => {
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('loadeddata', handleLoadedData);
      videoElement.removeEventListener('error', handleError);
      if (timer) {
        clearTimeout(timer);
      }
    };

    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('loadeddata', handleLoadedData);
    videoElement.addEventListener('error', handleError);

    const timer = setTimeout(() => {
      console.log('等待视频加载超时，继续执行');
      cleanup();
      resolve();
    }, timeout);
  });
};

const waitForVideoPlaying = (videoElement: HTMLVideoElement, duration: number): Promise<void> => {
  return new Promise((resolve) => {
    console.log(`等待视频播放 ${duration / 1000} 秒...`);

    const startTime = Date.now();
    let _isPlaying = false;

    const handlePlay = () => {
      _isPlaying = true;
      console.log('视频开始播放');
    };

    const handlePause = () => {
      _isPlaying = false;
      console.log('视频暂停');
    };

    const checkDuration = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed >= duration) {
        console.log(`视频已播放 ${duration / 1000} 秒`);
        cleanup();
        resolve();
      } else {
        requestAnimationFrame(checkDuration);
      }
    };

    const cleanup = () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
    };

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);

    if (videoElement.currentTime > 0 && !videoElement.paused) {
      _isPlaying = true;
      console.log('视频已在播放中');
    }

    checkDuration();
  });
};

export function createDanmakuPanel() {
  if (isPanelCreated) {
    console.log('弹幕面板已在创建中，跳过');
    return;
  }

  isPanelCreated = true;

  const createPanel = async () => {
    try {
      console.log('开始等待页面元素加载...');
      await waitForElement('.danmaku-box');
      await waitForElement('.danmaku-wrap');
      await waitForElement('video');

      const danmukuBox = document.querySelector('.danmaku-box');
      const danmakuWrap = document.querySelector('.danmaku-wrap');
      const videoElement = document.querySelector('video');

      if (!danmukuBox) {
        console.log('未找到 .danmaku-box 元素');
        isPanelCreated = false;
        return;
      }

      if (!danmakuWrap) {
        console.log('未找到 .danmaku-wrap 元素');
        isPanelCreated = false;
        return;
      }

      if (!videoElement) {
        console.log('未找到 video 元素');
        isPanelCreated = false;
        return;
      }

      if (existingShadowHost && document.body.contains(existingShadowHost)) {
        console.log('弹幕面板已存在，跳过创建');
        isPanelCreated = false;
        return {
          shadowHost: existingShadowHost,
          shadowRoot: existingShadowHost.shadowRoot,
          updateSubtitle: () => {
            console.warn('更新字幕功能在已存在实例中不可用');
          },
        };
      }

      console.log('等待页面稳定...');
      await waitForPageStable(5000);

      console.log('等待视频加载完成...');
      await waitForVideoLoaded(videoElement as HTMLVideoElement, 15000);
      console.log('视频完成');

      console.log('等待视频播放5秒...');
      await waitForVideoPlaying(videoElement as HTMLVideoElement, 5000);
      console.log('视频已播放5秒，准备插入DOM');

      let danmakuWrapRect;
      try {
        danmakuWrapRect = danmakuWrap.getBoundingClientRect();
        if (danmakuWrapRect.width === 0 || danmakuWrapRect.height === 0) {
          console.warn('弹幕容器尺寸异常，使用默认尺寸');
          danmakuWrapRect = { width: 400, height: 420 };
        }
      } catch (error) {
        console.error('获取弹幕容器尺寸失败，使用默认尺寸:', error);
        danmakuWrapRect = { width: 400, height: 420 };
      }

      const shadowHost = document.createElement('div');
      shadowHost.id = 'danmaku-shadow-host';
      shadowHost.setAttribute('data-extension', 'learning-assistant');

      Object.assign(shadowHost.style, {
        position: 'relative',
        top: '0',
        left: '0',
        width: `${danmakuWrapRect.width}px`,
        maxHeight: '420px',
        zIndex: '9999',
        marginBottom: '20px',
        visibility: 'hidden',
      });

      const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = `
    :host {
      display: block;
      width: 100%;
    }
    
    #react-root {
      width: 100%;
      height:420px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    #react-root::-webkit-scrollbar {
      width: 6px;
    }
    
    #react-root::-webkit-scrollbar-track {
      background: #f3f4f6;
      border-radius: 3px;
    }
    
    #react-root::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }
    
    #react-root::-webkit-scrollbar-thumb:hover {
      background: #9ca3af;
    }

    .tabs-container {
      width: 100%;
    }

    .tabs-list {
      position: relative;
      display: flex;
      align-items: center;
      background-color: rgba(243, 244, 246, 0.8);
      border-radius: 0.75rem;
      padding: 0.375rem;
      gap: 0.25rem;
    }

    .tab-button {
      position: relative;
      flex: 1;
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 0.5rem;
      transition: all 0.25s ease-out;
      border: none;
      background: transparent;
      cursor: pointer;
      appearance: none;
      outline: none;
      color: #6b7280;
    }

    .tab-button:hover {
      color: #374151;
      background-color: rgba(229, 231, 235, 0.5);
    }

    .tab-button.active {
      color: #111827;
      background-color: #ffffff;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    }

    .tab-button:focus-visible {
      outline: 2px solid rgba(59, 130, 246, 0.5);
      outline-offset: 2px;
    }

    .tab-panel {
      margin-top: 1rem;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      gap: 16px;
    }

    .loading-dots {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .loading-dot {
      width: 8px;
      height: 8px;
      background-color: #6366f1;
      border-radius: 50%;
      animation: bounce 1.4s ease-in-out infinite;
    }

    .loading-dot:nth-child(1) {
      animation-delay: 0s;
    }

    .loading-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .loading-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes bounce {
      0%, 80%, 100% {
        transform: translateY(0);
        opacity: 0.6;
      }
      40% {
        transform: translateY(-8px);
        opacity: 1;
      }
    }

    .loading-text {
      color: #9ca3af;
      font-size: 14px;
      font-weight: 400;
    }

    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .chat-welcome {
      text-align: center;
      padding: 40px 20px;
      color: #6b7280;
      font-size: 14px;
    }

    .message {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.5;
    }

    .message.user {
      align-self: flex-end;
      background: #3b82f6;
      color: white;
    }

    .message.assistant {
      align-self: flex-start;
      background: #f3f4f6;
      color: #1f2937;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 12px;
      align-self: flex-start;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: #9ca3af;
      border-radius: 50%;
      animation: typing 1.4s ease-in-out infinite;
    }

    .typing-indicator span:nth-child(1) {
      animation-delay: 0s;
    }

    .typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing {
      0%, 80%, 100% {
        transform: translateY(0);
        opacity: 0.6;
      }
      40% {
        transform: translateY(-6px);
        opacity: 1;
      }
    }

    .chat-input-container {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid #e5e7eb;
    }

    .chat-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 20px;
      font-size: 13px;
      outline: none;
    }

    .chat-input:focus {
      border-color: #3b82f6;
    }

    .send-button {
      padding: 8px 16px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
    }

    .send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .relevant-subtitles {
      margin-top: 16px;
      padding: 16px;
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      border-radius: 8px;
    }

    .relevant-subtitles-header {
      font-size: 12px;
      font-weight: 600;
      color: #7c3aed;
      margin-bottom: 8px;
    }

    .relevant-subtitles-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .relevant-chunk {
      background: white;
      padding: 8px;
      border-radius: 6px;
      border: 1px solid #f3e8ff;
    }

    .chunk-time {
      font-size: 11px;
      font-family: monospace;
      color: #7c3aed;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .similarity {
      color: #9ca3af;
      font-size: 10px;
    }

    .chunk-content {
      font-size: 12px;
      color: #374151;
      line-height: 1.6;
    }

    .theme-panel {
      padding: 8px;
      height: 324px;
      overflow-y: auto;
    }

    .theme-panel::-webkit-scrollbar {
      width: 2px;
    }

    .theme-panel::-webkit-scrollbar-track {
      background: #f3f4f6;
      border-radius: 2px;
    }

    .theme-panel::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 2px;
    }

    .theme-panel::-webkit-scrollbar-thumb:hover {
      background: #9ca3af;
    }

    .theme-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      gap: 16px;
    }

    .theme-empty-icon {
      font-size: 48px;
    }

    .theme-empty-text {
      color: #6b7280;
      font-size: 14px;
    }

    .generate-themes-button,
    .regenerate-themes-button,
    .retry-themes-button {
      padding: 10px 24px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .generate-themes-button:hover,
    .regenerate-themes-button:hover,
    .retry-themes-button:hover {
      background: #2563eb;
      transform: translateY(-1px);
    }

    .regenerate-themes-button {
      margin-top: 12px;
      width: 100%;
    }

    .retry-themes-button {
      margin-top: 12px;
      width: 100%;
      background: #ef4444;
    }

    .retry-themes-button:hover {
      background: #dc2626;
    }

    .theme-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 4px;
    }

    .theme-item {
      border-radius: 12px;
      padding: 10px 11px;
      margin-bottom:11px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .theme-item::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%);
      opacity: 0;
      transition: opacity 0.25s;
    }

    .theme-item:hover {
      transform: translateY(-2px) scale(1.01);
      box-shadow: 0 8px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08);
    }

    .theme-item:hover::before {
      opacity: 1;
    }

    .theme-row {
      display: flex;
      align-items: center;
      gap: 14px;
      position: relative;
      z-index: 1;
    }

    .theme-color-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      transition: transform 0.25s;
    }

    .theme-item:hover .theme-color-dot {
      transform: scale(1.15);
    }

    .theme-title-wrapper {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-width: 0;
    }

    .theme-title {
      font-size: 15px;
      font-weight: 600;
      color: #1a1a1a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: 0.3px;
    }

    .theme-time-text {
      font-size: 10px;
      color: #666;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      font-weight: 500;
      white-space: nowrap;
      padding: 2px 8px;
      border-radius: 6px;
      transition: all 0.25s;
    }

    .theme-item:hover .theme-time-text {
      transform: scale(1.05);
    }

    .theme-description {
      font-size: 10px;
      color: #444;
      margin-top: 8px;
      padding-left: 28px;
      white-space: pre-line;
      position: relative;
      z-index: 1;
      letter-spacing: 0.2px;
    }

    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 20px;
      gap: 12px;
    }

    .error-icon {
      font-size: 32px;
    }

    .error-message {
      color: #ef4444;
      font-size: 13px;
      text-align: center;
    }

    .empty-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 20px;
      gap: 12px;
    }

    .empty-icon {
      font-size: 32px;
    }

    .empty-message {
      color: #6b7280;
      font-size: 13px;
    }
  `;

      const reactRoot = document.createElement('div');
      reactRoot.id = 'react-root';

      shadowRoot.appendChild(style);
      shadowRoot.appendChild(reactRoot);

      try {
        if (danmakuWrap && danmakuWrap.parentElement) {
          danmakuWrap.insertAdjacentElement('beforebegin', shadowHost);
        } else if (danmukuBox && danmukuBox.parentElement) {
          console.warn('danmakuWrap 不可用，尝试插入到 danmakuBox');
          danmukuBox.appendChild(shadowHost);
        } else {
          console.error('无法找到合适的父容器插入 shadowHost');
          isPanelCreated = false;
          return;
        }
      } catch (error) {
        console.error('插入 shadowHost 失败，尝试使用 appendChild:', error);
        try {
          if (danmukuBox && danmukuBox.parentElement) {
            danmukuBox.appendChild(shadowHost);
          } else {
            console.error('danmakuBox 也不可用');
            isPanelCreated = false;
            return;
          }
        } catch (error2) {
          console.error('使用 appendChild 也失败:', error2);
          isPanelCreated = false;
          return;
        }
      }

      existingShadowHost = shadowHost;

      const root = ReactDOM.createRoot(reactRoot);

      root.render(<DanmakuPanel />);

      setTimeout(() => {
        if (shadowHost && document.body.contains(shadowHost)) {
          try {
            shadowHost.style.visibility = 'visible';
          } catch (error) {
            console.error('设置可见性失败:', error);
          }
        } else {
          console.warn('shadowHost 不存在，无法设置可见性');
        }
      }, 100);

      return {
        shadowHost,
        shadowRoot,
        updateSubtitle: (subtitles: SubtitleItem[]) => {
          try {
            const processed = processSubtitles(subtitles);
            root.render(<SubtitleList subtitles={processed} />);
          } catch (error) {
            console.error('更新字幕失败:', error);
          }
        },
      };
    } catch (error) {
      console.error('创建弹幕面板失败:', error);
      isPanelCreated = false;
    }
  };

  createPanel();
}
