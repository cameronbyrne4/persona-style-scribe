import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App.tsx'
import './index.css'

// Check if analytics should be enabled
const analyticsEnabled = import.meta.env.VITE_VERCEL_ANALYTICS_ENABLED !== '0'

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    {analyticsEnabled && <Analytics />}
  </>
);
