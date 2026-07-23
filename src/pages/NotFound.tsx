import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search, Car } from 'lucide-react';
import SEOHead from '../components/features/common/SEOHead';

export default function NotFound() {
  return (
    <>
      <SEOHead 
        title="Page Not Found - KAYAD"
        description="The page you're looking for doesn't exist"
        noIndex={true}
      />
      
      <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          {/* Illustration */}
          <div className="mb-8">
            <div className="text-[120px] font-serif font-bold text-cream-200 leading-none select-none">
              404
            </div>
            <div className="w-24 h-1 bg-gold-500 mx-auto rounded-full -mt-4" />
          </div>
          
          <h1 className="font-serif text-3xl text-charcoal-900 font-bold mb-4">
            Page Not Found
          </h1>
          
          <p className="font-sans text-warm-500 mb-8 max-w-sm mx-auto">
            The page you're looking for doesn't exist or may have been moved. 
            Let's get you back on track.
          </p>
          
          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-cream-200 p-6 mb-8">
            <h2 className="font-sans text-sm font-semibold text-charcoal-800 mb-4">
              Popular Pages
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-3 bg-cream-50 rounded-xl hover:bg-cream-100 transition-colors text-left"
              >
                <Home className="w-5 h-5 text-gold-600 flex-shrink-0" />
                <div>
                  <p className="font-sans text-sm font-semibold text-charcoal-800">Home</p>
                  <p className="font-sans text-xs text-warm-400">Back to start</p>
                </div>
              </Link>
              
              <Link
                to="/gallery"
                className="flex items-center gap-2 px-4 py-3 bg-cream-50 rounded-xl hover:bg-cream-100 transition-colors text-left"
              >
                <Car className="w-5 h-5 text-gold-600 flex-shrink-0" />
                <div>
                  <p className="font-sans text-sm font-semibold text-charcoal-800">Gallery</p>
                  <p className="font-sans text-xs text-warm-400">Browse vehicles</p>
                </div>
              </Link>
              
              <Link
                to="/auction"
                className="flex items-center gap-2 px-4 py-3 bg-cream-50 rounded-xl hover:bg-cream-100 transition-colors text-left"
              >
                <div className="w-5 h-5 flex items-center justify-center text-gold-600">
                  🏷️
                </div>
                <div>
                  <p className="font-sans text-sm font-semibold text-charcoal-800">Auctions</p>
                  <p className="font-sans text-xs text-warm-400">Live bidding</p>
                </div>
              </Link>
              
              <Link
                to="/search"
                className="flex items-center gap-2 px-4 py-3 bg-cream-50 rounded-xl hover:bg-cream-100 transition-colors text-left"
              >
                <Search className="w-5 h-5 text-gold-600 flex-shrink-0" />
                <div>
                  <p className="font-sans text-sm font-semibold text-charcoal-800">Search</p>
                  <p className="font-sans text-xs text-warm-400">Find vehicles</p>
                </div>
              </Link>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 px-6 py-3 border border-cream-300 text-charcoal-800 rounded-xl font-sans text-sm font-semibold hover:bg-cream-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            
            <Link
              to="/"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gold-500 text-charcoal-900 rounded-xl font-sans text-sm font-semibold hover:bg-gold-600 transition-colors"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
