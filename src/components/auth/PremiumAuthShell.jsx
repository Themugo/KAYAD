import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, CarFront } from 'lucide-react';
import { buildAuthPath, readAuthContext } from '../../utils/authIntent';

/**
 * Shared frame for every authentication and onboarding screen.
 *
 * One task per screen: a focused card, with an optional "what happens next"
 * rail for the longer registration journey. There is deliberately no
 * advertising on these screens - they exist to finish one job.
 *
 * `rail` = { title, steps: [{ title, body }], note }.
 */
export default function PremiumAuthShell({ mode = 'signin', eyebrow, title, description, children, rail, headerAction }) {
  const location = useLocation();
  const isRegister = mode === 'register';
  const ctx = readAuthContext(location);
  const switchTo = headerAction?.to || buildAuthPath(isRegister ? 'login' : 'register', ctx);
  const switchPrompt = headerAction?.prompt ?? (isRegister ? 'Already have an account?' : 'New to KAYAD?');
  const switchLabel = headerAction?.label ?? (isRegister ? 'Sign in' : 'Create account');

  return (
    <main className="kayad-auth-page" id="main-content">
      <header className="kayad-auth-header">
        <Link to="/" className="kayad-auth-brand" aria-label="KAYAD home">
          <span className="kayad-auth-brand-mark"><CarFront size={19} strokeWidth={2.4} aria-hidden="true" /></span>
          <span className="kayad-auth-brand-copy"><strong>KAYAD</strong><small>Kenya’s trusted vehicle marketplace</small></span>
        </Link>
        <div className="kayad-auth-header-action">
          <span>{switchPrompt}</span>
          <Link to={switchTo} className="kayad-auth-header-link">{switchLabel} <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
      </header>

      <section className="kayad-auth-layout" data-wide={rail ? 'true' : 'false'}>
        <div className="kayad-auth-card-wrap">
          <div className="kayad-auth-card">
            <div className="kayad-auth-intro">
              {eyebrow && <div className="kayad-auth-eyebrow">{eyebrow}</div>}
              <h1>{title}</h1>
              {description && <p>{description}</p>}
            </div>
            {children}
          </div>
        </div>

        {rail && (
          <aside className="kayad-auth-rail" aria-label={rail.title}>
            <h2>{rail.title}</h2>
            <ol>
              {rail.steps.map((step) => (
                <li key={step.title}><span><strong>{step.title}</strong>{step.body}</span></li>
              ))}
            </ol>
            {rail.note && <p>{rail.note}</p>}
          </aside>
        )}
      </section>

      <footer className="kayad-auth-footer">
        <span>© {new Date().getFullYear()} KAYAD</span>
        <span><Link to="/?nav=support">Help and support</Link></span>
      </footer>
    </main>
  );
}
