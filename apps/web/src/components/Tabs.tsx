import React from 'react';

export interface TabProps {
  id: string;
  label: string;
  children?: React.ReactNode;
}

interface TabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactElement<TabProps>[];
}

export const Tab: React.FC<TabProps> = ({ children }) => {
  return children as React.ReactElement;
};

export const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab, children }) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex -mb-px">
        {children.map((child) => (
          <button
            key={child.props.id}
            onClick={() => setActiveTab(child.props.id)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === child.props.id
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {child.props.label}
          </button>
        ))}
      </nav>
    </div>
  );
};
