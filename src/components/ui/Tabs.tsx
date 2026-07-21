import React, { createContext, useContext, useState, useCallback } from 'react';

export interface TabsProps {
  defaultTab?: string;
  children: React.ReactNode;
  onChange?: (tabId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a Tabs component');
  }
  return context;
};

export const Tabs: React.FC<TabsProps> = ({
  defaultTab,
  children,
  onChange,
  className = '',
  style,
}) => {
  const [activeTab, setActiveTabState] = useState(defaultTab || '');

  const setActiveTab = useCallback(
    (id: string) => {
      setActiveTabState(id);
      onChange?.(id);
    },
    [onChange]
  );

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    ...style,
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className} style={containerStyle}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export interface TabListProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const TabList: React.FC<TabListProps> = ({
  children,
  className = '',
  style,
}) => {
  const listStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--space-1)',
    borderBottom: '1px solid var(--color-border)',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    MsOverflowStyle: 'none',
  };

  return (
    <div className={className} role="tablist" style={{ ...listStyle, ...style }}>
      {children}
    </div>
  );
};

export interface TabProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Tab: React.FC<TabProps> = ({
  id,
  children,
  disabled = false,
  icon,
  className = '',
  style,
}) => {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === id;

  const tabStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-4)',
    background: 'none',
    border: 'none',
    borderBottom: `2px solid ${isActive ? 'var(--color-brand)' : 'transparent'}`,
    marginBottom: '-1px',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-body-sm)',
    fontWeight: 500,
    color: isActive ? 'var(--color-brand)' : 'var(--color-text-muted)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all var(--transition-fast)',
    whiteSpace: 'nowrap',
    ...style,
  };

  const handleClick = () => {
    if (!disabled) {
      setActiveTab(id);
    }
  };

  return (
    <button
      className={className}
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      style={tabStyle}
      onClick={handleClick}
      disabled={disabled}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
};

export interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  id,
  children,
  className = '',
  style,
}) => {
  const { activeTab } = useTabs();

  if (activeTab !== id) return null;

  const panelStyle: React.CSSProperties = {
    padding: 'var(--space-6) 0',
    animation: 'fadeIn var(--duration-normal) var(--ease-out)',
  };

  return (
    <div
      className={className}
      role="tabpanel"
      aria-labelledby={id}
      style={{ ...panelStyle, ...style }}
    >
      {children}
    </div>
  );
};
