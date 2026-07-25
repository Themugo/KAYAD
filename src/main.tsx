import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DesignThemeProvider } from './theme/DesignThemeProvider';
import App from './App.tsx';
import './index.css';
import './styles/car-detail.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesignThemeProvider>
      <App />
    </DesignThemeProvider>
  </StrictMode>
);
