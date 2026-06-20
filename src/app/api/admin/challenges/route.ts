import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CHALLENGE_BANK } from '@/lib/challenges'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_dev_account')
      .eq('id', user.id)
      .single()

    if (!profile?.is_dev_account) {
      return NextResponse.json({ error: 'Dev account only' }, { status: 403 })
    }

    const { data: usedChallenges } = await supabase
      .from('daily_challenges')
      .select('title, challenge_date')

    const usedTitles = new Set(usedChallenges?.map(c => c.title) || [])

    const challengeStats = CHALLENGE_BANK.map((c, i) => {
      const usages = usedChallenges?.filter(u => u.title === c.title) || []
      return {
        id: i + 1,
        title: c.title,
        description: c.description,
        used: usedTitles.has(c.title),
        lastUsed: usages.length > 0 ? usages[usages.length - 1].challenge_date : null,
        usageCount: usages.length,
      }
    })

    return NextResponse.json({ 
      challenges: challengeStats,
      total: CHALLENGE_BANK.length,
      used: usedTitles.size,
      available: CHALLENGE_BANK.length - usedTitles.size,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
