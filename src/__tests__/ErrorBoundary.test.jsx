import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

const ThrowError = () => { throw new Error('test error'); };

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <div>Safe Content</div>
        </ErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByText('Safe Content')).toBeInTheDocument();
  });

  it('shows fallback UI on error', () => {
    const orig = console.error;
    console.error = () => {};
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Go Home')).toBeInTheDocument();
    console.error = orig;
  });
});
