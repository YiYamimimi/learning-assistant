import { ProcessedSubtitle } from '../components/subtitleUtils';

interface SubtitleListProps {
  subtitles: ProcessedSubtitle[];
}

const styles = `
  .subtitle-list {
  margin-top:13px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    height:350px;
  }

  .subtitle-list::-webkit-scrollbar {
    width: 2px;
  }

  .subtitle-list::-webkit-scrollbar-track {
    background: #f3f4f6;
    border-radius: 3px;
  }

  .subtitle-list::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }

  .subtitle-list::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }

  .empty-state {
    text-align: center;
    color: #9ca3af;
    padding: 48px 0;
    font-size: 14px;
  }

  .subtitle-item {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: 16px;
    padding: 7px;
    border-radius: 6px;
    transition: background-color 0.2s ease;
  }

  .subtitle-item:hover {
    background-color: #f9fafb;
  }

  .time-badge {
    font-size: 14px;
    color: #9333ea;
    font-weight: 400;
    white-space: nowrap;
    cursor: pointer;
    transition: color 0.2s ease;
  }

  .time-badge:hover {
    color: #6b21a8;
  }

  .subtitle-content {
    font-size: 14px;
    color: #1f2937;
    flex: 1;
  }
`;

export function SubtitleList({ subtitles }: SubtitleListProps) {
  const handleTimeClick = (startTimeMs: number) => {
    console.log('点击时间戳，跳转到:', startTimeMs);

    try {
      window.postMessage(
        {
          type: 'SEEK_TO_TIME',
          time: startTimeMs,
        },
        '*'
      );
    } catch (error) {
      console.error('发送跳转消息失败:', error);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="subtitle-list">
        {subtitles.length === 0 ? (
          <div className="empty-state">暂无字幕数据</div>
        ) : (
          subtitles.map((subtitle) => (
            <div key={subtitle.id} className="subtitle-item">
              <span
                className="time-badge"
                onClick={() => handleTimeClick(subtitle.duration)}
                title={`跳转到 ${subtitle.startTime}`}
              >
                {subtitle.startTime}
              </span>
              <span className="subtitle-content">{subtitle.content}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
