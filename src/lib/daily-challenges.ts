import { createAdminClient } from '@/lib/supabase/admin'
import { CHALLENGE_BANK, selectDailyChallenges, type BankChallenge } from '@/lib/challenges'

export interface DailyChallenge {
  id: string
  title: string
  description: string | null
  challenge_date: string
  slot: number
  created_at: string
}

/**
 * Get enabled challenges from the challenge_bank table.
 * Falls back to the static CHALLENGE_BANK if the table is empty.
 */
async function getEnabledBankChallenges(supabase: ReturnType<typeof createAdminClient>): Promise<BankChallenge[]> {
  const { data, error } = await supabase
    .from('challenge_bank')
    .select('id, title, description, is_enabled')
    .eq('is_enabled', true)

  if (error) {
    console.error('Failed to fetch challenge bank:', error)
  }

  if (data && data.length > 0) {
    // The table may contain duplicate titles from repeated seeds; collapse to
    // one entry per title so a day's three slots are always distinct.
    const seen = new Set<string>()
    return data.filter((c) => {
      if (seen.has(c.title)) return false
      seen.add(c.title)
      return true
    })
  }

  return CHALLENGE_BANK.map((c, i) => ({
    id: `static-${i}`,
    title: c.title,
    description: c.description,
    is_enabled: true,
  }))
}

/**
 * Return the titles used as daily challenges in the last `lookbackDays` days.
 */
async function getRecentlyUsedTitles(
  supabase: ReturnType<typeof createAdminClient>,
  lookbackDays: number = 30
): Promise<Set<string>> {
  const since = new Date()
  since.setDate(since.getDate() - lookbackDays)
  const sinceStr = since.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_challenges')
    .select('title')
    .gte('challenge_date', sinceStr)

  if (error) {
    console.error('Failed to fetch recent challenges:', error)
    return new Set()
  }

  return new Set((data || []).map((c) => c.title))
}

/**
 * Idempotently fetch or create the daily challenges for `targetDate`.
 *
 * This is safe to call from any page load / cron job because:
 *  - The selection is deterministic, so concurrent callers always pick the
 *    same three challenges for a given date.
 *  - The unique constraint on (challenge_date, slot) plus upsert means races
 *    cannot create duplicates.
 */
export async function getOrCreateDailyChallenges(targetDate: string): Promise<DailyChallenge[]> {
  const supabase = createAdminClient()

  // 1. Try to read existing challenges for the date.
  const { data: existing, error: selectError } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('challenge_date', targetDate)
    .order('slot')

  if (selectError) {
    throw new Error(`Failed to read daily challenges: ${selectError.message}`)
  }

  if (existing && existing.length >= 3) {
    return existing as DailyChallenge[]
  }

  // 2. Compute deterministic challenges.
  const allEnabled = await getEnabledBankChallenges(supabase)
  const usedTitles = await getRecentlyUsedTitles(supabase, 30)

  let pool = allEnabled.filter((c) => !usedTitles.has(c.title))
  if (pool.length < 3) {
    pool = allEnabled
  }

  const selected = selectDailyChallenges(pool, targetDate, 3)

  if (selected.length < 3) {
    throw new Error(`Not enough challenges in the bank (need 3, got ${selected.length})`)
  }

  // 3. Insert them idempotently (slot is unique per date).
  const toInsert = selected.map((c, i) => ({
    title: c.title,
    description: c.description ?? null,
    challenge_date: targetDate,
    slot: i + 1,
  }))

  const { data: inserted, error: insertError } = await supabase
    .from('daily_challenges')
    .upsert(toInsert, { onConflict: 'challenge_date, slot' })
    .select()
    .order('slot')

  if (insertError) {
    throw new Error(`Failed to insert daily challenges: ${insertError.message}`)
  }

  return (inserted || []) as DailyChallenge[]
}

/**
 * Fetch existing daily challenges for a date without creating them.
 * Returns an empty array if none exist.
 */
export async function getDailyChallenges(targetDate: string): Promise<DailyChallenge[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('challenge_date', targetDate)
    .order('slot')

  if (error) {
    console.error('Failed to fetch daily challenges:', error)
    return []
  }

  return (data || []) as DailyChallenge[]
}
