import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Loader2,
} from 'lucide-react';
import { normalizeApiError } from '../api/errorUtils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastOptions {
  title?: string;
  duration?: number;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (type: ToastType, message: string, options?: ToastOptions) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
  apiError: (err: any, fallbackTitle?: string) => void;
  removeToast: (id: string) => void;
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    options: ConfirmDialogOptions;
    resolve: ((value: boolean) => void) | null;
    isConfirming: boolean;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    resolve: null,
    isConfirming: false,
  });

  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions) => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const duration = options?.duration ?? 4500;

      const newToast: ToastItem = {
        id,
        type,
        title: options?.title,
        message,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message = '', duration?: number) => {
      // If only title is provided, use title as message if message is empty
      if (!message) {
        showToast('success', title, { duration });
      } else {
        showToast('success', message, { title, duration });
      }
    },
    [showToast]
  );

  const error = useCallback(
    (title: string, message = '', duration?: number) => {
      if (!message) {
        showToast('error', title, { duration });
      } else {
        showToast('error', message, { title, duration });
      }
    },
    [showToast]
  );

  const warning = useCallback(
    (title: string, message = '', duration?: number) => {
      if (!message) {
        showToast('warning', title, { duration });
      } else {
        showToast('warning', message, { title, duration });
      }
    },
    [showToast]
  );

  const info = useCallback(
    (title: string, message = '', duration?: number) => {
      if (!message) {
        showToast('info', title, { duration });
      } else {
        showToast('info', message, { title, duration });
      }
    },
    [showToast]
  );

  const apiError = useCallback(
    (err: any, fallbackTitle = 'Operation Failed') => {
      const { title, message } = normalizeApiError(err, fallbackTitle);
      showToast('error', message, { title });
    },
    [showToast]
  );

  // Modern async confirmation modal
  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmDialog({
        isOpen: true,
        options,
        resolve,
        isConfirming: false,
      });
    });
  }, []);

  const handleConfirmAction = () => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(true);
      confirmResolveRef.current = null;
    }
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCancelAction = () => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(false);
      confirmResolveRef.current = null;
    }
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        success,
        error,
        warning,
        info,
        apiError,
        removeToast,
        confirm,
      }}
    >
      {children}

      {/* Persistent Global Notification Container */}
      <aside
        aria-live="polite"
        aria-label="Notifications"
        className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          let badgeStyles = 'bg-white border-slate-200 text-slate-800 shadow-xl';
          let icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;

          if (toast.type === 'success') {
            badgeStyles = 'bg-white border-emerald-200 text-slate-900 shadow-xl';
            icon = (
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            );
          } else if (toast.type === 'error') {
            badgeStyles = 'bg-white border-rose-200 text-slate-900 shadow-xl';
            icon = (
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertCircle className="w-4 h-4 text-rose-600" />
              </div>
            );
          } else if (toast.type === 'warning') {
            badgeStyles = 'bg-white border-amber-200 text-slate-900 shadow-xl';
            icon = (
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
            );
          } else if (toast.type === 'info') {
            badgeStyles = 'bg-white border-blue-200 text-slate-900 shadow-xl';
            icon = (
              <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-100">
                <Info className="w-4 h-4 text-[#2563EB]" />
              </div>
            );
          }

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto rounded-2xl border p-4 flex items-start gap-3.5 transition-all duration-300 transform translate-y-0 opacity-100 shadow-lg ${badgeStyles}`}
            >
              {icon}
              <div className="flex-1 min-w-0 pr-1">
                {toast.title && (
                  <h4 className="text-xs font-bold text-[#14233B] tracking-tight leading-snug">
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs text-[#475569] mt-0.5 leading-relaxed break-words font-medium">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </aside>

      {/* Accessible Global Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div
          className="fixed inset-0 z-[100000] bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancelAction();
          }}
          tabIndex={-1}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  confirmDialog.options.isDestructive
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : 'bg-[#EAF5EA] text-[#55B957] border border-blue-100'
                }`}
              >
                {confirmDialog.options.isDestructive ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                ) : (
                  <Info className="w-5 h-5 text-[#2563EB]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id="confirm-modal-title"
                  className="text-base font-bold text-[#14233B] tracking-tight leading-snug"
                >
                  {confirmDialog.options.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                  {confirmDialog.options.message}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancelAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {confirmDialog.options.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  confirmDialog.options.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                }`}
              >
                {confirmDialog.isConfirming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{confirmDialog.options.confirmText || 'Confirm'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Aliases for convenience & clean architecture
export const useConfirm = () => {
  const { confirm } = useToast();
  return confirm;
};
