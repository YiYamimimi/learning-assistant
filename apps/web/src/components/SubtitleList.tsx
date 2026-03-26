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
    // In a real implementation, this would communicate with the video player
    console.log('Seek to time:', startTime);
  };

  return (
    <div className=" overflow-y-auto">
      {subtitleData && Array.isArray(subtitleData) ? (
        <div className="space-y-2">
          {subtitleData.map((subtitle: any, index: number) => (
            <div key={index} className="flex items-start p-2 hover:bg-gray-50 rounded">
              <span
                className="text-purple-600 font-medium mr-3 whitespace-nowrap cursor-pointer hover:text-purple-800"
                onClick={() => handleTimeClick(subtitle.from || 0)}
              >
                {formatTime(subtitle.from || 0)}
              </span>
              <span className="flex-1 text-gray-700 text-sm">{subtitle.content || ''}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-gray-500">暂无字幕数据</div>
      )}
    </div>
  );
}
