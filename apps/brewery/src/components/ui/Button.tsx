import { cn } from '@/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variants = {
  primary: 'bg-gradient-copper text-white hover:shadow-lg hover:shadow-copper/40 hover:-translate-y-0.5',
  secondary: 'bg-bg-tertiary text-text-secondary border border-border hover:border-copper hover:text-text-primary',
  ghost: 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200',
          variants[variant],
          sizes[size],
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        disabled={disabled}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'












