import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'

type ToastType = 'success' | 'error'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} })

let _id = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++_id
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications système"
        className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white pointer-events-auto
              ${t.type === 'success' ? 'bg-fourmiliance-forest' : 'bg-fourmiliance-rust'}`}
          >
            {t.type === 'success'
              ? <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              : <X className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            }
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
