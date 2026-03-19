import { ProcessedSubtitle } from '../utils/subtitleUtils';

interface SubtitleListProps {
  subtitles: ProcessedSubtitle[];
}

export function SubtitleList({ subtitles }: SubtitleListProps) {
  return (
    <div className="space-y-3">
      {subtitles.length === 0 ? (
        <div className="text-center text-gray-500 py-8">暂无字幕数据</div>
      ) : (
        subtitles.map((subtitle) => (
          <div
            key={subtitle.id}
            className="flex items-start gap-4 p-2 hover:bg-gray-50 rounded transition-colors"
          >
            <span className="text-sm font-mono text-purple-600 font-semibold whitespace-nowrap">
              {subtitle.startTime}
            </span>
            <p className="text-sm text-gray-800 leading-relaxed flex-1">{subtitle.content}</p>
          </div>
        ))
      )}
    </div>
  );
}
