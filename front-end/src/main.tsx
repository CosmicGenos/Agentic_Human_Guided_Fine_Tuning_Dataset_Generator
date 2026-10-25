import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are bundled, not fetched from Google at runtime.
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/spectral/400.css';
import '@fontsource/spectral/600.css';
import './index.css';
import App from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
