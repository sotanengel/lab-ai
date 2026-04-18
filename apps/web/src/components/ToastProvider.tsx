"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ToastKind = "info" | "success" | "error" | "warning";

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  detail?: string;
  duration?: number;
}

interface ToastContextValue {
  show: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((toast: Omit<Toast, "id">) => {
    toastCounter += 1;
    const id = `toast-${toastCounter}-${Date.now()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="通知"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const duration = toast.duration ?? (toast.kind === "error" ? 6_000 : 4_000);
    const timer = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const tone: Record<ToastKind, string> = {
    info: "border-white/20 bg-black/80",
    success: "border-emerald-500/40 bg-emerald-500/10",
    error: "border-red-500/40 bg-red-500/10 text-red-100",
    warning: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  };

  return (
    <div
      className={`pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-lg backdrop-blur ${tone[toast.kind]}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{toast.message}</p>
          {toast.detail && <p className="mt-0.5 text-xs opacity-80">{toast.detail}</p>}
        </div>
        <button
          type="button"
          aria-label="閉じる"
          onClick={() => onDismiss(toast.id)}
          className="text-lg leading-none opacity-60 hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Provide a no-op fallback so components don't crash outside the provider
    // (e.g., during SSR prerender); real toasts only appear in the browser.
    return {
      show: () => "noop",
      dismiss: () => {},
    };
  }
  return ctx;
}
