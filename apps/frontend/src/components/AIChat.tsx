/* eslint-disable no-undef */
import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      console.log('=== 侧边栏: 发送 RAG 查询请求 ===');
      console.log('问题:', userMessage);

      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'RAG_QUERY', question: userMessage }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      console.log('侧边栏: 收到 RAG 响应:', response);

      if (response.success) {
        const { relevantChunks: chunks, context } = response.data;
        setRelevantChunks(chunks);
        console.log('相关字幕:', chunks);
        console.log('上下文:', context);
      } else {
        console.error('RAG 查询失败:', response.error);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `查询失败: ${response.error}` },
        ]);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '抱歉，发生了错误，请确保已打开扩展弹出页面。' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <p>👋 你好！我可以帮你解答关于这个视频的问题。</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}

        {isLoading && (
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="输入问题..."
          disabled={isLoading}
          className="chat-input"
        />
        <button onClick={sendMessage} disabled={isLoading || !input.trim()} className="send-button">
          发送
        </button>
      </div>
    </div>
  );
}
