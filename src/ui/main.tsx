import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

// Outside Figma nothing sets the theme class, `?theme=dark` stands in for it.
if (new URLSearchParams(location.search).get('theme') === 'dark') {
  document.documentElement.classList.add('figma-dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
