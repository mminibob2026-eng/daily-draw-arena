'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

let toastListeners: ((toasts: ToastItem[]) => void)[] = []
let toasts: ToastItem[] = []

export function toast({ title, description, variant = 'default' }: Omit<ToastItem, 'id'>) {
  const id = Math.random().toString(36).substring(7)
  toasts = [...toasts, { id, title, description, variant }]
  toastListeners.forEach(listener => listener(toasts))
  
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    toastListeners.forEach(listener => listener(toasts))
  }, 5000)
}

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    toastListeners.push(setCurrentToasts)
    return () => {
      toastListeners = toastListeners.filter(l => l !== setCurrentToasts)
    }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {currentToasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'animate-slide-up p-4 rounded-lg shadow-lg max-w-sm',
            t.variant === 'destructive' ? 'bg-destructive text-destructive-foreground' : 'bg-card border'
          )}
        >
          <p className="font-medium">{t.title}</p>
          {t.description && (
            <p className="text-sm opacity-80 mt-1">{t.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}
