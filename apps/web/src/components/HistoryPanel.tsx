'use client';

import { useState, useEffect } from 'react';
import { getUploadHistory } from '@/utils/fileHash';
import { videoStorage } from '@/utils/videoStorage';
import { useToast } from './Toast';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHistory: (hash: string, videoUrl: string) => void;
  currentVideoHash?: string;
}

export default function HistoryPanel({
  isOpen,
  onClose,
  onSelectHistory,
  currentVideoHash,
}: HistoryPanelProps) {
  const { showToast } = useToast();
  const [history, setHistory] = useState<Array<{ hash: string } & any>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHash, setLoadingHash] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const uploadHistory = getUploadHistory();
      setHistory(uploadHistory);
    }
  }, [isOpen]);

  const handleHistoryClick = async (hash: string) => {
    setLoading(true);
    setLoadingHash(hash);

    try {
      const video = await videoStorage.getVideo(hash);
      if (video) {
        const videoUrl = URL.createObjectURL(video);
        onSelectHistory(hash, videoUrl);
      } else {
        showToast('视频文件未找到，请重新上传', 'error');
      }
    } catch (error) {
      console.error('加载视频失败:', error);
      showToast('加载视频失败，请重试', 'error');
    } finally {
      setLoading(false);
      setLoadingHash('');
    }
  };

  if (!isOpen) {
    return null;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">视频历史</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <p>暂无历史记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <button
                    key={item.hash}
                    onClick={() => handleHistoryClick(item.hash)}
                    disabled={loading}
                    className={`w-full text-left p-4 rounded-lg border transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed ${
                      currentVideoHash === item.hash
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-700">
                          {item.filename}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">{formatFileSize(item.size)}</p>
                      </div>
                      {loading && loadingHash === item.hash ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 ml-2 flex-shrink-0"></div>
                      ) : (
                        <svg
                          className="w-5 h-5 text-gray-400 group-hover:text-blue-500 ml-2 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{formatDate(item.uploadedAt)}</span>
                      <span>{item.chatMessages?.length || 0} 条对话</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
