import React from 'react';

export interface TimestampButtonProps {
  timestamp: string;
  seconds: number;
  onClick: (seconds: number) => void;
  className?: string;
}

export const TimestampButton: React.FC<TimestampButtonProps> = ({
  timestamp,
  seconds,
  onClick,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('TimestampButton clicked:', timestamp, seconds);
    onClick(seconds);
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex bg-blue-100 rounded-md items-center gap-1 cursor-pointer hover:scale-110 transition-colors px-1.5 py-0.5 ${className}`}
      type="button"
    >
      <span className="text-blue-400 text-xs">▶</span>
      <span className="text-xs">{timestamp}</span>
    </button>
  );
};
