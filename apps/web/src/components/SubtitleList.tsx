interface SubtitleListProps {
  subtitleData: any;
}

export default function SubtitleList({ subtitleData }: SubtitleListProps) {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimeClick = (startTime: number) => {
    console.log('Seek to time:', startTime);

    const videoElement = document.querySelector('video') as globalThis.HTMLVideoElement;
    if (videoElement) {
      videoElement.currentTime = startTime;
      videoElement.play();
    }
  };

  return (
    <div className=" overflow-y-auto">
      {subtitleData && Array.isArray(subtitleData) && subtitleData.length > 0 ? (
        <div className="space-y-2">
          {subtitleData.map((subtitle: any, index: number) => (
            <div
              key={index}
              className="flex items-start p-2 hover:bg-gray-50 rounded cursor-pointer"
              onClick={() => handleTimeClick(subtitle.from || 0)}
            >
              <span className="text-purple-600 font-medium mr-3 whitespace-nowrap cursor-pointer hover:text-purple-800">
                {formatTime(subtitle.from || 0)}
              </span>
              <span className="flex-1 text-gray-700 text-sm">{subtitle.content || ''}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col h-full items-center justify-center py-12 px-4">
          <div className="text-5xl mb-4 text-blue-200">🎙️</div>
          <div className="text-center">
            <div className="text-gray-600  font-medium text-lg mb-2">字幕识别功能升级中</div>
            <div className="text-gray-500 text-sm">功能正在优化，即将为您带来更精准的字幕体验</div>
            <div className="text-gray-400 text-xs mt-3">敬请期待！</div>
          </div>
        </div>
      )}
    </div>
  );
}
