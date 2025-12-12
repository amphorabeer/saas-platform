import { cn } from '@/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'bg-bg-card border border-border rounded-2xl overflow-hidden',
        hover && 'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 hover:border-border-light',
        className
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function CardHeader({ children, action, className }: CardHeaderProps) {
  return (
    <div className={cn('px-5 py-4 border-b border-border flex justify-between items-center', className)}>
      {children}
      {action}
    </div>
  )
}

interface CardBodyProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function CardBody({ children, className, noPadding = false }: CardBodyProps) {
  return (
    <div className={cn(noPadding ? '' : 'p-5', className)}>
      {children}
    </div>
  )
}



