import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import DemoModeBanner from '../../components/DemoModeBanner';

describe('DemoModeBanner', () => {
  afterEach(() => { cleanup(); });

  // Demo mode was intentionally removed from the app (see component comment);
  // the banner is now a permanent no-op and should render nothing.
  it('renders nothing now that demo mode has been removed', () => {
    const { container } = render(<DemoModeBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
