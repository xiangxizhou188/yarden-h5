import { brandColors } from '../../src/theme/brand.ts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './mobile-fixes.css';
import './photos.css';

for (const [name, value] of Object.entries(brandColors)) {
  document.documentElement.style.setProperty(`--brand-${name}`, value);
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
