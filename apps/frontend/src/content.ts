// content.ts
// 实现接口拦截逻辑
import { createDanmakuPanel } from './components/danmakuShadowDOM';
console.log('Content script 开始加载...');
console.log('当前页面 URL:', window.location.href);

// 存储拦截到的响应数据
let interceptedResponseData: any = null;

// 发送响应数据到 background script 的函数
function sendResponseToBackground(url: string, data: any) {
  console.log('准备发送数据到 background script:', url, data);
  chrome.runtime.sendMessage(
    {
      type: 'RESPONSE_BODY',
      url: url,
      body: data,
    },
    (response) => {
      console.log('Background script 响应:', response);
      if (chrome.runtime.lastError) {
        console.error('发送消息失败:', chrome.runtime.lastError);
      }
    }
  );
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    message.type === 'GET_RESPONSE_BODY' &&
    message.url.includes('https://aisubtitle.hdslb.com/bfs/ai_subtitle/prod')
  ) {
    console.log('收到 background 请求响应体:', message.url);

    sendResponse({
      type: 'RESPONSE_BODY',
      url: message.url,
      body: interceptedResponseData || 'No data intercepted',
    });
  } else if (message.type === 'SEEK_TO_TIME') {
    console.log('收到跳转请求，跳转到:', message.time);

    const video = document.querySelector('video');
    if (video) {
      video.currentTime = message.time;
      video.play();
      sendResponse({ success: true, message: '已跳转到指定时间' });
    } else {
      sendResponse({ success: false, message: '未找到视频元素' });
    }
  }

  return true;
});

// 监听来自影子DOM的消息
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SEEK_TO_TIME') {
    console.log('收到来自影子DOM的跳转请求:', event.data.time);

    const video = document.querySelector('video');
    if (video) {
      video.currentTime = event.data.time;
      video.play();
    } else {
      console.error('未找到视频元素');
    }
  }
});

// 重写 fetch 方法以拦截特定接口
const originalFetch = window.fetch;

window.fetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlString = typeof url === 'string' ? url : url.toString();

  // 只拦截字幕接口，其他请求（包括 OpenAI API）直接放行
  if (!urlString.includes('https://aisubtitle.hdslb.com/bfs/ai_subtitle/prod')) {
    return originalFetch(url, init);
  }

  console.log('拦截到字幕接口请求:', urlString);

  try {
    // 1. 发送真实的请求
    const res = await originalFetch(url, init);
    console.log('收到响应:', res);

    // 2. 克隆响应对象（因为响应对象只能被读取一次）
    const clone = res.clone();
    console.log('克隆完成，准备读取数据...');

    // 3. 读取克隆的响应体
    const myData = await clone.json();
    console.log('插件拿到真实数据:', myData);

    // 4. 存储拦截到的响应数据
    interceptedResponseData = myData;

    // 5. 发送响应数据到 background script
    sendResponseToBackground(urlString, myData);

    // 6. 返回原始响应
    return res;
  } catch (error) {
    console.error('获取响应数据失败:', error);

    // 如果出错，返回模拟数据
    const mockSubtitleData = {
      code: 0,
      message: 'success',
      data: {
        subtitles: [
          {
            from: 0,
            to: 3000,
            content: '这是一段模拟的字幕内容',
            lang: 'zh',
          },
          {
            from: 3000,
            to: 6000,
            content: '这是第二段模拟的字幕内容',
            lang: 'zh',
          },
        ],
      },
    };

    interceptedResponseData = mockSubtitleData;
    sendResponseToBackground(urlString, mockSubtitleData);

    return new Response(JSON.stringify(mockSubtitleData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

// 重写 XMLHttpRequest 以拦截特定接口
const originalXHROpen = XMLHttpRequest.prototype.open;

XMLHttpRequest.prototype.open = function (
  method: string,
  url: string | URL,
  async?: boolean,
  username?: string | null,
  password?: string | null
) {
  const urlString = typeof url === 'string' ? url : url.toString();

  console.log('XHR 请求:', urlString);

  // 拦截特定接口
  if (urlString.includes('https://aisubtitle.hdslb.com/bfs/ai_subtitle/prod')) {
    console.log('拦截到字幕接口请求 (XHR):', urlString);

    // 保存原始的 send 方法
    const originalSend = this.send;

    // 重写 send 方法以拦截响应
    this.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      // 保存原始的 onreadystatechange 和 onload
      const originalOnReadyStateChange = this.onreadystatechange;
      const originalOnLoad = this.onload;

      // 重写 onreadystatechange 来捕获响应
      this.onreadystatechange = function (event?: Event) {
        // 当请求完成时
        if (this.readyState === 4 && this.status === 200) {
          try {
            // 解析响应数据
            const myData = JSON.parse(this.responseText);
            console.log('XHR 插件拿到真实数据:', myData);

            // 存储拦截到的响应数据
            interceptedResponseData = myData;

            // 发送响应数据到 background script
            sendResponseToBackground(urlString, myData);
          } catch (error) {
            console.error('解析 XHR 响应数据失败:', error);

            // 如果解析失败，返回模拟数据
            const mockSubtitleData = {
              code: 0,
              message: 'success',
              data: {
                subtitles: [
                  {
                    from: 0,
                    to: 3000,
                    content: '这是一段模拟的字幕内容',
                    lang: 'zh',
                  },
                  {
                    from: 3000,
                    to: 6000,
                    content: '这是第二段模拟的字幕内容',
                    lang: 'zh',
                  },
                ],
              },
            };

            interceptedResponseData = mockSubtitleData;
            sendResponseToBackground(urlString, mockSubtitleData);
          }
        }

        // 调用原始的 onreadystatechange
        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.call(this, event as any);
        }
      };

      // 重写 onload 来捕获响应
      this.onload = function (event: ProgressEvent<EventTarget>) {
        try {
          // 解析响应数据
          const myData = JSON.parse(this.responseText);
          console.log('XHR onload 插件拿到真实数据:', myData);

          // 存储拦截到的响应数据
          interceptedResponseData = myData;

          // 发送响应数据到 background script
          sendResponseToBackground(urlString, myData);
        } catch (error) {
          console.error('解析 XHR onload 响应数据失败:', error);
        }

        // 调用原始的 onload
        if (originalOnLoad) {
          originalOnLoad.call(this, event);
        }
      };

      // 调用原始的 send 方法
      originalSend.call(this, body);
    };
  }

  return originalXHROpen.call(this, method, url, async ?? true, username, password);
};

console.log('拦截器设置完成');
console.log('window.fetch 是否被覆盖:', window.fetch !== originalFetch);
console.log(
  'XMLHttpRequest.prototype.open 是否被覆盖:',
  XMLHttpRequest.prototype.open !== originalXHROpen
);

// 等待 DOM 完全加载后再创建面板
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 加载完成，创建弹幕面板');
    createDanmakuPanel();
  });
} else {
  console.log('DOM 已就绪，直接创建弹幕面板');
  createDanmakuPanel();
}

const onExecute = (params?: any) => {
  console.log('Content script executed', params);
  console.log('拦截器已设置完成');
};

export { onExecute };
