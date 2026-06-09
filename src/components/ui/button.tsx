import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          variant === 'primary' && 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
          variant === 'secondary' && 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-300',
          variant === 'ghost' && 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300',
          variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
          size === 'sm' && 'px-3 py-1.5 text-sm',
          size === 'md' && 'px-4 py-2 text-sm',
          size === 'lg' && 'px-5 py-2.5 text-base',
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
