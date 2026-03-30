'use client';

import { useState, useRef, useEffect } from 'react';
import MarkdownWithTimestamps from './MarkdownWithTimestamps';

/* global TextDecoder */

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamps?: string[];
}

interface RelevantChunk {
  startTime: number;
  endTime: number;
  content: string;
  similarity: number;
}

interface AIChatProps {
  subtitleData: any;
  messages: Message[];
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
}

export default function AIChat({ subtitleData, messages, setMessages }: AIChatProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [relevantChunks, setRelevantChunks] = useState<RelevantChunk[]>([]);
  const messagesEndRef = useRef<globalThis.HTMLDivElement>(null);

  const PRESET_QUESTIONS = [
    '这个视频的主要观点是什么?',
    '这个视频有哪些经常片段?',
    '这个视频中最精彩的语录是什么?',
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, relevantChunks]);

  const handleTimestampClick = (timestamp: string) => {
    const [minutesStr, secondsStr] = timestamp.split(':');
    const minutes = Number(minutesStr);
    const seconds = Number(secondsStr);
    if (isNaN(minutes) || isNaN(seconds)) return;
    const totalSeconds = minutes * 60 + Math.min(seconds, 59);
    console.log(`跳转到时间点: ${timestamp} (${totalSeconds}秒)`);

    const videoElement = document.querySelector('video') as globalThis.HTMLVideoElement;
    if (videoElement) {
      videoElement.currentTime = totalSeconds;
      videoElement.play();
    }
  };

  const sendMessage = async (presetQuestion?: string) => {
    const messageToSend = presetQuestion || input.trim();
    if (!messageToSend || isLoading) return;

    if (!presetQuestion) {
      setInput('');
    }
    setMessages((prev) => [...prev, { role: 'user', content: messageToSend }]);
    setIsLoading(true);
    setRelevantChunks([]);

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
      },
    ]);

    try {
      const cleanSubtitleData =
        subtitleData && Array.isArray(subtitleData)
          ? subtitleData.map((item: any) => ({
              from: item.from,
              to: item.to,
              content: item.content,
            }))
          : null;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
          currentQuestion: messageToSend,
          subtitleData: cleanSubtitleData,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setIsLoading(false);
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    if (newMessages.length > 0) {
                      newMessages[newMessages.length - 1] = {
                        role: 'assistant',
                        content: fullContent,
                      };
                    }
                    return newMessages;
                  });
                }
              } catch (error) {
                console.error('Error parsing JSON:', error);
              }
            }
          }
        }
      }

      if (subtitleData && Array.isArray(subtitleData)) {
        const mockChunks: RelevantChunk[] = subtitleData
          .slice(0, 3)
          .map((chunk: any, index: number) => ({
            startTime: chunk.from || 0,
            endTime: chunk.to || 10,
            content: chunk.content || 'Sample subtitle content',
            similarity: 0.8 + index * 0.05,
          }));
        setRelevantChunks(mockChunks);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages((prev) => {
        const newMessages = [...prev];
        if (newMessages.length > 0) {
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: '抱歉，发生了错误。',
          };
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {
          <div className="flex flex-col items-end justify-end gap-3 pt-1">
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
        }

        {!isLoading &&
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
              >
                {msg.role === 'assistant' ? (
                  <MarkdownWithTimestamps
                    content={msg.content}
                    onTimestampClick={handleTimestampClick}
                  />
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-4 rounded-lg flex items-center gap-3">
              <div className="flex gap-1">
                <span
                  className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></span>
                <span
                  className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></span>
                <span
                  className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></span>
              </div>
              <span className="text-gray-600 text-sm">正在思考……</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex border-t border-gray-200 pt-2 ">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="输入问题..."
          disabled={isLoading}
          className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none text-gray-500 focus:border-gray-400"
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 disabled:bg-gray-300"
        >
          发送
        </button>
      </div>
    </div>
  );
}
