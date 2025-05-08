"use client"

import { useState, useEffect, useRef, createContext, useContext } from "react"
import { X } from "lucide-react"
import { cn } from "@/app/lib/utils"

interface ToastProps {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  variant?: "default" | "destructive"
  duration?: number
  onClose: () => void
}

const Toast = ({
  id,
  title,
  description,
  action,
  variant = "default",
  onClose,
}: ToastProps) => {
  return (
    <div
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all",
        variant === "destructive"
          ? "border-red-200 bg-red-50 text-red-600"
          : "border-slate-200 bg-white text-slate-600"
      )}
    >
      <div className="flex flex-col gap-1">
        {title && <div className="font-medium">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
      {action}
      <button
        onClick={onClose}
        className={cn(
          "absolute right-1 top-1 rounded-full p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
          variant === "destructive" ? "text-red-300 hover:text-red-500" : "text-slate-400 hover:text-slate-500"
        )}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </button>
    </div>
  )
}

interface ToastContextType {
  toasts: ToastProps[]
  toast: (props: Omit<ToastProps, "id" | "onClose">) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([])
  const toastTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const dismiss = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
    if (toastTimeoutsRef.current.has(id)) {
      clearTimeout(toastTimeoutsRef.current.get(id))
      toastTimeoutsRef.current.delete(id)
    }
  }

  const toast = (props: Omit<ToastProps, "id" | "onClose">) => {
    const id = Math.random().toString(36).substring(2, 9)
    const duration = props.duration || 5000

    const newToast: ToastProps = {
      ...props,
      id,
      onClose: () => dismiss(id),
    }

    setToasts((prevToasts) => [...prevToasts, newToast])

    const timeout = setTimeout(() => {
      dismiss(id)
    }, duration)

    toastTimeoutsRef.current.set(id, timeout)
  }

  // Limpar timeouts quando o componente desmontar
  useEffect(() => {
    return () => {
      toastTimeoutsRef.current.forEach((timeout) => {
        clearTimeout(timeout)
      })
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
        {toasts.map((toast) => (
          <div key={toast.id} className="mb-2 transition-all">
            <Toast {...toast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export const toast = (props: Omit<ToastProps, "id" | "onClose">) => {
  // Fallback para quando usado fora do cliente
  if (typeof window === "undefined") return

  // Para uso direto, emite um evento customizado que será capturado pelo provider
  const event = new CustomEvent("toast", { detail: props })
  window.dispatchEvent(event)
} 