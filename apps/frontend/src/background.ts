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

  // 注意：不能在非用户手势时自动打开侧边栏
  // 用户需要手动点击扩展图标来打开侧边栏
});

// 监听浏览器启动事件
chrome.runtime.onStartup.addListener(() => {
  // 注意：不能在非用户手势时自动打开侧边栏
  // 用户需要手动点击扩展图标来打开侧边栏
});

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener((_tabId) => {
  // 注意：不能在非用户手势时自动打开侧边栏
  // 用户需要手动点击扩展图标来打开侧边栏
});

// 监听标签页激活事件
chrome.tabs.onActivated.addListener(() => {
  // 注意：不能在非用户手势时自动打开侧边栏
  // 用户需要手动点击扩展图标来打开侧边栏
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
    return false;
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
      return false;
    }
  } else if (message.type === 'JUMP_TO_TIME') {
    console.log('收到跳转时间请求:', message.time);

    // 获取当前活动标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        console.log('发送跳转指令到标签页:', tabs[0].id);
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            type: 'SEEK_TO_TIME',
            time: message.time,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('发送跳转指令失败:', chrome.runtime.lastError.message);
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
              console.log('跳转指令发送成功:', response);
              sendResponse({ success: true, response });
            }
          }
        );
      } else {
        console.error('未找到活动标签页');
        sendResponse({ success: false, error: '未找到活动标签页' });
      }
    });
    return true;
  } else {
    console.log('收到其他类型消息:', message.type);
    sendResponse({ received: true });
    return false;
  }
});

const fetchSubtitleDataByBvid = async (bvid: string, tabId: number) => {
  console.log('开始主动请求字幕数据，bvid:', bvid);

  try {
    const wbiUrl = `https://api.bilibili.com/x/player/wbi/v2?bvid=${bvid}`;
    console.log('请求 wbi/v2 接口:', wbiUrl);

    currentRequestId++;
    const requestId = currentRequestId;
    console.log('生成新的 requestId (主动请求):', requestId);

    const response = await fetch(wbiUrl);
    const text = await response.text();
    const data = JSON.parse(text);

    console.log('成功解析 wbi/v2 数据:', data, 'requestId:', requestId);

    if (data.data && data.data.subtitle && data.data.subtitle.subtitles) {
      const aiSubtitle = data.data.subtitle.subtitles.find((i: any) => i.lan === 'ai-zh');

      if (aiSubtitle && aiSubtitle.subtitle_url) {
        console.log('找到 AI 中文字幕 URL:', aiSubtitle.subtitle_url, 'requestId:', requestId);
        const url = `https:${aiSubtitle.subtitle_url}`;

        const subtitleResponse = await fetch(url);
        const subtitleText = await subtitleResponse.text();
        const subtitleData = JSON.parse(subtitleText);

        const finalData = subtitleData.body || subtitleData;

        if (requestId !== currentRequestId) {
          console.log(
            '主动请求已过期，跳过存储',
            'requestId:',
            requestId,
            'currentRequestId:',
            currentRequestId
          );
          throw new Error('请求已过期');
        }

        chrome.storage.local.set(
          {
            subtitleData: finalData,
            subtitleUrl: url,
            timestamp: Date.now(),
          },
          () => {
            console.log('字幕数据已存储到 chrome.storage', 'requestId:', requestId);
          }
        );

        if (tabId > 0) {
          chrome.tabs.sendMessage(
            tabId,
            {
              type: 'SUBTITLE_DATA',
              url: url,
              body: subtitleData,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.log(
                  '发送消息到 content script 失败（可能未加载）:',
                  chrome.runtime.lastError.message
                );
              } else {
                console.log('成功发送消息到 content script:', response);
              }
            }
          );
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
  },
  {
    urls: ['<all_urls>'],
  }
);

// 监听网络响应
let currentRequestId = 0;
const fetchingUrls = new Set<string>();

chrome.webRequest.onCompleted.addListener(
  (details) => {
    const fetchSubtitleData = async (subtitleUrl: string, tabId: number, requestId: number) => {
      if (fetchingUrls.has(subtitleUrl)) {
        console.log('字幕 URL 正在获取中，跳过:', subtitleUrl, 'requestId:', requestId);
        return;
      }

      fetchingUrls.add(subtitleUrl);
      console.log('开始获取字幕数据:', subtitleUrl, 'requestId:', requestId);

      try {
        const response = await fetch(subtitleUrl);
        const text = await response.text();
        console.log('成功获取字幕文本，长度:', text.length, 'requestId:', requestId);

        try {
          const data = JSON.parse(text);
          console.log('成功解析字幕数据', 'requestId:', requestId);

          const subtitleData = data.body || data;

          if (requestId !== currentRequestId) {
            console.log(
              '请求已过期，跳过存储',
              'requestId:',
              requestId,
              'currentRequestId:',
              currentRequestId
            );
            fetchingUrls.delete(subtitleUrl);
            return;
          }

          chrome.storage.local.set(
            {
              subtitleData: subtitleData,
              subtitleUrl: subtitleUrl,
              timestamp: Date.now(),
            },
            () => {
              console.log('字幕数据已存储到 chrome.storage', 'requestId:', requestId);
            }
          );

          if (tabId > 0) {
            chrome.tabs.sendMessage(
              tabId,
              {
                type: 'SUBTITLE_DATA',
                url: subtitleUrl,
                body: data,
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.log(
                    '发送消息到 content script 失败（可能未加载）:',
                    chrome.runtime.lastError.message
                  );
                } else {
                  console.log('成功发送消息到 content script:', response);
                }
              }
            );
          }
        } catch (error) {
          console.error('解析字幕数据失败:', error);
        }
      } catch (error) {
        console.error('获取字幕数据失败:', error);
      } finally {
        fetchingUrls.delete(subtitleUrl);
      }
    };

    if (details.url.includes('https://api.bilibili.com/x/player/wbi/v2')) {
      console.log('拦截到 wbi/v2 接口响应:', details.url);

      if (details.tabId > 0) {
        currentRequestId++;
        const requestId = currentRequestId;
        console.log('生成新的 requestId:', requestId);

        fetch(details.url)
          .then((response) => response.text())
          .then((text) => {
            try {
              const data = JSON.parse(text);
              console.log('成功解析 wbi/v2 数据:', data, 'requestId:', requestId);

              if (data.data && data.data.subtitle && data.data.subtitle.subtitles) {
                const aiSubtitle = data.data.subtitle.subtitles.find((i: any) => i.lan === 'ai-zh');

                if (aiSubtitle && aiSubtitle.subtitle_url) {
                  const url = `https:${aiSubtitle.subtitle_url}`;
                  console.log('找到 AI 中文字幕 url:', url, 'requestId:', requestId);

                  fetchSubtitleData(url, details.tabId, requestId);
                } else {
                  console.log('未找到 ai-zh 字幕', 'requestId:', requestId);
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
  },
  {
    urls: ['*://api.bilibili.com/*'],
  }
);

console.log('Background service worker loaded');

// 导出一个空对象，使文件成为有效的 ES 模块
export {};
