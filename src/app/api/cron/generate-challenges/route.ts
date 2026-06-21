import { NextRequest, NextResponse } from 'next/server'
import { getChallengeDate } from '@/lib/utils'
import { getOrCreateDailyChallenges } from '@/lib/daily-challenges'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret - Vercel cron jobs send this header
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev_secret'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const targetDate = getChallengeDate()
    const challenges = await getOrCreateDailyChallenges(targetDate)

    return NextResponse.json({
      success: true,
      date: targetDate,
      challenges,
      count: challenges.length,
    })
  } catch (error: unknown) {
    console.error('Cron generate error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}