import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Mobile app token injection: mobile app opens webapp with tokens in hash
// e.g. https://webapp.com/dashboard#gb_token=xxx&gb_refresh_token=yyy
if (window.location.hash.includes('gb_token=')) {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get('gb_token');
  const refresh = params.get('gb_refresh_token');
  if (token) {
    localStorage.setItem('gb_token', token);
    if (refresh) localStorage.setItem('gb_refresh_token', refresh);
    // Strip tokens from URL so they don't appear in history
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
