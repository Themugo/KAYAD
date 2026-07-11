import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Activity, Clock, CheckCircle, AlertCircle, XCircle, DollarSign, Users, Car, ShoppingCart, Eye, Star, Bell, Settings, BarChart3, Zap, Shield, MessageSquare, Send, FileText, Truck, Award, Target, PieChart, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

// ============================================
// ENTERPRISE DESIGN SYSTEM - CORE CONSTANTS
// ============================================

export const EdsColors = {
  gold: '#D4A443',
  goldLight: '#E8C97A',
  goldDark: '#B8922E',
  emerald: '#10B981',
  emeraldDark: '#059669',
  blue: '#3B82F6',
  blueDark: '#2563EB',
  purple: '#8B5CF6',
  orange: '#F59E0B',
  red: '#EF4444',
  cyan: '#06B6D4',
  pink: '#EC4899',
  surface: 'rgba(255,255,255,0.03)',
  surfaceHover: 'rgba(255,255,255,0.06)',
  card: 'rgba(15,15,20,0.8)',
  border: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.4)',
  textDim: 'rgba(255,255,255,0.25)',
};

export const EdsShadows = {
  card: '0 4px 24px rgba(0,0,0,0.4)',
  glow: (color) => `0 0 20px ${color}20`,
  elevated: '0 8px 32px rgba(0,0,0,0.5)',
};

export const EdsRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// ============================================
// CORE ENTERPRISE CARD
// ============================================

export function EnterpriseCard({ 
  children, 
  header, 
  action, 
  icon,
  className = '', 
  variant = 'default',
  padding = 'md',
  glow,
  style = {},
  ...props 
}) {
  const paddingMap = { sm: 16, md: 20, lg: 24, xl: 28 };
  const variantStyles = {
    default: { background: EdsColors.card, border: `1px solid ${EdsColors.border}` },
    elevated: { background: 'rgba(20,20,28,0.95)', border: `1px solid ${EdsColors.border}`, boxShadow: EdsShadows.elevated },
    glass: { background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)`, backdropFilter: 'blur(20px)' },
    accent: { background: `linear-gradient(135deg, ${EdsColors.card} 0%, rgba(212,164,67,0.05) 100%)`, border: `1px solid rgba(212,164,67,0.2)` },
  };

  return (
    <div 
      className={`eds-card ${className}`}
      style={{
        borderRadius: EdsRadius.lg,
        transition: 'all 0.3s ease',
        ...variantStyles[variant],
        ...(glow ? { boxShadow: EdsShadows.glow(glow) } : { boxShadow: EdsShadows.card }),
        padding: paddingMap[padding],
        ...style,
      }}
      {...props}
    >
      {header && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: padding === 'sm' ? 12 : 16,
          paddingBottom: 12,
          borderBottom: `1px solid ${EdsColors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {icon && (
              <div style={{
                width: 32,
                height: 32,
                borderRadius: EdsRadius.sm,
                background: `${EdsColors.gold}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {icon}
              </div>
            )}
            <h3 style={{
              fontSize: 14,
              fontWeight: 700,
              color: EdsColors.text,
              margin: 0,
              letterSpacing: '-0.01em',
            }}>
              {header}
            </h3>
          </div>
          {action && (
            <Link 
              to={action.to || '#'} 
              style={{
                fontSize: 12,
                color: EdsColors.gold,
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {action.label} <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================
// DASHBOARD HEADER
// ============================================

export function DashboardHeader({ 
  badge, 
  badgeColor = EdsColors.gold,
  greeting, 
  name, 
  subtitle, 
  actions,
  date,
  children,
}) {
  return (
    <div style={{
      background: `linear-gradient(180deg, rgba(212,196,168,0.03) 0%, transparent 100%)`,
      borderBottom: `1px solid ${EdsColors.border}`,
      padding: '36px 0 28px',
      marginBottom: 24,
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            {badge && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: EdsRadius.full,
                background: `${badgeColor}12`,
                border: `1px solid ${badgeColor}25`,
                marginBottom: 10,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: badgeColor }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: badgeColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {badge}
                </span>
              </div>
            )}
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontStyle: 'italic',
              fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
              color: EdsColors.text,
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}>
              {greeting}, <span style={{ color: EdsColors.gold }}>{name}</span>
            </h1>
            {(subtitle || date) && (
              <p style={{ color: EdsColors.textMuted, fontSize: 13, marginTop: 6 }}>
                {subtitle}
                {date && <span style={{ marginLeft: subtitle ? 8, opacity: 0.5 }}>·</span>} 
                {date && <span style={{ marginLeft: 8 }}>{date}</span>}
              </p>
            )}
          </div>
          {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================
// ENHANCED KPI CARD
// ============================================

export function EnterpriseKPI({ 
  icon, 
  label, 
  value, 
  sub, 
  trend, 
  trendLabel,
  accent = EdsColors.gold,
  size = 'default',
  sparkline,
  goal,
  className = '',
}) {
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? EdsColors.emerald : trend < 0 ? EdsColors.red : EdsColors.textMuted;
  const progress = goal ? Math.min((value / goal) * 100, 100) : null;

  return (
    <div 
      className={className}
      style={{
        background: EdsColors.card,
        border: `1px solid ${EdsColors.border}`,
        borderRadius: EdsRadius.lg,
        padding: size === 'compact' ? 16 : 20,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${accent}40`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = EdsColors.border;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        right: -20,
        top: -20,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: accent,
        opacity: 0.05,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: EdsRadius.md,
          background: `${accent}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
        }}>
          {icon}
        </div>
        {trend !== undefined && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: EdsRadius.sm,
            background: `${trendColor}12`,
          }}>
            <TrendIcon size={12} style={{ color: trendColor }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: trendColor }}>
              {Math.abs(trend)}%
            </span>
          </div>
        )}
      </div>

      <div style={{
        fontSize: size === 'compact' ? 11 : 10,
        fontWeight: 700,
        color: EdsColors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 6,
      }}>
        {label}
      </div>

      <div style={{
        fontSize: size === 'compact' ? '1.5rem' : '1.8rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontStyle: 'italic',
        color: EdsColors.text,
        lineHeight: 1,
        marginBottom: 4,
      }}>
        {value ?? '—'}
      </div>

      {sub && (
        <div style={{ fontSize: 11, color: EdsColors.textDim }}>
          {sub}
        </div>
      )}

      {trendLabel && (
        <div style={{ fontSize: 10, color: EdsColors.textDim, marginTop: 4 }}>
          {trendLabel}
        </div>
      )}

      {goal && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: EdsColors.textDim,
            marginBottom: 4,
          }}>
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div style={{
            height: 4,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: accent,
              borderRadius: 2,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// STAT CARD - SIMPLER VERSION
// ============================================

export function StatCard({ icon, label, value, change, changeType = 'neutral', color = EdsColors.gold }) {
  const changeColor = changeType === 'positive' ? EdsColors.emerald : changeType === 'negative' ? EdsColors.red : EdsColors.textMuted;
  
  return (
    <div style={{
      background: EdsColors.card,
      border: `1px solid ${EdsColors.border}`,
      borderRadius: EdsRadius.md,
      padding: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: EdsRadius.md,
        background: `${color}12`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: EdsColors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: EdsColors.text }}>
          {value}
        </div>
      </div>
      {change && (
        <div style={{
          padding: '4px 8px',
          borderRadius: EdsRadius.sm,
          background: `${changeColor}12`,
          fontSize: 11,
          fontWeight: 700,
          color: changeColor,
        }}>
          {change}
        </div>
      )}
    </div>
  );
}

// ============================================
// ENHANCED TIMELINE / ACTIVITY FEED
// ============================================

export function EnterpriseTimeline({ items, maxItems, density = 'default', variant = 'default' }) {
  const displayItems = maxItems ? items?.slice(0, maxItems) : items;
  
  if (!displayItems?.length) {
    return (
      <div style={{ textAlign: 'center', padding: 32, color: EdsColors.textDim }}>
        No recent activity
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      gap: density === 'compact' ? 8 : 12,
    }}>
      {displayItems.map((item, i) => (
        <div 
          key={item.id || i} 
          style={{ 
            display: 'flex', 
            gap: 12, 
            padding: density === 'compact' ? '8px 0' : '12px 0',
            borderBottom: i < displayItems.length - 1 ? `1px solid ${EdsColors.border}` : 'none',
            alignItems: 'flex-start',
          }}
        >
          {/* Timeline indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: item.color || EdsColors.gold,
              boxShadow: item.color ? `0 0 8px ${item.color}60` : `0 0 8px ${EdsColors.gold}60`,
            }} />
            {i < displayItems.length - 1 && (
              <div style={{
                width: 2,
                flex: 1,
                minHeight: 24,
                background: EdsColors.border,
                marginTop: 4,
              }} />
            )}
          </div>
          
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: density === 'compact' ? 13 : 14, 
              fontWeight: 600, 
              color: EdsColors.text, 
              marginBottom: 2,
              lineHeight: 1.3,
            }}>
              {item.title}
            </div>
            {item.description && (
              <div style={{ 
                fontSize: density === 'compact' ? 11 : 12, 
                color: EdsColors.textMuted,
                lineHeight: 1.4,
                marginBottom: 4,
              }}>
                {item.description}
              </div>
            )}
            {item.meta && (
              <div style={{ fontSize: 11, color: EdsColors.textDim }}>
                {item.meta}
              </div>
            )}
          </div>
          
          {/* Time */}
          {item.time && (
            <span style={{ 
              fontSize: 10, 
              color: EdsColors.textDim, 
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {item.time}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// NOTIFICATIONS PANEL
// ============================================

export function EnterpriseNotifications({ items, maxItems, onDismiss, onViewAll }) {
  const displayItems = maxItems ? items?.slice(0, maxItems) : items;
  
  return (
    <div>
      {displayItems?.map((item, i) => (
        <div 
          key={item.id || i}
          onClick={item.onClick}
          style={{
            display: 'flex',
            gap: 12,
            padding: 14,
            borderBottom: i < displayItems.length - 1 ? `1px solid ${EdsColors.border}` : 'none',
            cursor: item.onClick ? 'pointer' : 'default',
            background: item.unread ? `${EdsColors.gold}08` : 'transparent',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = item.unread ? `${EdsColors.gold}12` : EdsColors.surfaceHover}
          onMouseLeave={e => e.currentTarget.style.background = item.unread ? `${EdsColors.gold}08` : 'transparent'}
        >
          {/* Icon */}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: EdsRadius.md,
            background: item.color ? `${item.color}15` : `${EdsColors.gold}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: item.color || EdsColors.gold,
            flexShrink: 0,
          }}>
            {item.icon || <Bell size={16} />}
          </div>
          
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: 13, 
              fontWeight: item.unread ? 700 : 500, 
              color: EdsColors.text,
              marginBottom: 2,
            }}>
              {item.title}
            </div>
            <div style={{ fontSize: 12, color: EdsColors.textMuted }}>
              {item.description}
            </div>
          </div>
          
          {/* Right side */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {item.time && (
              <span style={{ fontSize: 10, color: EdsColors.textDim }}>
                {item.time}
              </span>
            )}
            {item.unread && (
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: EdsColors.gold,
              }} />
            )}
            {onDismiss && (
              <button
                onClick={(e) => { e.stopPropagation(); onDismiss(item.id); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: EdsColors.textDim,
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <XCircle size={14} />
              </button>
            )}
          </div>
        </div>
      ))}
      
      {onViewAll && items?.length > maxItems && (
        <div style={{ padding: 12, textAlign: 'center' }}>
          <button
            onClick={onViewAll}
            style={{
              background: 'none',
              border: 'none',
              color: EdsColors.gold,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View all {items.length} notifications
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// TASK SUMMARY GRID
// ============================================

export function EnterpriseTaskSummary({ tasks, columns = 5 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(tasks.length, columns)}, 1fr)`,
      gap: 12,
    }}>
      {tasks.map((task, i) => (
        <div 
          key={i}
          style={{
            textAlign: 'center',
            padding: '16px 8px',
            borderRadius: EdsRadius.md,
            background: `${task.color}0d`,
            border: `1px solid ${task.color}20`,
          }}
        >
          <div style={{
            fontSize: 24,
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            color: task.color,
            lineHeight: 1,
            marginBottom: 6,
          }}>
            {task.count}
          </div>
          <div style={{
            fontSize: 9,
            color: EdsColors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {task.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// QUICK ACTIONS
// ============================================

export function EnterpriseQuickActions({ actions, columns = 4, density = 'default' }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${density === 'compact' ? 180 : 200}px, 1fr))`,
      gap: 10,
    }}>
      {actions.map((action, i) => (
        <Link
          key={action.id || i}
          to={action.to || '#'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: density === 'compact' ? '12px 14px' : '14px 16px',
            borderRadius: EdsRadius.md,
            background: EdsColors.surface,
            border: `1px solid ${EdsColors.border}`,
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = `${EdsColors.gold}40`;
            e.currentTarget.style.background = `${EdsColors.gold}08`;
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = EdsColors.border;
            e.currentTarget.style.background = EdsColors.surface;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: EdsRadius.md,
            background: `${EdsColors.gold}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: EdsColors.gold,
            flexShrink: 0,
          }}>
            {action.icon}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: EdsColors.text }}>
              {action.label}
            </div>
            {action.description && (
              <div style={{ fontSize: 11, color: EdsColors.textMuted, marginTop: 2 }}>
                {action.description}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

// ============================================
// ENTERPRISE CHART
// ============================================

export function EnterpriseChart({ 
  data, 
  label, 
  height = 160, 
  color = EdsColors.gold,
  type = 'bar',
  showGrid = true,
  gradient = true,
  labels,
}) {
  const max = Math.max(...data, 1);
  
  if (type === 'line') {
    return (
      <div>
        <div style={{ height, position: 'relative' }}>
          {showGrid && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ height: 1, background: EdsColors.border }} />
              ))}
            </div>
          )}
          <svg width="100%" height="100%" style={{ position: 'absolute' }}>
            <defs>
              <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Area fill */}
            {gradient && (
              <path
                d={`M 0 ${height} ${data.map((v, i) => `L ${(i / (data.length - 1)) * 100}% ${height - (v / max) * height}`).join(' ')} L 100% ${height} Z`}
                fill={`url(#gradient-${color.replace('#', '')})`}
              />
            )}
            {/* Line */}
            <polyline
              points={data.map((v, i) => `${(i / (data.length - 1)) * 100}%,${height - (v / max) * height}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Dots */}
            {data.map((v, i) => (
              <circle
                key={i}
                cx={`${(i / (data.length - 1)) * 100}%`}
                cy={height - (v / max) * height}
                r="4"
                fill={color}
              />
            ))}
          </svg>
        </div>
        {labels && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: EdsColors.textDim }}>
            {labels.map((l, i) => <span key={i}>{l}</span>)}
          </div>
        )}
        {label && <div style={{ fontSize: 10, color: EdsColors.textDim, textAlign: 'center', marginTop: 8 }}>{label}</div>}
      </div>
    );
  }

  // Bar chart (default)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
        {data.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: '100%',
              height: `${(v / max) * 100}%`,
              background: gradient ? `linear-gradient(180deg, ${color} 0%, ${color}60 100%)` : color,
              borderRadius: '4px 4px 0 0',
              minHeight: 4,
              transition: 'height 0.5s ease',
            }} />
            {v > 0 && (
              <span style={{ fontSize: 9, color: EdsColors.textDim }}>
                {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
              </span>
            )}
          </div>
        ))}
      </div>
      {labels && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: EdsColors.textDim }}>
          {labels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
      {label && <div style={{ fontSize: 10, color: EdsColors.textDim, textAlign: 'center', marginTop: 8 }}>{label}</div>}
    </div>
  );
}

// ============================================
// ENTERPRISE TABLE
// ============================================

export function EnterpriseTable({ columns, rows, emptyMessage = 'No data', onRowClick, striped = false }) {
  if (!rows?.length) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: EdsColors.textDim, fontSize: 13 }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                style={{
                  textAlign: col.align || 'left',
                  fontSize: 10,
                  fontWeight: 700,
                  color: EdsColors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '12px 16px',
                  borderBottom: `1px solid ${EdsColors.border}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              onClick={() => onRowClick?.(row)}
              style={{
                background: striped && ri % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = EdsColors.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = striped && ri % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}
            >
              {columns.map((col, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: '14px 16px',
                    fontSize: 13,
                    borderBottom: `1px solid ${EdsColors.border}`,
                    color: col.color || EdsColors.text,
                    textAlign: col.align || 'left',
                  }}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// STATUS BADGE
// ============================================

export function EnterpriseStatus({ label, color, variant = 'default' }) {
  const variants = {
    default: { background: `${color}15`, color },
    solid: { background: color, color: '#000' },
    outline: { background: 'transparent', border: `1px solid ${color}`, color },
  };

  return (
    <span style={{
      ...variants[variant],
      padding: '3px 10px',
      borderRadius: EdsRadius.full,
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
    }}>
      {label}
    </span>
  );
}

// ============================================
// METRIC ROW
// ============================================

export function EnterpriseMetricRow({ items, columns = 3 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: 12,
    }}>
      {items.map((item, i) => (
        <div 
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderRadius: EdsRadius.md,
            background: EdsColors.surface,
            border: `1px solid ${EdsColors.border}`,
          }}
        >
          {item.icon && (
            <span style={{ fontSize: 18 }}>{item.icon}</span>
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: EdsColors.text }}>
              {item.value}
            </div>
            <div style={{ fontSize: 10, color: EdsColors.textMuted }}>
              {item.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// REVENUE CARD
// ============================================

export function RevenueCard({ total, pending, released, thisMonth, trend, accent = EdsColors.gold }) {
  return (
    <EnterpriseCard 
      header="Revenue Overview" 
      icon={<DollarSign size={16} color={accent} />}
      glow={accent}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: EdsColors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Total Revenue
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: accent }}>
            {total}
          </div>
          {trend !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: trend >= 0 ? EdsColors.emerald : EdsColors.red,
              }}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
              <span style={{ fontSize: 10, color: EdsColors.textDim }}>vs last month</span>
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 10, color: EdsColors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            This Month
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: EdsColors.text }}>
            {thisMonth}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{
          flex: 1,
          padding: '10px 12px',
          borderRadius: EdsRadius.md,
          background: `${EdsColors.orange}12`,
          border: `1px solid ${EdsColors.orange}20`,
        }}>
          <div style={{ fontSize: 9, color: EdsColors.textMuted, textTransform: 'uppercase', marginBottom: 2 }}>Pending</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: EdsColors.orange }}>{pending}</div>
        </div>
        <div style={{
          flex: 1,
          padding: '10px 12px',
          borderRadius: EdsRadius.md,
          background: `${EdsColors.emerald}12`,
          border: `1px solid ${EdsColors.emerald}20`,
        }}>
          <div style={{ fontSize: 9, color: EdsColors.textMuted, textTransform: 'uppercase', marginBottom: 2 }}>Released</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: EdsColors.emerald }}>{released}</div>
        </div>
      </div>
    </EnterpriseCard>
  );
}

// ============================================
// VEHICLE PERFORMANCE WIDGET
// ============================================

export function VehiclePerformance({ vehicles }) {
  return (
    <EnterpriseCard 
      header="Vehicle Performance" 
      icon={<Car size={16} color={EdsColors.blue} />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {vehicles?.slice(0, 5).map((v, i) => (
          <div key={v.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 20, textAlign: 'center', fontSize: 11, fontWeight: 700, color: EdsColors.textMuted }}>
              #{i + 1}
            </div>
            {v.image && (
              <img 
                src={v.image} 
                alt={v.title}
                style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: EdsRadius.sm }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: EdsColors.text, marginBottom: 2 }}>
                {v.title}
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 11, color: EdsColors.textMuted }}>
                <span><Eye size={10} /> {v.views?.toLocaleString() || 0}</span>
                <span><ShoppingCart size={10} /> {v.inquiries || 0}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: EdsColors.gold }}>
                {v.price || v.formattedPrice}
              </div>
              {v.status && (
                <EnterpriseStatus label={v.status} color={v.statusColor || EdsColors.emerald} />
              )}
            </div>
          </div>
        ))}
      </div>
    </EnterpriseCard>
  );
}

// ============================================
// LEAD MANAGEMENT WIDGET
// ============================================

export function LeadManagement({ total, thisMonth, converted, rate, trend }) {
  return (
    <EnterpriseCard 
      header="Lead Management" 
      icon={<Target size={16} color={EdsColors.purple} />}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: EdsRadius.md, background: EdsColors.surface }}>
          <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.text }}>
            {total?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: 10, color: EdsColors.textMuted, marginTop: 4 }}>Total Leads</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: EdsRadius.md, background: EdsColors.surface }}>
          <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.text }}>
            {thisMonth?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: 10, color: EdsColors.textMuted, marginTop: 4 }}>This Month</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: EdsRadius.md, background: EdsColors.surface }}>
          <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.emerald }}>
            {converted?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: 10, color: EdsColors.textMuted, marginTop: 4 }}>Converted</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: EdsRadius.md, background: EdsColors.surface }}>
          <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.gold }}>
            {rate || '0%'}
          </div>
          <div style={{ fontSize: 10, color: EdsColors.textMuted, marginTop: 4 }}>Conversion</div>
        </div>
      </div>
      {trend !== undefined && (
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: trend >= 0 ? EdsColors.emerald : EdsColors.red }}>
          {trend >= 0 ? '+' : ''}{trend}% lead growth this month
        </div>
      )}
    </EnterpriseCard>
  );
}

// ============================================
// INQUIRY MANAGEMENT WIDGET
// ============================================

export function InquiryManagement({ inquiries, status }) {
  return (
    <EnterpriseCard 
      header="Inquiry Management" 
      icon={<MessageSquare size={16} color={EdsColors.cyan} />}
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, padding: 14, borderRadius: EdsRadius.md, background: `${EdsColors.cyan}12`, border: `1px solid ${EdsColors.cyan}20` }}>
          <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.cyan }}>
            {status?.new || 0}
          </div>
          <div style={{ fontSize: 10, color: EdsColors.textMuted, marginTop: 2 }}>New</div>
        </div>
        <div style={{ flex: 1, padding: 14, borderRadius: EdsRadius.md, background: `${EdsColors.blue}12`, border: `1px solid ${EdsColors.blue}20` }}>
          <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.blue }}>
            {status?.responded || 0}
          </div>
          <div style={{ fontSize: 10, color: EdsColors.textMuted, marginTop: 2 }}>Responded</div>
        </div>
        <div style={{ flex: 1, padding: 14, borderRadius: EdsRadius.md, background: `${EdsColors.emerald}12`, border: `1px solid ${EdsColors.emerald}20` }}>
          <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.emerald }}>
            {status?.closed || 0}
          </div>
          <div style={{ fontSize: 10, color: EdsColors.textMuted, marginTop: 2 }}>Closed</div>
        </div>
      </div>
      {inquiries?.length > 0 && (
        <EnterpriseTimeline items={inquiries.slice(0, 4)} density="compact" />
      )}
    </EnterpriseCard>
  );
}

// ============================================
// AUCTION STATISTICS WIDGET
// ============================================

export function AuctionStats({ live, total, active, completed, totalBids, totalValue }) {
  return (
    <EnterpriseCard 
      header="Auction Statistics" 
      icon={<Zap size={16} color={EdsColors.red} />}
      glow={EdsColors.red}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ padding: 16, borderRadius: EdsRadius.md, background: `${EdsColors.red}10`, border: `1px solid ${EdsColors.red}20` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: EdsColors.red, animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: EdsColors.red }}>LIVE NOW</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.text }}>
            {live || 0}
          </div>
        </div>
        <div style={{ padding: 16, borderRadius: EdsRadius.md, background: EdsColors.surface }}>
          <div style={{ fontSize: 10, color: EdsColors.textMuted, marginBottom: 4 }}>Active Auctions</div>
          <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.text }}>
            {active || 0}
          </div>
        </div>
      </div>
      <EnterpriseMetricRow items={[
        { icon: '⚡', value: totalBids?.toLocaleString() || 0, label: 'Total Bids' },
        { icon: '💰', value: totalValue || '—', label: 'Total Value' },
        { icon: '✅', value: completed || 0, label: 'Completed' },
      ]} columns={3} />
    </EnterpriseCard>
  );
}

// ============================================
// INSPECTION STATISTICS WIDGET
// ============================================

export function InspectionStats({ assigned, inProgress, completed, pendingPayment, avgScore }) {
  return (
    <EnterpriseCard 
      header="Inspection Statistics" 
      icon={<ClipboardCheck size={16} color={EdsColors.emerald} />}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Assigned', count: assigned, color: EdsColors.blue },
          { label: 'In Progress', count: inProgress, color: EdsColors.gold },
          { label: 'Completed', count: completed, color: EdsColors.emerald },
          { label: 'Pending Pay', count: pendingPayment, color: EdsColors.orange },
        ].map((stat, i) => (
          <div 
            key={i}
            style={{
              textAlign: 'center',
              padding: 12,
              borderRadius: EdsRadius.md,
              background: `${stat.color}10`,
              border: `1px solid ${stat.color}20`,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-display)', color: stat.color }}>
              {stat.count || 0}
            </div>
            <div style={{ fontSize: 9, color: EdsColors.textMuted, marginTop: 2 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
      {avgScore !== undefined && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          borderRadius: EdsRadius.md,
          background: EdsColors.surface,
        }}>
          <Award size={20} color={EdsColors.gold} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: EdsColors.text }}>
              Average Score: {avgScore}/100
            </div>
            <div style={{ fontSize: 10, color: EdsColors.textMuted }}>
              Based on completed inspections
            </div>
          </div>
        </div>
      )}
    </EnterpriseCard>
  );
}

// ============================================
// TAB NAVIGATION
// ============================================

export function TabNavigation({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex',
      gap: 4,
      marginBottom: 20,
      borderBottom: `1px solid ${EdsColors.border}`,
      paddingBottom: 12,
      overflowX: 'auto',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '8px 16px',
            borderRadius: EdsRadius.md,
            background: active === tab.id ? `${EdsColors.gold}15` : 'transparent',
            border: `1px solid ${active === tab.id ? `${EdsColors.gold}30` : 'transparent'}`,
            color: active === tab.id ? EdsColors.gold : EdsColors.textMuted,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span style={{
              padding: '2px 6px',
              borderRadius: EdsRadius.full,
              background: active === tab.id ? EdsColors.gold : EdsColors.textDim,
              color: active === tab.id ? '#000' : EdsColors.text,
              fontSize: 10,
              fontWeight: 700,
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

export function EnterpriseEmptyState({ icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: EdsColors.surface,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
        color: EdsColors.textDim,
      }}>
        {icon || <Activity size={28} />}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: EdsColors.text, marginBottom: 8 }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: 13, color: EdsColors.textMuted, marginBottom: 20, maxWidth: 320, margin: '0 auto 20px' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

// ============================================
// SECTION LABEL
// ============================================

export function SectionLabel({ children, action }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: EdsColors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {children}
      </div>
      {action}
    </div>
  );
}

// ============================================
// GRID HELPERS
// ============================================

export function GridLayout({ children, columns = 2, gap = 24, className = '' }) {
  return (
    <div 
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
      }}
    >
      {children}
    </div>
  );
}

export function GridAuto({ children, minWidth = 280, gap = 16 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
      gap,
    }}>
      {children}
    </div>
  );
}

// ============================================
// AGENT/CONTACT CARD
// ============================================

export function AgentCard({ agent }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: EdsRadius.md,
      background: EdsColors.surface,
      border: `1px solid ${EdsColors.border}`,
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: `${EdsColors.gold}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 700,
        color: EdsColors.gold,
      }}>
        {agent.name?.charAt(0) || '?'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: EdsColors.text }}>
          {agent.name}
        </div>
        <div style={{ fontSize: 11, color: EdsColors.textMuted }}>
          {agent.role}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Star size={12} color={EdsColors.gold} fill={EdsColors.gold} />
        <span style={{ fontSize: 12, fontWeight: 600, color: EdsColors.text }}>
          {agent.rating || '—'}
        </span>
      </div>
    </div>
  );
}

// ============================================
// TICKET CARD
// ============================================

export function TicketCard({ ticket }) {
  const priorityColors = {
    high: EdsColors.red,
    medium: EdsColors.orange,
    low: EdsColors.textMuted,
  };
  
  const statusColors = {
    open: EdsColors.red,
    pending: EdsColors.orange,
    in_progress: EdsColors.blue,
    solved: EdsColors.emerald,
  };

  return (
    <div 
      style={{
        padding: 16,
        borderRadius: EdsRadius.md,
        background: EdsColors.surface,
        border: `1px solid ${EdsColors.border}`,
        cursor: ticket.onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
      }}
      onClick={ticket.onClick}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${EdsColors.gold}40`;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = EdsColors.border;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize: 11,
          fontWeight: 700,
          color: EdsColors.gold,
        }}>
          {ticket.id}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <EnterpriseStatus 
            label={ticket.priority} 
            color={priorityColors[ticket.priority]} 
            variant="outline"
          />
          <EnterpriseStatus 
            label={ticket.status?.replace('_', ' ')} 
            color={statusColors[ticket.status]} 
          />
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: EdsColors.text, marginBottom: 6 }}>
        {ticket.subject}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: EdsColors.textMuted }}>
        <span>{ticket.customer}</span>
        <span>{ticket.date}</span>
      </div>
      {ticket.agent && (
        <div style={{ marginTop: 8, fontSize: 11, color: EdsColors.textDim }}>
          Assigned to: <span style={{ color: EdsColors.textMuted }}>{ticket.agent}</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// EXPORT ALL COMPONENTS
// ============================================

export default {
  EnterpriseCard,
  DashboardHeader,
  EnterpriseKPI,
  StatCard,
  EnterpriseTimeline,
  EnterpriseNotifications,
  EnterpriseTaskSummary,
  EnterpriseQuickActions,
  EnterpriseChart,
  EnterpriseTable,
  EnterpriseStatus,
  EnterpriseMetricRow,
  RevenueCard,
  VehiclePerformance,
  LeadManagement,
  InquiryManagement,
  AuctionStats,
  InspectionStats,
  TabNavigation,
  EnterpriseEmptyState,
  SectionLabel,
  GridLayout,
  GridAuto,
  AgentCard,
  TicketCard,
  EdsColors,
  EdsShadows,
  EdsRadius,
};
