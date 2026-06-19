import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        {
          'bg-primary text-primary-foreground': variant === 'default',
          'bg-secondary text-secondary-foreground': variant === 'secondary',
          'bg-success text-success-foreground': variant === 'success',
          'bg-accent text-accent-foreground': variant === 'warning',
          'bg-destructive text-destructive-foreground': variant === 'destructive',
          'border border-current bg-transparent': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
