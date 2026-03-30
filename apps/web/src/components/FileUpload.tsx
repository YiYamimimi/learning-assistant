'use client';

/* global sessionStorage */

import { useRef, useState, useEffect } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileVideo, Play, CheckCircle } from 'lucide-react';
import {
  calculateFileHash,
  isVideoUploaded,
  saveVideoMetadata,
  generateSubtitleData,
  generateThemeData,
} from '@/utils/fileHash';
import { videoStorage } from '@/utils/videoStorage';

interface FileUploadProps {
  onVideoUpload: (file: globalThis.File) => void;
  videoFile: globalThis.File | null;
}

export default function FileUpload({ onVideoUpload, videoFile }: FileUploadProps) {
  const videoInputRef = useRef<globalThis.HTMLInputElement>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [usageCount, setUsageCount] = useState(0);
  const [maxUsage] = useState(2);
  const router = useRouter();

  useEffect(() => {
    const checkUsageStatus = async () => {
      try {
        const response = await fetch('/api/record-usage');
        const data = await response.json();
        setUsageCount(data.usageCount || 0);
      } catch (error) {
        console.error('检查使用状态失败:', error);
      } finally {
        setLoadingUsage(false);
      }
    };

    checkUsageStatus();
  }, []);

  const handleVideoUpload = async (e: React.ChangeEvent<globalThis.HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log(file, 'file', e.target.files);

    if (file) {
      onVideoUpload(file);
      setUploadSuccess(true);

      try {
        const fileHash = await calculateFileHash(file);
        console.log('文件哈希值:', fileHash);

        const videoUrl = URL.createObjectURL(file);
        sessionStorage.setItem('localVideoUrl', videoUrl);

        const existingMetadata = isVideoUploaded(fileHash);

        if (existingMetadata) {
          console.log('文件已上传过，使用历史记录');

          await videoStorage.saveVideo(fileHash, file);
          sessionStorage.setItem('videoHash', fileHash);

          setTimeout(() => {
            router.push(`/video?localVideo=true`);
          }, 1500);
          return;
        }

        console.log('新文件，生成字幕和主题');
        const filenameWithoutExt = file.name.replace(/\.[^/.]+$/, '');

        let subtitleData, themeData;

        if (usageCount >= 2) {
          console.log('已达到使用次数限制，不生成字幕和主题');
          subtitleData = null;
          themeData = null;
        } else {
          subtitleData = generateSubtitleData(filenameWithoutExt);
          themeData = generateThemeData();
        }

        const metadata = {
          filename: file.name,
          size: file.size,
          uploadedAt: Date.now(),
          subtitleData,
          themeData,
          chatMessages: [],
        };

        if (usageCount < 2) {
          saveVideoMetadata(fileHash, metadata);
        }

        await videoStorage.saveVideo(fileHash, file);
        sessionStorage.setItem('videoHash', fileHash);

        console.log('字幕数据:', subtitleData);
        console.log('主题数据:', themeData);

        try {
          await fetch('/api/record-usage', {
            method: 'POST',
          });
          console.log('用户使用情况已记录');
          setUsageCount((prev) => prev + 1);
        } catch (usageError) {
          console.error('记录用户使用情况失败:', usageError);
        }

        setTimeout(() => {
          router.push(`/video?localVideo=true`);
        }, 1500);
      } catch (error) {
        console.error('上传失败:', error);
        setUploadSuccess(false);
      }
    }
  };

  const handleTryNow = async () => {
    try {
      await fetch('/api/record-usage', {
        method: 'POST',
      });
      console.log('示例使用情况已记录');
      setUsageCount((prev) => prev + 1);
    } catch (usageError) {
      console.error('记录示例使用情况失败:', usageError);
    }
    window.location.href = '/video?example=true';
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">LongCut</h1>
        <p className="text-gray-500">The best way to learn from long videos.</p>
      </div>

      <div className="space-y-4">
        {/* Video Upload */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">上传视频</h2>
            <FileVideo className="h-5 w-5 text-gray-500" />
          </div>

          {uploadSuccess ? (
            <div className="border-2 border-green-200 rounded-lg p-8 text-center bg-green-50">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium text-green-700 mb-2">上传成功！</p>
              <p className="text-sm text-green-600">正在跳转到视频页面...</p>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${loadingUsage ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-gray-400'}`}
            >
              <>
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">点击或拖拽上传视频文件</p>
                <p className="text-xs text-gray-400">支持 MP4, WebM, AVI 等格式</p>
                {!loadingUsage && (
                  <p className="text-xs text-purple-600 mb-4">
                    已使用 {usageCount}/{maxUsage} 次
                  </p>
                )}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  选择视频文件
                </button>
              </>
            </div>
          )}

          {videoFile && !uploadSuccess && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <FileVideo className="h-5 w-5 text-blue-600 mr-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">{videoFile.name}</p>
                  <p className="text-xs text-blue-700">
                    {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Try Now Button */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
          <div className="text-center">
            <h3 className="text-lg font-bold text-purple-900 mb-2">立即体验</h3>
            <p className="text-sm text-purple-700 mb-2">使用示例内容快速体验 LongCut 的强大功能</p>
            {!loadingUsage && (
              <p className="text-xs text-purple-600 mb-4">
                已使用 {usageCount}/{maxUsage} 次
              </p>
            )}
            <button
              onClick={handleTryNow}
              disabled={loadingUsage}
              className={`px-8 py-3 bg-gradient-to-r text-white rounded-lg transition-all shadow-md font-semibold text-lg flex items-center justify-center mx-auto ${
                loadingUsage
                  ? 'from-gray-400 to-gray-500 cursor-not-allowed'
                  : 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
              }`}
            >
              <Play className="h-5 w-5 mr-2" />
              {loadingUsage ? '加载中...' : '开始体验'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
