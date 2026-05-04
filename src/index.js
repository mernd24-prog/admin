import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './components/App';
import { BrowserRouter } from "react-router-dom";

import { store } from './Redux/Store'
import { Provider } from 'react-redux'
import 'react-toastify/dist/ReactToastify.css';
import { LoaderProvider } from './context/LoaderContext';
import { Toaster } from 'sonner';
import { KYCProvider } from './context/KycContext';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <LoaderProvider>
          <KYCProvider>
            <App />
          </KYCProvider>
        </LoaderProvider>
      </BrowserRouter>
    </Provider>
    <Toaster position="bottom-center" richColors />
  </React.StrictMode>
);
