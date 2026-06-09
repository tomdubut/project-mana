import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white',
        className
      )}
      {...props}
    />
  )
)
Select.displayName = 'Select'
