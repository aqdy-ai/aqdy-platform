import React from 'react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
} from '@/components/ui/pagination'
import { PaymentPaginationProps } from '@/types/payment'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export const PaymentPagination: React.FC<PaymentPaginationProps> = ({
  pagination,
  onPageChange,
}) => {
  const { page, totalPages } = pagination

  const { t, i18n } = useTranslation()
  if (totalPages <= 1) return null

  const handlePrevious = () => {
    if (page > 1) onPageChange(page - 1)
  }

  const handleNext = () => {
    if (page < totalPages) onPageChange(page + 1)
  }

  const getVisiblePages = (
    currentPage: number,
    totalPages: number
  ): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | string)[] = []

    pages.push(1)

    if (currentPage > 4) {
      pages.push('...')
    }

    const start = Math.max(2, currentPage - 2)
    const end = Math.min(totalPages - 1, currentPage + 2)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (currentPage < totalPages - 3) {
      pages.push('...')
    }

    pages.push(totalPages)

    return pages
  }

  return (
    <Pagination className="mt-4" dir={i18n.dir()}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={handlePrevious}
            aria-disabled={page === 1}
            text={t('common.previous_page')}
            className={cn(
              page === 1
                ? 'pointer-events-none opacity-50'
                : 'text-primary hover:text-primary/80 cursor-pointer'
            )}
          />
        </PaginationItem>

        {getVisiblePages(page, totalPages).map((item, index) => (
          <PaginationItem key={`${item}-${index}`}>
            {item === '...' ? (
              <span className="text-muted-foreground px-3 py-2">...</span>
            ) : (
              <PaginationLink
                onClick={() => onPageChange(Number(item))}
                isActive={item === page}
                className="hover:border-primary hover:bg-primary hover:text-primary-foreground cursor-pointer"
              >
                {item}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            onClick={handleNext}
            aria-disabled={page === totalPages}
            text={t('common.next_page')}
            className={cn(
              page === totalPages
                ? 'pointer-events-none opacity-50'
                : 'text-primary hover:text-primary/80 cursor-pointer'
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
