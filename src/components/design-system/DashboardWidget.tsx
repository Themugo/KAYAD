import { memo, ReactNode } from 'react';
import { MoreVertical, RefreshCw } from 'lucide-react';

export interface DashboardWidgetProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  onRefresh?: () => void;
  onClick?: () => void;
}

const DashboardWidgetComponent = ({
  title,
  subtitle,
  value,
  change,
  changeType = 'neutral',
  icon,
  children,
  actions,
  loading = false,
  onRefresh,
  onClick,
}: DashboardWidgetProps) => {
  const changeColor = {
    increase: 'text-success',
    decrease: 'text-danger',
    neutral: 'text-muted',
  }[changeType];

  const changePrefix = changeType === 'increase' ? '+' : changeType === 'decrease' ? '' : '';

  return (
    <div 
      className={`dashboard-widget ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="dashboard-widget-header">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
              {icon}
            </div>
          )}
          <div>
            <h3 className="dashboard-widget-title">{title}</h3>
            {subtitle && (
              <p className="text-xs text-muted mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              onClick={(e) => { e.stopPropagation(); onRefresh(); }}
              className="p-1.5 rounded-md hover:bg-bg-secondary transition-colors"
              disabled={loading}
            >
              <RefreshCw 
                size={14} 
                className={`text-muted ${loading ? 'animate-spin' : ''}`} 
              />
            </button>
          )}
          {actions && (
            <div className="relative group">
              <button className="p-1.5 rounded-md hover:bg-bg-secondary transition-colors">
                <MoreVertical size={14} className="text-muted" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {value !== undefined && (
        <div className="dashboard-widget-body">
          <div className="dashboard-widget-stat">
            {loading ? (
              <div className="h-10 w-24 bg-bg-secondary rounded animate-pulse mx-auto" />
            ) : (
              <p className="dashboard-widget-stat-value">{value}</p>
            )}
            {change && (
              <p className={`dashboard-widget-stat-label ${changeColor}`}>
                {changePrefix}{change}
              </p>
            )}
          </div>
        </div>
      )}
      
      {children && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
};

// Stat Widget - Simple stat display
export interface StatWidgetProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  onClick?: () => void;
}

export const StatWidget = memo(({
  label,
  value,
  icon,
  trend,
  onClick,
}: StatWidgetProps) => {
  const trendColor = {
    increase: 'text-success',
    decrease: 'text-danger',
    neutral: 'text-muted',
  }[trend?.type || 'neutral'];

  return (
    <div 
      className={`card p-4 ${onClick ? 'cursor-pointer hover:border-brand transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="text-2xl font-bold text-primary mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trendColor}`}>
              {trend.type === 'increase' && '+'}
              {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
});

// Activity Widget - Recent activity list
export interface ActivityItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  type?: 'info' | 'success' | 'warning' | 'danger';
}

export interface ActivityWidgetProps {
  title: string;
  activities: ActivityItem[];
  onItemClick?: (item: ActivityItem) => void;
  maxItems?: number;
}

export const ActivityWidget = memo(({
  title,
  activities,
  onItemClick,
  maxItems = 5,
}: ActivityWidgetProps) => {
  const displayActivities = activities.slice(0, maxItems);

  const typeColors = {
    info: 'bg-info',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  };

  return (
    <div className="dashboard-widget">
      <div className="dashboard-widget-header">
        <h3 className="dashboard-widget-title">{title}</h3>
      </div>
      <div className="divide-y divide-border">
        {displayActivities.map((activity) => (
          <div 
            key={activity.id}
            className={`px-4 py-3 hover:bg-bg-secondary transition-colors ${onItemClick ? 'cursor-pointer' : ''}`}
            onClick={() => onItemClick?.(activity)}
          >
            <div className="flex items-start gap-3">
              {activity.type && (
                <div className={`w-2 h-2 rounded-full mt-1.5 ${typeColors[activity.type]}`} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">{activity.title}</p>
                {activity.description && (
                  <p className="text-xs text-muted mt-0.5 truncate">{activity.description}</p>
                )}
                <p className="text-xs text-muted mt-1">{activity.timestamp}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// Chart Widget - Simple chart container
export interface ChartWidgetProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export const ChartWidget = memo(({
  title,
  subtitle,
  children,
  actions,
}: ChartWidgetProps) => {
  return (
    <div className="dashboard-widget">
      <div className="dashboard-widget-header">
        <div>
          <h3 className="dashboard-widget-title">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-1">{actions}</div>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
});

export const DashboardWidget = memo(DashboardWidgetComponent);

export default DashboardWidget;
