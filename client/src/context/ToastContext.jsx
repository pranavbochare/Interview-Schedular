import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const dismiss = (id) => setItems((s) => s.filter((t) => t.id !== id));
  const push = useCallback((type, title, message) => {
    const id = Math.random();
    setItems((s) => [...s, { id, type, title, message }]);
    setTimeout(() => dismiss(id), 5000);
  }, []);
  const toast = {
    success: (t, m) => push('success', t, m),
    error: (t, m) => push('error', t, m),
  };
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={cn('flex gap-3 rounded-lg border bg-card p-4 shadow-lg', t.type === 'error' ? 'border-red-200' : 'border-emerald-200')}>
            {t.type === 'error' ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />}
            <div className="flex-1 text-sm">
              <p className="font-semibold">{t.title}</p>
              {t.message && <p className="mt-0.5 text-muted-foreground">{t.message}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
