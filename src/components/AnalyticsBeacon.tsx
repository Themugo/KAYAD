import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { trackPageView, trackLoginHeartbeat, startHeartbeat } from '../services/analyticsTracker';

/** Renders nothing. Records one page view per navigation, upgrades the guest session on sign-in, and keeps live activity honest. */
export default function AnalyticsBeacon() {
  const location = useLocation();
  const { isAuth } = useAuth();
  const pathRef = useRef(location.pathname);
  const wasAuth = useRef(false);
  pathRef.current = `${location.pathname}`;

  useEffect(() => { trackPageView(location.pathname, location.search, typeof document !== 'undefined' && !prevInternal() ? document.referrer : ''); }, [location.pathname, location.search]);
  useEffect(() => { if (isAuth && !wasAuth.current) trackLoginHeartbeat(pathRef.current); wasAuth.current = !!isAuth; }, [isAuth]);
  useEffect(() => startHeartbeat(() => pathRef.current), []);
  return null;
}
let navigated = false;
function prevInternal() { const was = navigated; navigated = true; return was; } // the document referrer is only meaningful for the landing page
