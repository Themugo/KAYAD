import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Compass, Gavel, LifeBuoy, Car } from 'lucide-react';
import BrandMark from '../components/BrandMark';

/**
 * Shown for any address KAYAD does not serve. It does not redirect on its own (an unexpected automatic redirect
 * is disorienting and fails accessibility guidance); it offers clear ways back instead and asks search engines not to index it.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  const linkCls = 'inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-[#D7E7E4] bg-white text-sm font-bold text-[#12576D] hover:bg-[#EEF7F5] focus-visible:ring-2 focus-visible:ring-[#176B87]';
  return (
    <main className="min-h-screen bg-[#F6FAF9] grid place-items-center px-4 py-10" data-testid="not-found-page">
      <div className="w-full max-w-md text-center space-y-5">
        <Link to="/" className="inline-flex justify-center" aria-label="KAYAD home"><BrandMark size={40} /></Link>
        <p className="text-6xl font-black tracking-tight text-[#176B87] m-0" aria-hidden="true">404</p>
        <h1 className="text-2xl font-extrabold text-[#0A3340] m-0">Page not found</h1>
        <p className="text-sm text-[#475569] m-0">
          The page you're looking for doesn't exist, was removed, or the link is mistyped. Here is where you can go next.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Link to="/" className={`${linkCls} !bg-[#176B87] !text-white hover:!bg-[#0A3340] sm:col-span-2`}><Compass className="w-4 h-4" aria-hidden="true" />Go Home</Link>
          <Link to="/?nav=marketplace" className={linkCls}><Car className="w-4 h-4" aria-hidden="true" />Browse vehicles</Link>
          <Link to="/?nav=auctions" className={linkCls}><Gavel className="w-4 h-4" aria-hidden="true" />Live auctions</Link>
          <Link to="/?nav=support" className={linkCls}><LifeBuoy className="w-4 h-4" aria-hidden="true" />Get help</Link>
          <button type="button" className={linkCls} onClick={() => navigate(-1)}>Go back</button>
        </div>
      </div>
    </main>
  );
}
