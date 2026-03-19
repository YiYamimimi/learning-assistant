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

    // 将字幕数据存储到 chrome.storage 中，以便后续使用
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
  } else {
    console.log('收到其他类型消息:', message.type);
    sendResponse({ received: true });
  }

  return true; // 保持消息通道打开，用于异步响应
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('https://aisubtitle.hdslb.com/bfs/ai_subtitle/prod')) {
      console.log('拦截到字幕接口请求 (background):', details.url);
    }
    return {};
  },
  {
    urls: ['*://aisubtitle.hdslb.com/*'],
  },
  ['blocking']
);

// 监听网络响应
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.url.includes('https://aisubtitle.hdslb.com/bfs/ai_subtitle/prod')) {
      console.log('收到字幕接口响应 (onCompleted):', details.url);
      console.log('响应状态:', details.statusCode);
      console.log('响应类型:', details.type);
      console.log('响应时间:', details.timeStamp);
      console.log('Tab ID:', details.tabId);
      console.log('请求方法:', details.method);
      console.log('响应头:', details.responseHeaders);

      // 获取响应数据
      if (details.tabId > 0) {
        console.log('准备获取响应体...');

        // 使用 fetch 获取响应体
        fetch(details.url)
          .then((response) => {
            console.log('Fetch 响应状态:', response.status);
            console.log('Fetch 响应类型:', response.type);
            return response.text();
          })
          .then((text) => {
            console.log('成功获取响应文本，长度:', text.length);
            console.log('响应文本前100字符:', text.substring(0, 100));

            try {
              const data = JSON.parse(text);
              console.log('成功解析字幕数据:', data);

              const subtitleData = data.body || data;

              // 将字幕数据存储到 chrome.storage 中
              chrome.storage.local.set(
                {
                  subtitleData: subtitleData,
                  subtitleUrl: details.url,
                  timestamp: Date.now(),
                },
                () => {
                  console.log('字幕数据已存储到 chrome.storage');
                }
              );

              // 通知 content script
              chrome.tabs.sendMessage(details.tabId, {
                type: 'SUBTITLE_DATA',
                url: details.url,
                body: data,
              });
            } catch (error) {
              console.error('解析响应数据失败:', error);
              console.log('响应文本:', text);
            }
          })
          .catch((error) => {
            console.error('获取响应体失败:', error);
          });
      } else {
        console.log('Tab ID 无效，无法获取响应体');
      }
    }
  },
  {
    urls: ['*://aisubtitle.hdslb.com/*'],
  }
);

console.log('Background service worker loaded');

// 导出一个空对象，使文件成为有效的 ES 模块
export {};
