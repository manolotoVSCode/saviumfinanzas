import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

// Service worker de la PWA: cachea el cascarón de la app y se actualiza solo
// con cada despliegue (el plugin no lo activa en desarrollo).
registerSW({ immediate: true })

createRoot(document.getElementById("root")!).render(<App />);
