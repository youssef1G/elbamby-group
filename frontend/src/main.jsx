import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LocaleProvider } from '@/context/LocaleContext.jsx';
import { ThemeProvider } from '@/context/ThemeContext.jsx';
import { AuthProvider } from '@/context/AuthContext.jsx';
import { CustomerAuthProvider } from '@/context/CustomerAuthContext.jsx';
import { CartProvider } from '@/context/CartContext.jsx';

import App from './App.jsx';
import './index.css';

// Blocking pre-render direction/lang sync to prevent RTL→LTR flash on reload.
(function syncHtmlDir() {
  try {
    const stored = localStorage.getItem('bg-lang');
    const lng = stored === 'en' ? 'en' : 'ar';
    const docEl = document.documentElement;
    docEl.lang = lng;
    docEl.dir = lng === 'ar' ? 'rtl' : 'ltr';
    const theme = localStorage.getItem('bg-theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      docEl.classList.add('dark');
    }
  } catch { /* localStorage unavailable — keep index.html defaults */ }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <ThemeProvider>
          <AuthProvider>
            <CustomerAuthProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </CustomerAuthProvider>
          </AuthProvider>
        </ThemeProvider>
      </LocaleProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
