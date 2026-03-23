/* eslint-disable no-undef */
import React, { useState, useRef, useEffect } from 'react';
import { streamChat, Message } from './services/chat';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { SubtitleItem } from './components/subtitleUtils';
import { VideoTheme } from './services/themeService';
import { MarkdownWithTimestamps } from './components/MarkdownWithTimestamps';

const PRESET_QUESTIONS = [
  '这个视频讲了什么?',
  '这个视频的主要观点是什么?',
  'How does pair programming apply to AI coding?',
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [themes, setThemes] = useState<VideoTheme[]>([]);
  const [showVideoSwitchAlert, setShowVideoSwitchAlert] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const loadSubtitlesAndThemes = () => {
      chrome.storage.local.get(['subtitleData', 'themeData'], (result) => {
        console.log('=== App: 加载字幕和主题数据 ===');

        let subtitleItems: SubtitleItem[] = [];

        if (result.subtitleData) {
          const data = result.subtitleData as any;

          if (Array.isArray(data)) {
            subtitleItems = data;
          } else if (data.data && Array.isArray(data.data.subtitles)) {
            subtitleItems = data.data.subtitles;
          } else if (data.body && data.body.data && Array.isArray(data.body.data.subtitles)) {
            subtitleItems = data.body.data.subtitles;
          }
        }

        setSubtitles(subtitleItems);
        console.log(`加载了 ${subtitleItems.length} 条字幕`);

        if (result.themeData && Array.isArray(result.themeData)) {
          setThemes(result.themeData);
          console.log(`加载了 ${result.themeData.length} 个主题`);
        }

        console.log('==================\n');
      });
    };

    loadSubtitlesAndThemes();

    const handleStorageChange = (changes: any, namespace: string) => {
      if (namespace === 'local') {
        if (changes.subtitleData || changes.themeData) {
          console.log('检测到字幕或主题数据变化，重新加载');
          // 清空聊天记录
          if (changes.subtitleData) {
            console.log('字幕数据变化，清空聊天记录');
            setMessages([]);
            // 显示视频切换提醒
            setShowVideoSwitchAlert(true);
            // 3秒后自动隐藏提醒
            setTimeout(() => {
              setShowVideoSwitchAlert(false);
            }, 3000);
          }
          loadSubtitlesAndThemes();
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const sendMessage = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage = question.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      let fullResponse = '';
      console.log(userMessage, messages, 'userMessage, messages');
      console.log('字幕数量:', subtitles.length, '主题数量:', themes.length);

      for await (const chunk of streamChat(userMessage, messages, subtitles, themes)) {
        fullResponse = chunk.answer;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: fullResponse, timestamps: chunk.timestamps },
        ]);
        console.log('当前响应:', fullResponse);
        console.log('当前时间戳:', chunk.timestamps);
        console.log('messages:', messages);
      }
    } catch (error) {
      console.error('聊天错误:', error);

      let errorMessage = '抱歉，发生了错误，请稍后再试。';

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();

        if (
          errorMsg.includes('rate limit') ||
          errorMsg.includes('too many requests') ||
          errorMsg.includes('请求过于频繁')
        ) {
          errorMessage = '⏳ 请求过于频繁，请稍等片刻再试。';
        } else if (
          errorMsg.includes('quota') ||
          errorMsg.includes('balance') ||
          errorMsg.includes('额度不足')
        ) {
          errorMessage = '💳 API 额度不足，请检查您的 API 余额。';
        } else if (
          errorMsg.includes('timeout') ||
          errorMsg.includes('busy') ||
          errorMsg.includes('服务器')
        ) {
          errorMessage = '🤖 AI 助手正在思考中，服务器暂时繁忙，请稍后再试。';
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          errorMessage = '🌐 网络连接失败，请检查您的网络设置。';
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimestampClick = (timestamp: string) => {
    const [minutesStr, secondsStr] = timestamp.split(':');
    const minutes = Number(minutesStr);
    const seconds = Number(secondsStr);
    if (isNaN(minutes) || isNaN(seconds)) return;
    // 确保秒数不超过 59
    const totalSeconds = minutes * 60 + Math.min(seconds, 59);
    console.log(`跳转到时间点: ${timestamp} (${totalSeconds}秒)`);
    chrome.runtime.sendMessage({
      type: 'JUMP_TO_TIME',
      time: totalSeconds,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-4 flex items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <span className="text-gray-500 text-sm">Generate cheatsheet image</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* 视频切换提醒 */}
        {showVideoSwitchAlert && (
          <div className="mb-4 max-w-3xl mx-auto">
            <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-blue-700 text-sm font-medium">视频已切换，已更新聊天记录</span>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          /* Preset Questions */
          <div className="flex flex-col items-end justify-end gap-3 pt-8">
            {PRESET_QUESTIONS.map((question, index) => (
              <button
                key={index}
                onClick={() => sendMessage(question)}
                className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-700 text-sm transition-colors border border-gray-200"
              >
                {question}
              </button>
            ))}
          </div>
        ) : (
          /* Chat Messages */
          <div className="flex flex-col gap-4 max-w-3xl mx-auto">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed overflow-auto ${
                    msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    !msg.content ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-gray-600">正在思考……</span>
                      </div>
                    ) : (
                      <MarkdownWithTimestamps
                        content={msg.content}
                        onTimestampClick={handleTimestampClick}
                      />
                    )
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-100 px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the video..."
            disabled={isLoading}
            className="w-full px-5 py-3.5 pr-12 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-gray-900 text-white rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
