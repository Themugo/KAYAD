import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { carsAPI, enableDemoMode } from '../api/api';
import { useToast } from '../context/ToastContext';
import usePageMeta from '../hooks/usePageMeta';
import useMediaQuery from '../hooks/useMediaQuery';
import { WebSiteStructuredData, BreadcrumbStructuredData } from '../components/SeoStructuredData';
import HomeHero from './home/components/HomeHero';
import TrustSection from './home/components/TrustBar';
import FeaturedMarketplace from './home/components/FeaturedMarketplace';

export default function HomePage() {
  usePageMeta('Home', "East Africa's most trusted automotive marketplace. Buy, sell and bid on premium cars in Kenya with secure escrow payments.");
  const { isAuth, user } = useAuth();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchCars = async () => {
      try {
        const data = await carsAPI.list({ page: 1, limit: 20, sort: '-createdAt' });
        if (cancelled) return;
        let all = data.cars || data.data || [];

        if (all.length === 0) {
          enableDemoMode();
          const retry = await carsAPI.list({ page: 1, limit: 20, sort: '-createdAt' });
          if (cancelled) return;
          all = retry.cars || retry.data || [];
        }

        const now = Date.now();
        const nonAuction = all.filter(c => {
          const s = c.auctionStartTime ? new Date(c.auctionStartTime).getTime() : 0;
          const e = c.auctionEnd ? new Date(c.auctionEnd).getTime() : 0;
          const isLive = s > 0 && e > 0 && s <= now && e > now;
          return !isLive && !(s > now);
        });

        setFeatured([...nonAuction.filter(c => c.isPromoted), ...nonAuction.filter(c => !c.isPromoted)].slice(0, 6));
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch vehicles:', err);
          toast('Could not load vehicles. Check your connection.', 'warning');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCars();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <WebSiteStructuredData />
      <BreadcrumbStructuredData items={[{ name: 'Home', url: '/' }]} />
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        {/* 1. Premium Hero */}
        <HomeHero liveCount={0} isAuth={isAuth} user={user} />

        {/* 2. Trust Section */}
        <TrustSection />

        {/* 3. Featured Marketplace */}
        {!loading && <FeaturedMarketplace cars={featured} />}

        {loading && (
          <div className="flex justify-center py-20">
            <div className="spinner" />
          </div>
        )}
      </div>
    </>
  );
}
