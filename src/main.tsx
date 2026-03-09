import React from 'react'
import ReactDOM from 'react-dom/client'
import FootingBBSCalculator from './BeamBBS'
import './style.css'

const rootElement = document.getElementById('root') || document.getElementById('app');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <FootingBBSCalculator />
    </React.StrictMode>,
  )
}


