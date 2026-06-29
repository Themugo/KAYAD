import { LucideIcon } from 'lucide-react';

interface ActivityItem {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  timestamp: string;
  color?: 'gold' | 'green' | 'blue' | 'red';
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  title?: string;
  maxItems?: number;
}

export default function ActivityFeed({ activities, title = 'Recent Activity', maxItems = 5 }: ActivityFeedProps) {
  const colorStyles = {
    gold: 'text-gold bg-gold/10',
    green: 'text-green-400 bg-green-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    red: 'text-red-400 bg-red-400/10',
  };

  const displayActivities = activities.slice(0, maxItems);

  return (
    <div className="glass-card p-6">
      <h3 className="font-display font-bold text-white text-lg mb-6">{title}</h3>
      
      <div className="space-y-4">
        {displayActivities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${activity.color ? colorStyles[activity.color] : colorStyles.gold}`}>
              <activity.icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm mb-1">{activity.title}</p>
              <p className="text-white/50 text-xs truncate">{activity.description}</p>
            </div>
            <span className="text-white/30 text-xs whitespace-nowrap">{activity.timestamp}</span>
          </div>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-8">
          <p className="text-white/40 text-sm">No recent activity</p>
        </div>
      )}
    </div>
  );
}
