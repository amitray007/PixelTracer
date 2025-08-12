import { createRoot } from 'react-dom/client';
import { Popup } from './popup';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
} else {
  console.error('PixelTracer: Root container not found');
}