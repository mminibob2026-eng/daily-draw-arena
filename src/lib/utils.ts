import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const MYT_OFFSET = 8 * 60 * 60 * 1000

export function getMYTDate(date: Date = new Date()): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000
  return new Date(utc + MYT_OFFSET)
}

export function getChallengeDate(date: Date = new Date()): string {
  return getMYTDate(date).toISOString().split('T')[0]
}

export function formatDateForDisplay(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function getDaysAgo(date: Date): string {
  const now = getMYTDate()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export function calculateFinalScore(scores: {
  creativity: number
  storytelling: number
  composition: number
  effort: number
  originality: number
}): number {
  return Math.round(
    (scores.creativity * 0.25 +
      scores.storytelling * 0.2 +
      scores.composition * 0.2 +
      scores.effort * 0.15 +
      scores.originality * 0.2) *
      100
  ) / 100
}
