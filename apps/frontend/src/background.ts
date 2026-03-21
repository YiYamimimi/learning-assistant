// background.ts
// 实现后台服务逻辑

// 监听扩展图标点击事件（左击）
chrome.action.onClicked.addListener((tab) => {
  console.log('扩展图标被点击，打开侧边栏');
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// 监听安装事件
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);

  // 自动打开侧边栏
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
});

// 监听浏览器启动事件，自动打开侧边栏
chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
});

// 监听标签页更新事件，确保侧边栏保持打开
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// 监听标签页激活事件，确保侧边栏保持打开
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.sidePanel.open({ windowId: activeInfo.windowId });
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background 收到消息:', message);
  console.log('消息发送者:', sender);

  if (message.type === 'RESPONSE_BODY') {
    console.log('收到字幕数据:', message.url);
    console.log('字幕内容:', JSON.stringify(message.body, null, 2));

    chrome.storage.local.set(
      {
        subtitleData: message.body,
        subtitleUrl: message.url,
        timestamp: Date.now(),
      },
      () => {
        console.log('字幕数据已存储到 chrome.storage');
      }
    );

    sendResponse({ received: true, success: true });
  } else if (message.type === 'REQUEST_SUBTITLE_DATA') {
    console.log('收到主动请求字幕数据的消息:', message);

    if (message.bvid) {
      fetchSubtitleDataByBvid(message.bvid, sender.tab?.id || -1)
        .then((result) => {
          sendResponse({ success: true, data: result });
        })
        .catch((error) => {
          console.error('主动请求字幕数据失败:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    } else {
      sendResponse({ success: false, error: '缺少 bvid 参数' });
    }
  } else {
    console.log('收到其他类型消息:', message.type);
    sendResponse({ received: true });
  }

  return true;
});

const fetchSubtitleDataByBvid = async (bvid: string, tabId: number) => {
  console.log('开始主动请求字幕数据，bvid:', bvid);

  try {
    const wbiUrl = `https://api.bilibili.com/x/player/wbi/v2?bvid=${bvid}`;
    console.log('请求 wbi/v2 接口:', wbiUrl);

    const response = await fetch(wbiUrl);
    const text = await response.text();
    const data = JSON.parse(text);

    console.log('成功解析 wbi/v2 数据:', data);

    if (data.data && data.data.subtitle && data.data.subtitle.subtitles) {
      const aiSubtitle = data.data.subtitle.subtitles.find((i: any) => i.lan === 'ai-zh');

      if (aiSubtitle && aiSubtitle.subtitle_url) {
        console.log('找到 AI 中文字幕 URL:', aiSubtitle.subtitle_url);
        const url = `https:${aiSubtitle.subtitle_url}`;
        chrome.storage.local.set({
          aiSubtitleUrl: url,
          timestamp: Date.now(),
        });

        const subtitleResponse = await fetch(url);
        const subtitleText = await subtitleResponse.text();
        const subtitleData = JSON.parse(subtitleText);

        const finalData = subtitleData.body || subtitleData;

        chrome.storage.local.set(
          {
            subtitleData: finalData,
            subtitleUrl: url,
            timestamp: Date.now(),
          },
          () => {
            console.log('字幕数据已存储到 chrome.storage');
          }
        );

        if (tabId > 0) {
          chrome.tabs.sendMessage(tabId, {
            type: 'SUBTITLE_DATA',
            url: url,
            body: subtitleData,
          });
        }

        return finalData;
      } else {
        throw new Error('未找到 ai-zh 字幕');
      }
    } else {
      throw new Error('wbi/v2 响应中没有字幕信息');
    }
  } catch (error) {
    console.error('主动请求字幕数据失败:', error);
    throw error;
  }
};

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('https://aisubtitle.hdslb.com/bfs/ai_subtitle/prod')) {
      console.log('拦截到字幕接口请求 (background):', details.url);
    }
    return {};
  },
  {
    urls: ['*:*'],
  },
  ['blocking']
);

// 监听网络响应
chrome.webRequest.onCompleted.addListener(
  (details) => {
    const fetchSubtitleData = async (subtitleUrl: string, tabId: number) => {
      console.log('开始获取字幕数据:', subtitleUrl);

      try {
        const response = await fetch(subtitleUrl);
        const text = await response.text();
        console.log('成功获取字幕文本，长度:', text.length);

        try {
          const data = JSON.parse(text);
          console.log('成功解析字幕数据');

          const subtitleData = data.body || data;

          chrome.storage.local.set(
            {
              subtitleData: subtitleData,
              subtitleUrl: subtitleUrl,
              timestamp: Date.now(),
            },
            () => {
              console.log('字幕数据已存储到 chrome.storage');
            }
          );

          if (tabId > 0) {
            chrome.tabs.sendMessage(tabId, {
              type: 'SUBTITLE_DATA',
              url: subtitleUrl,
              body: data,
            });
          }
        } catch (error) {
          console.error('解析字幕数据失败:', error);
        }
      } catch (error) {
        console.error('获取字幕数据失败:', error);
      }
    };

    if (details.url.includes('https://api.bilibili.com/x/player/wbi/v2')) {
      console.log('拦截到 wbi/v2 接口响应:', details.url);

      if (details.tabId > 0) {
        fetch(details.url)
          .then((response) => response.text())
          .then((text) => {
            try {
              const data = JSON.parse(text);
              console.log('成功解析 wbi/v2 数据:', data);

              if (data.data && data.data.subtitle && data.data.subtitle.subtitles) {
                const aiSubtitle = data.data.subtitle.subtitles.find((i: any) => i.lan === 'ai-zh');

                if (aiSubtitle && aiSubtitle.subtitle_url) {
                  const url = `https:${aiSubtitle.subtitle_url}`;
                  console.log('找到 AI 中文字幕 url:', url);

                  chrome.storage.local.set({
                    aiSubtitleUrl: url,
                    timestamp: Date.now(),
                  });

                  fetchSubtitleData(url, details.tabId);
                } else {
                  console.log('未找到 ai-zh 字幕');
                }
              }
            } catch (error) {
              console.error('解析 wbi/v2 响应失败:', error);
            }
          })
          .catch((error) => {
            console.error('获取 wbi/v2 响应失败:', error);
          });
      }
    }

    if (details.url.includes('https://aisubtitle.hdslb.com/bfs/ai_subtitle/prod')) {
      console.log('拦截到字幕文件响应:', details.url);
      fetchSubtitleData(details.url, details.tabId);
    }
  },
  {
    urls: ['*://api.bilibili.com/*', '*://aisubtitle.hdslb.com/*'],
  }
);

console.log('Background service worker loaded');

// 导出一个空对象，使文件成为有效的 ES 模块
export {};
