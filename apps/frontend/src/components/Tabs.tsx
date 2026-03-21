import { ReactNode } from 'react';

interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="w-full">
      <div
        role="tablist"
        className="relative flex items-center bg-gray-100/80 rounded-xl p-1.5 gap-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tab-panel-${tab.id}`}
            className={`
              relative flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-250 ease-out
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
              border-none bg-transparent cursor-pointer appearance-none
              ${
                activeTab === tab.id
                  ? 'text-gray-900 bg-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={`tab-panel-${tabs.find((tab) => tab.id === activeTab)?.id}`}
        role="tabpanel"
        className="mt-4"
      >
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}
