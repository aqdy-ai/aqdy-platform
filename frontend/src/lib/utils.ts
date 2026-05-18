import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export const riskColors = {
  critical: 'bg-orange-950 text-orange-200 border-orange-800', // #7C2D12
  high: 'bg-red-500/10 text-red-500 border-red-500/20', // #EF4444
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20', // #F59E0B
  low: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', // #10B981
  unknown: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

export function getConfidenceMeta(score: number) {
  if (score >= 0.9) return { color: 'bg-emerald-500', text: 'high_confidence' }
  if (score >= 0.7) return { color: 'bg-amber-500', text: 'confident' }
  return { color: 'bg-red-500', text: 'low_confidence' }
}
