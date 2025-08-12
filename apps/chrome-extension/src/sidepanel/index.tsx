import { createRoot } from 'react-dom/client';
import { SidepanelApp } from './SidepanelApp';
import '../styles/globals.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<SidepanelApp />);
} else {
  console.error('PixelTracer: Root container not found');
}