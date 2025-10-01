import toast, { ToastOptions } from 'react-hot-toast';

const DEFAULT_POSITION: ToastOptions['position'] = 'top-right';

export const showSuccessToast = (message: string, duration = 4000) => {
  toast.success(message, {
    duration,
    position: DEFAULT_POSITION,
    style: {
      background: '#10B981',
      color: '#ffffff'
    }
  });
};

export const showErrorToast = (message: string, duration = 5000) => {
  toast.error(message, {
    duration,
    position: DEFAULT_POSITION,
    style: {
      background: '#EF4444',
      color: '#ffffff'
    }
  });
};

export const showInfoToast = (message: string, duration = 3000) => {
  toast(message, {
    duration,
    position: DEFAULT_POSITION,
    icon: 'ℹ️'
  });
};

export const showWarningToast = (message: string, duration = 4000) => {
  toast(message, {
    duration,
    position: DEFAULT_POSITION,
    icon: '⚠️',
    style: {
      background: '#F59E0B',
      color: '#111827'
    }
  });
};
