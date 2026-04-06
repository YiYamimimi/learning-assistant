'use client';

/* global localStorage */
import { useRef, useState, useEffect } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileVideo, Play, CheckCircle } from 'lucide-react';
import {
  calculateFileHash,
  isVideoUploaded,
  saveVideoMetadata,
  updateVideoHistory,
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
  const router = useRouter();

  const checkUsageStatus = async () => {
    try {
      const response = await fetch('/api/record-usage');
      const data = await response.json();
      setUsageCount(data.usageCount || 0);
    } catch (error) {
      console.error('检查使用状态失败:', error);
    } finally {
      setLoadingUsage(false);
      console.log(loadingUsage, 'loadingUsage');
    }
  };
  useEffect(() => {
    (async () => {
      await checkUsageStatus();
    })();
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
        // localStorage.setItem('localVideoUrl', videoUrl);
        const existingMetadata = isVideoUploaded(fileHash);
        if (existingMetadata) {
          console.log('文件已上传过，使用历史记录');
          // await videoStorage.getVideo(fileHash, file);
          // localStorage.setItem('videoHash', fileHash);
          setTimeout(() => {
            router.push(
              `/video?localVideo=${videoUrl}&type='hash'&fileHash=${fileHash}&isExceed=${usageCount >= 2}`
            );
          }, 1500);
          return;
        }
        console.log('新文件，生成字幕和主题');

        let subtitleData: any, themeData: any;

        if (usageCount >= 2) {
          console.log('已达到使用次数限制，不生成字幕和主题');
          subtitleData = null;
          themeData = null;

          setTimeout(() => {
            router.push(
              `/video?localVideo=${videoUrl}&type='temporary&isExceed=${usageCount >= 2}&fileHash=''`
            );
          }, 1500);
        } else {
          // subtitleData = generateSubtitleData(filenameWithoutExt);
          // themeData = generateThemeData();
          subtitleData = [];
          themeData = [];
          console.log('字幕数据:', subtitleData);
          console.log('主题数据:', themeData);

          // 创建完整的视频元数据
          const metadata = {
            filename: file.name,
            size: file.size,
            uploadedAt: Date.now(),
            subtitleData,
            themeData,
            chatMessages: [],
            lastAccessed: Date.now(),
            accessCount: 0,
          };
          //localStorage
          // 保存视频元数据到历史记录
          saveVideoMetadata(fileHash, metadata);
          // 更新视频历史列表
          updateVideoHistory(fileHash, metadata);

          // 设置当前活跃视频
          localStorage.setItem('currentVideoHash', fileHash);

          await videoStorage.saveVideo(fileHash, file);
          try {
            await fetch('/api/record-usage', {
              method: 'POST',
            });
            console.log('用户使用情况已记录');
            setUsageCount((prev) => prev + 1);
          } catch (usageError) {
            console.error('记录用户使用情况失败:', usageError);
          }
          router.push(
            `/video?localVideo=${videoUrl}&fileHash=${fileHash}&type='hash'&&isExceed=${usageCount >= 2}`
          );
        }
      } catch (error) {
        console.error('上传失败:', error);
        setUploadSuccess(false);
      }
    }
  };

  const handleTryNow = () => {
    router.push(`/video?type=example&isExceed=${usageCount >= 2}&fileHash=''`);
  };
  const chooseVideo = () => {
    videoInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI辅助学习助手</h1>
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
                <p className="text-xs text-gray-400">支持mp3、mp4、wav、ogg格式</p>
                <p className="text-xs text-gray-400">音频应该小于 500MB，且时长小于 3 小时</p>
                {/* {!loadingUsage && (
                  <p className="text-xs text-purple-600 m-4">
                    已使用 {usageCount}/{maxUsage} 次
                  </p>
                )} */}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <button
                  onClick={chooseVideo}
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
            <p className="text-sm text-purple-700 mb-2">
              使用示例内容快速体验 AI辅助学习助手 的强大功能
            </p>

            <button
              onClick={handleTryNow}
              disabled={uploadSuccess}
              className={`px-8 py-3 bg-gradient-to-r text-white rounded-lg transition-all shadow-md font-semibold text-lg flex items-center justify-center mx-auto ${
                uploadSuccess
                  ? 'from-gray-400 to-gray-500 cursor-not-allowed'
                  : 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
              }`}
            >
              <Play className="h-5 w-5 mr-2" />
              {uploadSuccess ? '正在上传视频……' : '开始体验'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
