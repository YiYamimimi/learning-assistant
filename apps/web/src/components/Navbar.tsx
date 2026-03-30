'use client';

interface NavbarProps {
  onBack: () => void;
  onHistory: () => void;
  onLogin: () => void;
}

export default function Navbar({ onBack, onHistory, onLogin }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="  px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-16 w-full">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
              title="返回上传页面"
            >
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors hidden sm:block">
                返回
              </span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onHistory}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
              title="查看历史记录"
            >
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors hidden sm:block">
                历史
              </span>
            </button>

            <button
              onClick={onLogin}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors group"
              title="登录"
            >
              <svg
                className="w-5 h-5 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              <span className="text-sm font-medium hidden sm:block">登录</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
