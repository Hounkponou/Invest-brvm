import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'   // Active Tailwind v4 + tokens de thème Dark/Solar
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
