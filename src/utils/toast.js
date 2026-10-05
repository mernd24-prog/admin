/**
 * Centralized toast utility for the Admin panel.
 * All pages must import from here — never directly from react-toastify or sonner.
 * Internally uses sonner (the Toaster is mounted in main.js).
 */
import { toast as sonnerToast } from "sonner";

const withSingleToast = (method) => (...args) => {
  sonnerToast.dismiss();
  return method(...args);
};

export const toast = {
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
  dismiss: sonnerToast.dismiss,
  custom: (...args) => {
    sonnerToast.dismiss();
    return sonnerToast.custom(...args);
  },
};

export default toast;
