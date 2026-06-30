import { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error;
  onRetry?: () => void;
  onGoHome?: () => void;
  onGoBack?: () => void;
  showDetails?: boolean;
}

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again or contact support if the problem persists.',
  error,
  onRetry,
  onGoHome,
  onGoBack,
  showDetails = false,
}: ErrorStateProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 28px',
      background: '#050505',
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <AlertTriangle size={40} style={{ color: '#EF4444' }} />
        </div>
        
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 900,
          fontSize: 'clamp(1.8rem,4vw,2.4rem)',
          color: '#fff',
          margin: '0 0 16px',
          letterSpacing: '-0.02em',
        }}>
          {title}
        </h1>
        
        <p style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.7,
          margin: '0 0 32px',
        }}>
          {message}
        </p>

        {showDetails && error && (
          <div style={{
            background: 'rgba(239,68,68,0.05)',
            border: '1px solid rgba(239,68,68,0.1)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            textAlign: 'left',
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#EF4444',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 8,
            }}>
              Error Details
            </div>
            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.4)',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}>
              {error.message}
            </div>
            {error.stack && (
              <details style={{ marginTop: 12 }}>
                <summary style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}>
                  View Stack Trace
                </summary>
                <pre style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.3)',
                  marginTop: 8,
                  overflow: 'auto',
                  maxHeight: 200,
                }}>
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                background: 'var(--gold)',
                color: '#0A1628',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <RefreshCw size={16} /> Try Again
            </button>
          )}
          
          {onGoBack && (
            <button
              onClick={onGoBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                background: 'transparent',
                color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            >
              <ArrowLeft size={16} /> Go Back
            </button>
          )}
          
          {onGoHome && (
            <button
              onClick={onGoHome}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                background: 'transparent',
                color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            >
              <Home size={16} Go to Home />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
