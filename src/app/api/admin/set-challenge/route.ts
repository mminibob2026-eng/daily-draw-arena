import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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

    const { date, slot, title, description } = await request.json()

    if (!date || !slot || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (slot < 1 || slot > 3) {
      return NextResponse.json({ error: 'Slot must be 1, 2, or 3' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('daily_challenges')
      .insert({
        title,
        description,
        challenge_date: date,
        slot,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A challenge already exists for this date and slot' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ challenge: data })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}