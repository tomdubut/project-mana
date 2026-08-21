import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
  color?: string
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav className={cn('flex items-center gap-1 text-xs text-gray-400 mb-5', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight size={11} className="flex-shrink-0 text-gray-300" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-gray-700 transition-colors truncate flex items-center gap-1"
              >
                {item.color && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                )}
                {item.label}
              </Link>
            ) : (
              <span className={cn('truncate flex items-center gap-1', isLast ? 'text-gray-700 font-medium' : '')}>
                {item.color && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                )}
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
