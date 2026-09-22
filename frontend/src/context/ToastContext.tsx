import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cx } from '../lib/cx';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  push: (toast: { title: string; description?: string; tone?: ToastTone }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClass: Record<ToastTone, string> = {
  success: 'border-status-acknowledged/30 bg-status-acknowledged-tint text-status-acknowledged',
  error: 'border-status-overdue/30 bg-status-overdue-tint text-status-overdue',
  info: 'border-line bg-surface text-ink',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback<ToastContextValue['push']>(
    ({ title, description, tone = 'info' }) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((current) => [...current.slice(-2), { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(
              'pointer-events-auto w-full max-w-sm animate-fade-rise rounded-card border px-4 py-3 shadow-lift',
              toneClass[toast.tone],
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-[0.82rem] leading-snug opacity-90">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-mr-1 -mt-1 rounded-md px-1.5 py-0.5 text-xs font-semibold opacity-70 transition hover:opacity-100"
                aria-label="Dismiss notification"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast has to be used inside ToastProvider.');
  return context;
}
