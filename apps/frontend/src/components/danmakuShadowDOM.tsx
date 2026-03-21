import ReactDOM from 'react-dom/client';
import { SubtitleList } from './SubtitleList';
import { SubtitleItem, processSubtitles } from './subtitleUtils';
import { useState, useEffect } from 'react';

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

  useEffect(() => {
    const loadSubtitles = () => {
      chrome.storage.local.get(['subtitleData'], (result) => {
        console.log('从 storage 读取的字幕数据:', result.subtitleData);

        let items: SubtitleItem[] = [];

        if (result.subtitleData) {
          const data = result.subtitleData as any;

          if (Array.isArray(data)) {
            items = data;
          } else if (data.data && Array.isArray(data.data.subtitles)) {
            items = data.data.subtitles;
          } else if (data.body && data.body.data && Array.isArray(data.body.data.subtitles)) {
            items = data.body.data.subtitles;
          }
        }

        // console.log('解析后的字幕数组:', items);
        setSubtitleItems(items);
      });
    };

    loadSubtitles();

    const handleStorageChange = (changes: any, namespace: string) => {
      if (namespace === 'local' && changes.subtitleData) {
        console.log('字幕数据已更新，重新加载');
        loadSubtitles();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

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
      content: <div className="p-4">111</div>,
    },
  ];

  return <ShadowTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
}

let existingShadowHost: any | null = null;

export function createDanmakuPanel() {
  const danmukuBox = document.querySelector('.danmaku-box');
  const danmakuWrap = document.querySelector('.danmaku-wrap');

  if (!danmukuBox) {
    console.log('未找到 .danmaku-box 元素');
    return;
  }

  if (!danmakuWrap) {
    console.log('未找到 .danmaku-wrap 元素');
    return;
  }

  if (existingShadowHost && document.body.contains(existingShadowHost)) {
    console.log('弹幕面板已存在，跳过创建');
    return {
      shadowHost: existingShadowHost,
      shadowRoot: existingShadowHost.shadowRoot,
      updateSubtitle: () => {
        console.warn('更新字幕功能在已存在实例中不可用');
      },
    };
  }

  const danmakuWrapRect = danmakuWrap.getBoundingClientRect();
  const danmukuBoxRect = danmukuBox.getBoundingClientRect();

  const shadowHost = document.createElement('div');
  shadowHost.id = 'danmaku-shadow-host';
  shadowHost.setAttribute('data-extension', 'learning-assistant');

  Object.assign(shadowHost.style, {
    // position: 'absolute',
    top: `${danmakuWrapRect.top - danmukuBoxRect.top - 410}px`,
    left: `${danmakuWrapRect.left - danmukuBoxRect.left}px`,
    width: `${danmakuWrapRect.width}px`,
    maxHeight: '420px',
    zIndex: '9999',
    marginBottom: '20px',
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
  `;

  const reactRoot = document.createElement('div');
  reactRoot.id = 'react-root';

  shadowRoot.appendChild(style);
  shadowRoot.appendChild(reactRoot);

  danmukuBox.insertBefore(shadowHost, danmakuWrap);

  existingShadowHost = shadowHost;

  const root = ReactDOM.createRoot(reactRoot);

  root.render(<DanmakuPanel />);

  setTimeout(() => {
    if (shadowHost && document.body.contains(shadowHost)) {
      shadowHost.style.visibility = 'visible';
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
}
