import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CHALLENGE_BANK } from '@/lib/challenges'
import type { SupabaseClient } from '@supabase/supabase-js'

async function isDevAccount(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_dev_account')
    .eq('id', userId)
    .single()
  return profile?.is_dev_account === true
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!await isDevAccount(supabase, user.id)) {
      return NextResponse.json({ error: 'Dev account only' }, { status: 403 })
    }

    const { data: challengeBank, error } = await supabase
      .from('challenge_bank')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: usedChallenges } = await supabase
      .from('daily_challenges')
      .select('title, challenge_date')

    const usedTitles = new Set(usedChallenges?.map(c => c.title) || [])

    const challenges = challengeBank.map(c => {
      const usages = usedChallenges?.filter(u => u.title === c.title) || []
      return {
        ...c,
        used: usedTitles.has(c.title),
        lastUsed: usages.length > 0 ? usages[usages.length - 1].challenge_date : null,
        usageCount: usages.length,
      }
    })

    return NextResponse.json({ 
      challenges,
      total: challenges.length,
      used: challenges.filter(c => c.used).length,
      available: challenges.filter(c => !c.used && c.is_enabled).length,
      disabled: challenges.filter(c => !c.is_enabled).length,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!await isDevAccount(supabase, user.id)) {
      return NextResponse.json({ error: 'Dev account only' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'seed') {
      const challengesToInsert = CHALLENGE_BANK.map(c => ({
        title: c.title,
        description: c.description,
        is_enabled: true,
        source: 'original',
        created_by: null,
      }))

      const { error } = await supabase
        .from('challenge_bank')
        .insert(challengesToInsert)

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ message: 'Challenge bank already seeded', seeded: false })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ message: 'Seeded successfully', seeded: true })
    }

    if (action === 'add') {
      const { title, description } = body

      if (!title || !description) {
        return NextResponse.json({ error: 'Title and description required' }, { status: 400 })
      }

      const { data: existing } = await supabase
        .from('challenge_bank')
        .select('id')
        .eq('title', title)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Challenge with this title already exists' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('challenge_bank')
        .insert({
          title,
          description,
          is_enabled: true,
          source: 'custom',
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ challenge: data })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!await isDevAccount(supabase, user.id)) {
      return NextResponse.json({ error: 'Dev account only' }, { status: 403 })
    }

    const body = await request.json()
    const { id, is_enabled } = body

    if (typeof is_enabled !== 'boolean') {
      return NextResponse.json({ error: 'is_enabled required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('challenge_bank')
      .update({ is_enabled })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ challenge: data })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!await isDevAccount(supabase, user.id)) {
      return NextResponse.json({ error: 'Dev account only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const { data: challenge } = await supabase
      .from('challenge_bank')
      .select('source, created_by')
      .eq('id', id)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.source !== 'custom') {
      return NextResponse.json({ error: 'Can only delete custom challenges' }, { status: 403 })
    }

    if (challenge.created_by !== user.id) {
      return NextResponse.json({ error: 'Can only delete your own challenges' }, { status: 403 })
    }

    const { error } = await supabase
      .from('challenge_bank')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
