import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Users, Car, Lock, DollarSign, TrendingUp, Activity, Filter } from 'lucide-react';
import { adminAPI } from '../../api/api';

const cardStyle = {
  background: 'var(--card)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 'var(--radius-lg)',
  padding: '24px',
};

const headerStyle = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#fff',
  marginBottom: '20px',
};

const sectionStyle = {
  marginBottom: '24px',
};

const sectionTitleStyle = {
  fontSize: '14px',
  fontWeight: '700',
  color: 'rgba(255,255,255,0.7)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '12px',
};

const statCardStyle = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.04)',
  borderRadius: '12px',
  padding: '16px',
  textAlign: 'center',
};

const fraudItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.04)',
  marginBottom: '8px',
};

const buttonStyle = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: '600',
  transition: 'all 0.2s',
};

export default function FraudDashboard() {
  const [fraudData, setFraudData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let ignore = false;
    const fetchFraudData = async () => {
      try {
        const data = await adminAPI.fraudAnalytics();
        if (!ignore && data?.analytics) {
          setFraudData(data.analytics);
        }
      } catch (error) {
        console.error('Failed to fetch fraud data:', error);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchFraudData();
    return () => { ignore = true; };
  }, []);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return { color: '#ef4444', background: 'rgba(239,68,68,0.1)' };
      case 'high':
        return { color: '#f97316', background: 'rgba(249,115,22,0.1)' };
      case 'medium':
        return { color: '#eab308', background: 'rgba(234,179,8,0.1)' };
      default:
        return { color: '#3b82f6', background: 'rgba(59,130,246,0.1)' };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'detected':
        return { color: '#f97316', background: 'rgba(249,115,22,0.1)' };
      case 'under_review':
        return { color: '#3b82f6', background: 'rgba(59,130,246,0.1)' };
      case 'confirmed':
        return { color: '#ef4444', background: 'rgba(239,68,68,0.1)' };
      case 'dismissed':
        return { color: '#22c55e', background: 'rgba(34,197,94,0.1)' };
      case 'action_taken':
        return { color: '#8b5cf6', background: 'rgba(139,92,246,0.1)' };
      default:
        return { color: '#6b7280', background: 'rgba(107,114,128,0.1)' };
    }
  };

  const getFraudTypeIcon = (fraudType) => {
    switch (fraudType) {
      case 'multiple_accounts':
      case 'duplicate_phone':
      case 'duplicate_email':
        return <Users size={16} style={{ color: '#3b82f6' }} />;
      case 'self_bidding':
      case 'bid_ring':
      case 'suspicious_bid_spike':
        return <Activity size={16} style={{ color: '#eab308' }} />;
      case 'repeated_disputes':
      case 'chargeback':
        return <Lock size={16} style={{ color: '#ef4444' }} />;
      case 'duplicate_listing':
      case 'vin_reuse':
        return <Car size={16} style={{ color: '#f97316' }} />;
      default:
        return <AlertTriangle size={16} style={{ color: '#6b7280' }} />;
    }
  };

  if (loading) {
    return <div style={cardStyle}>Loading fraud analytics...</div>;
  }

  if (!fraudData) {
    return <div style={cardStyle}>No fraud data available</div>;
  }

  const filteredFraud = filter === 'all' 
    ? fraudData.recentFraud 
    : fraudData.recentFraud.filter(f => f.fraudType === filter);

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <Shield size={20} style={{ marginRight: '8px', display: 'inline', verticalAlign: 'middle' }} />
        Fraud Dashboard
      </div>

      {/* Summary Statistics */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total Detections', value: fraudData.totalDetections, icon: <AlertTriangle size={20} />, color: '#ef4444' },
            { label: 'Critical', value: fraudData.criticalCount, icon: <AlertTriangle size={20} />, color: '#ef4444' },
            { label: 'Under Review', value: fraudData.underReviewCount, icon: <Activity size={20} />, color: '#3b82f6' },
            { label: 'Action Taken', value: fraudData.actionTakenCount, icon: <Shield size={20} />, color: '#8b5cf6' },
          ].map((stat) => (
            <div key={stat.label} style={statCardStyle}>
              <div style={{ color: stat.color, marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Fraud by Type */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Fraud by Type</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {fraudData.byType.map((item) => (
            <div key={item.type} style={statCardStyle}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>{getFraudTypeIcon(item.type)}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>{item.count}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{item.type.replace(/_/g, ' ')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Fraud Detections */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={sectionTitleStyle}>Recent Detections</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '12px',
              }}
            >
              <option value="all">All Types</option>
              <option value="multiple_accounts">Multiple Accounts</option>
              <option value="duplicate_phone">Duplicate Phone</option>
              <option value="duplicate_email">Duplicate Email</option>
              <option value="self_bidding">Self Bidding</option>
              <option value="bid_ring">Bid Ring</option>
              <option value="suspicious_bid_spike">Bid Spike</option>
              <option value="repeated_disputes">Repeated Disputes</option>
              <option value="duplicate_listing">Duplicate Listing</option>
              <option value="vin_reuse">VIN Reuse</option>
            </select>
          </div>
        </div>

        {filteredFraud.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px' }}>
            No fraud detections found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredFraud.map((fraud) => {
              const severityColors = getSeverityColor(fraud.severity);
              const statusColors = getStatusColor(fraud.status);
              
              return (
                <div key={fraud._id} style={fraudItemStyle}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px' }}>
                    {getFraudTypeIcon(fraud.fraudType)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>
                      {fraud.fraudType.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                      Target: {fraud.targetName || 'Unknown'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: severityColors.background,
                        color: severityColors.color,
                        fontWeight: '600',
                      }}>
                        {fraud.severity.toUpperCase()}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: statusColors.background,
                        color: statusColors.color,
                        fontWeight: '600',
                      }}>
                        {fraud.status.replace(/_/g, ' ')}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {new Date(fraud.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {fraud.status === 'detected' && (
                      <button
                        style={{
                          ...buttonStyle,
                          background: 'rgba(59,130,246,0.15)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59,130,246,0.3)',
                        }}
                      >
                        Review
                      </button>
                    )}
                    {fraud.status === 'under_review' && (
                      <button
                        style={{
                          ...buttonStyle,
                          background: 'rgba(239,68,68,0.15)',
                          color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.3)',
                        }}
                      >
                        Take Action
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fraud Trends */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Fraud Trends (Last 30 Days)</div>
        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
            <TrendingUp size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
            {fraudData.trendDirection === 'up' ? 'Increasing' : 'Decreasing'} trend: {fraudData.trendPercentage}%
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            {fraudData.trendDescription}
          </div>
        </div>
      </div>
    </div>
  );
}
