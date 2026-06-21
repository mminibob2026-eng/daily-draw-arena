import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const MYT_TIMEZONE = 'Asia/Kuala_Lumpur'

/**
 * Format a Date as a YYYY-MM-DD string in MYT (UTC+8).
 * Uses Intl/DateTimeFormat so it is independent of the server's local timezone.
 */
export function getChallengeDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MYT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * Convert an ISO date string (YYYY-MM-DD) or Date to a display string.
 */
export function formatDateForDisplay(date: string | Date): string {
  const dateStr = typeof date === 'string'
    ? date
    : getChallengeDate(date)
  const d = new Date(`${dateStr}T00:00:00+08:00`)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * How many days ago a given date is relative to MYT "now".
 */
export function getDaysAgo(date: Date): string {
  const mytNowStr = getChallengeDate(new Date())
  const mytDateStr = getChallengeDate(date)

  const mytNow = new Date(`${mytNowStr}T00:00:00+08:00`)
  const mytDate = new Date(`${mytDateStr}T00:00:00+08:00`)

  const diff = mytNow.getTime() - mytDate.getTime()
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
