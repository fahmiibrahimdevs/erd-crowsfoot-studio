import React, { useEffect, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { ToastMessage, subscribeToasts, removeToast } from '../utils/alert';

export const StudioToast: React.FC = () => {
  const [toastList, setToastList] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return subscribeToasts((items) => {
      setToastList([...items]);
    });
  }, []);

  if (toastList.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 pointer-events-none flex flex-col gap-2 max-w-sm w-full select-none"
    >
      {toastList.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isInfo = toast.type === 'info';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto ml-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl text-xs font-medium text-slate-800 dark:text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-150 transition-all hover:border-slate-300 dark:hover:border-slate-700 max-w-[340px]"
          >
            {/* Icon */}
            {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            {isInfo && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
            {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {isError && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}

            {/* Message */}
            <span className="truncate leading-tight flex-1 text-slate-700 dark:text-slate-200">
              {toast.title}
            </span>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-1"
              title="Tutup notifikasi"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
