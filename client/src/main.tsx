import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initWebProtection } from './utils/securityGuard'

// Initialize site-wide protection against inspect element, right-click, and DevTools shortcuts
initWebProtection()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
