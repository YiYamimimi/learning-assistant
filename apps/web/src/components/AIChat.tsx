'use client';

import React, { useState, useRef, useEffect } from 'react';
import MarkdownWithTimestamps from './MarkdownWithTimestamps';

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
}

export default function AIChat({ subtitleData }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [relevantChunks, setRelevantChunks] = useState<RelevantChunk[]>([]);
  const messagesEndRef = useRef<globalThis.HTMLDivElement>(null);

  const PRESET_QUESTIONS = [
    '这个视频的主要收获是什么?',
    '这个视频中最精彩的语录是什么?',
    '这个视频的主要观点是什么?',
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, relevantChunks]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60);
    const seconds = Math.floor(ms % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimestampClick = (timestamp: string) => {
    const [minutesStr, secondsStr] = timestamp.split(':');
    const minutes = Number(minutesStr);
    const seconds = Number(secondsStr);
    if (isNaN(minutes) || isNaN(seconds)) return;
    const totalSeconds = minutes * 60 + Math.min(seconds, 59);
    console.log(`跳转到时间点: ${timestamp} (${totalSeconds}秒)`);
    // 这里可以添加跳转到视频时间的逻辑
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setRelevantChunks([]);

    try {
      // Simulate AI response (will connect to OpenAI API later)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'This is a mock AI response. In production, this would connect to the OpenAI API.',
        },
      ]);

      // Mock relevant chunks
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
      setMessages((prev) => [...prev, { role: 'assistant', content: '抱歉，发生了错误。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.length === 0 && (
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
        )}

        {messages.map((msg, index) => (
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

        {relevantChunks.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-700 mb-2">📺 相关字幕</h3>
            <div className="space-y-2">
              {relevantChunks.map((chunk, index) => (
                <div key={index} className="p-2 bg-white rounded border border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">
                    {formatTime(chunk.startTime)} - {formatTime(chunk.endTime)}
                    <span className="ml-2 text-xs">
                      (相似度: {(chunk.similarity * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-sm">{chunk.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center">
            <div className="typing-indicator">
              <span
                className="h-2 w-2 bg-gray-400 rounded-full mx-0.5 animate-bounce"
                style={{ animationDelay: '0ms' }}
              ></span>
              <span
                className="h-2 w-2 bg-gray-400 rounded-full mx-0.5 animate-bounce"
                style={{ animationDelay: '150ms' }}
              ></span>
              <span
                className="h-2 w-2 bg-gray-400 rounded-full mx-0.5 animate-bounce"
                style={{ animationDelay: '300ms' }}
              ></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex border-t border-gray-200 pt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="输入问题..."
          disabled={isLoading}
          className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 disabled:bg-gray-300"
        >
          发送
        </button>
      </div>
    </div>
  );
}
