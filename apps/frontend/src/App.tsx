import { useState, useEffect } from 'react';
import { Tabs } from './components/Tabs';
import { SubtitleList } from './components/SubtitleList';
import { SubtitleItem, processSubtitles, prepareVectorData } from './utils/subtitleUtils';

function App() {
  const [activeTab, setActiveTab] = useState('subtitles');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubtitles();
  }, []);

  const loadSubtitles = () => {
    chrome.storage.local.get(['subtitleData'], (result) => {
      console.log('从 storage 读取的字幕数据:', result.subtitleData);

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

      console.log('解析后的字幕数组:', subtitleItems);
      setSubtitles(subtitleItems);

      if (subtitleItems.length > 0) {
        const vectorData = prepareVectorData(subtitleItems);
        console.log('准备向量数据:', vectorData);
      }

      setLoading(false);
    });
  };

  const handleRefresh = () => {
    setLoading(true);
    loadSubtitles();
  };

  const handleLoadTestData = () => {
    const testSubtitles: SubtitleItem[] = [
      { from: 0, to: 3000, content: '欢迎来到学习助手', lang: 'zh' },
      { from: 3000, to: 6000, content: '这是一个测试字幕', lang: 'zh' },
      { from: 6000, to: 9000, content: '字幕会显示时间戳和内容', lang: 'zh' },
      { from: 9000, to: 12000, content: '时间戳格式为 MM:SS.mmm', lang: 'zh' },
      { from: 12000, to: 15000, content: '可以用于视频学习辅助', lang: 'zh' },
      { from: 15000, to: 18000, content: '支持后续的AI向量检索', lang: 'zh' },
    ];
    setSubtitles(testSubtitles);
    setLoading(false);
    console.log('加载测试字幕数据:', testSubtitles);
  };

  const processedSubtitles = processSubtitles(subtitles);

  const tabs = [
    {
      id: 'subtitles',
      label: '字幕列表',
      content: (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">字幕 ({subtitles.length} 条)</h2>
            <div className="flex gap-2">
              <button
                onClick={handleLoadTestData}
                className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded transition-colors"
              >
                测试数据
              </button>
              <button
                onClick={handleRefresh}
                className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors"
              >
                刷新
              </button>
            </div>
          </div>
          {loading ? (
            <div className="text-center text-gray-500 py-8">加载中...</div>
          ) : (
            <div className="overflow-y-auto">
              <SubtitleList subtitles={processedSubtitles} />
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'chat',
      label: 'AI 聊天',
      content: (
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">AI 聊天</h2>
          <div className="bg-gray-100 rounded-lg p-6 text-center">
            <p className="text-gray-600 mb-2">AI 聊天功能即将推出</p>
            <p className="text-sm text-gray-500">基于字幕内容进行智能问答</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-w-[300px] h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold text-blue-600">学习助手</h1>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
}

export default App;
