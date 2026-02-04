import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // เรียกใช้ CSS ที่เราก๊อปมา
import { BrowserRouter } from 'react-router-dom' // นำเข้าตัวจัดการ Router

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)