import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './styles/theme.css'   // Active Tailwind v4 + tokens de thème Dark/Solar
import './index.css'
import App from './App.jsx'

// Observabilité front : Sentry n'est activé QUE si un DSN est fourni
// (variable Vercel VITE_SENTRY_DSN). Sans DSN -> aucun init, aucun effet :
// on peut donc déployer sans risque avant d'avoir un compte Sentry.
const dsn = import.meta.env.VITE_SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,          // 10 % des transactions (perf) — ajustable
    // Ne remonte pas les erreurs en dev local
    beforeSend: (event) => (import.meta.env.PROD ? event : null),
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Capture les erreurs de rendu React et affiche un repli propre */}
    <Sentry.ErrorBoundary
      fallback={
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-main)' }}>
          Une erreur est survenue. Rechargez la page.
        </div>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
