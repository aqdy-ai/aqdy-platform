import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export const riskColors = {
  critical: cn(
    'bg-red-950 text-red-200 border-red-800',
    'dark:bg-red-950/60 dark:text-red-300 dark:border-red-900'
  ),
  high: cn(
    'bg-orange-500/10 text-orange-600 border-orange-500/20',
    'dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30'
  ),
  medium: cn(
    'bg-amber-500/10 text-amber-600 border-amber-500/20',
    'dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
  ),
  low: cn(
    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    'dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
  ),
  unknown: cn(
    'bg-gray-500/10 text-gray-600 border-gray-500/20',
    'dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
  ),
} as const

export function getConfidenceMeta(score: number) {
  if (score >= 0.9) return { color: 'bg-emerald-500', text: 'high_confidence' }
  if (score >= 0.7) return { color: 'bg-amber-500', text: 'confident' }
  return { color: 'bg-red-500', text: 'low_confidence' }
}
