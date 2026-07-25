import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'pills' | 'underline';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;

        if (variant === 'underline') {
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-[#00C9CE] text-[#00C9CE]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-[#0B1628] text-slate-300">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              isActive
                ? 'bg-gradient-to-r from-[#00C9CE] to-[#00E5A0] text-[#1E3063] font-bold shadow-md'
                : 'bg-[#2A3B7A]/50 text-slate-300 hover:bg-[#2A3B7A] hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${isActive ? 'bg-[#1E3063] text-[#00C9CE]' : 'bg-[#0B1628] text-slate-300'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
