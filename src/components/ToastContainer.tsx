import React from 'react';
import { ToastNotification } from '../types';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        let bgClass = 'bg-white text-[#252A34] border-slate-200';
        let icon = <Info className="w-5 h-5 text-[#AD2F3B] shrink-0" />;

        if (toast.type === 'success') {
          bgClass = 'bg-[#252A34] text-white border-[#AD2F3B]/40 shadow-xl shadow-black/20';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
        } else if (toast.type === 'error') {
          bgClass = 'bg-[#7D1416] text-white border-[#AD2F3B]/40 shadow-xl shadow-[#7D1416]/30';
          icon = <AlertCircle className="w-5 h-5 text-white shrink-0" />;
        } else if (toast.type === 'warning') {
          bgClass = 'bg-amber-600 text-white border-amber-700 shadow-xl shadow-amber-600/20';
          icon = <AlertTriangle className="w-5 h-5 text-white shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border ${bgClass} shadow-xl transition-all duration-300 transform translate-y-0`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold font-raleway leading-tight">{toast.title}</h4>
              {toast.message && (
                <p className="text-[11px] sm:text-xs opacity-90 mt-0.5 font-dm line-clamp-3">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-current opacity-70 hover:opacity-100 p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
