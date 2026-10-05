import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./components/App";
import { BrowserRouter } from "react-router-dom";

import { store } from "./Redux/Store";
import { Provider } from "react-redux";
import { LoaderProvider } from "./context/LoaderContext";
import { Toaster, toast as sonnerToast } from "sonner";
import { KYCProvider } from "./context/KycContext";

const withSingleToast = (method) => (...args) => {
  sonnerToast.dismiss();
  return method(...args);
};

Object.assign(sonnerToast, {
  success: withSingleToast(sonnerToast.success),
  error: withSingleToast(sonnerToast.error),
  info: withSingleToast(sonnerToast.info),
  warning: withSingleToast(sonnerToast.warning),
  message: withSingleToast(sonnerToast.message),
  loading: withSingleToast(sonnerToast.loading),
  promise: (...args) => {
    sonnerToast.dismiss();
    return sonnerToast.promise(...args);
  },
  custom: (...args) => {
    sonnerToast.dismiss();
    return sonnerToast.custom(...args);
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
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
    <Toaster position="bottom-center" richColors duration={3000} />
  </React.StrictMode>
);
