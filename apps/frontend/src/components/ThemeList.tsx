import { VideoTheme, formatThemeTime } from '../services/themeService';

interface ThemeListProps {
  themes: VideoTheme[];
  onThemeClick: (time: number) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function ThemeList({ themes, onThemeClick, isLoading, error }: ThemeListProps) {
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-dots">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
        <div className="loading-text">正在生成主题...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (themes.length === 0) {
    return (
      <div className="empty-container">
        <div className="empty-icon">📝</div>
        <div className="empty-message">暂无主题数据</div>
      </div>
    );
  }

  return (
    <>
      {themes.map((theme, index) => (
        <div
          key={index}
          className="theme-item"
          onClick={() => onThemeClick(theme.startTime)}
          style={{ backgroundColor: getBackgroundColor(index) }}
        >
          <div className="theme-row">
            <div className="theme-color-dot" style={{ backgroundColor: getDotColor(index) }}></div>
            <div className="theme-title-wrapper">
              <div className="theme-title">{theme.title}</div>
              <div className="theme-time-text">{formatThemeTime(theme.startTime)}</div>
            </div>
          </div>
          <div className="theme-description">{theme.description}</div>
        </div>
      ))}
    </>
  );
}

function getDotColor(index: number): string {
  const colors = [
    '#ff9f9f', // 浅粉
    '#9fd9ff', // 浅蓝
    '#d9b3ff', // 浅紫
    '#fff2b3', // 浅黄
    '#b3ffb3', // 浅绿
    '#ffd9b3', // 浅橙
    '#c2b3ff', // 浅紫蓝
  ];
  return colors[index % colors.length];
}

function getBackgroundColor(index: number): string {
  const colors = [
    '#fff2f2', // 更浅粉背景
    '#f2f9ff', // 更浅蓝背景
    '#f9f2ff', // 更浅紫背景
    '#fffdf2', // 更浅黄背景
    '#f2fff9', // 更浅绿背景
    '#fffaf2', // 更浅橙背景
    '#f2f2ff', // 更浅紫蓝背景
  ];
  return colors[index % colors.length];
}
