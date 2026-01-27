import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'

window.CRISP_READY_TRIGGER = () => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

// Fallback if SDK already loaded
if (window.$crisp) {
  window.CRISP_READY_TRIGGER()
}
