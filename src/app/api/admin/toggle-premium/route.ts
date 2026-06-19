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
      return NextResponse.json({ error: 'Not a dev account' }, { status: 403 })
    }

    const { targetUserId, isPremium } = await request.json()

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_premium: isPremium })
      .eq('id', targetUserId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
