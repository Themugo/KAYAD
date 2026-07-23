import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home, Mail, Clock } from 'lucide-react';
import SEOHead from '../components/features/common/SEOHead';

interface ServerErrorProps {
  error?: Error;
  retryUrl?: string;
}

export default function ServerError({ error, retryUrl }: ServerErrorProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    // Small delay to show retrying state
    await new Promise(resolve => setTimeout(resolve, 500));
    window.location.reload();
  };

  return (
    <>
      <SEOHead 
        title="Server Error - KAYAD"
        description="We're experiencing technical difficulties"
        noIndex={true}
      />
      
      <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          {/* Illustration */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <div className="text-[80px] font-serif font-bold text-cream-300 leading-none select-none">
              500
            </div>
          </div>
          
          <h1 className="font-serif text-3xl text-charcoal-900 font-bold mb-4">
            Server Error
          </h1>
          
          <p className="font-sans text-warm-500 mb-6 max-w-sm mx-auto">
            We're experiencing technical difficulties on our end. Our team has been 
            notified and is working to fix the issue.
          </p>

          {/* Error Reference */}
          {error?.message && (
            <div className="bg-cream-50 rounded-xl p-4 mb-6 text-left">
              <p className="font-sans text-xs text-warm-400 font-semibold mb-1">Technical details:</p>
              <p className="font-sans text-xs text-charcoal-600 break-all">
                {error.message}
              </p>
            </div>
          )}
          
          {/* Expected Resolution */}
          <div className="bg-blue-50 rounded-xl p-4 mb-8 text-left">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-sm font-semibold text-blue-800 mb-1">
                  Expected Resolution
                </p>
                <p className="font-sans text-xs text-blue-600">
                  Most issues are resolved within a few minutes. If this persists, 
                  please contact our support team.
                </p>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-charcoal-900 text-white rounded-xl font-sans text-sm font-semibold hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying...' : 'Try Again'}
            </button>
            
            <Link
              to="/"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gold-500 text-charcoal-900 rounded-xl font-sans text-sm font-semibold hover:bg-gold-600 transition-colors"
            >
              <Home className="w-4 h-4" />
              Go to Homepage
            </Link>
          </div>

          {/* Contact Support */}
          <p className="font-sans text-sm text-warm-400 mt-8">
            Need immediate help?{' '}
            <Link to="/support" className="text-gold-600 hover:text-gold-700 font-semibold">
              Contact Support
            </Link>
            {' '}or{' '}
            <a 
              href="mailto:support@kayad.co.ke" 
              className="text-gold-600 hover:text-gold-700 font-semibold inline-flex items-center gap-1"
            >
              <Mail className="w-3 h-3" />
              Email us
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
