import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { username } = await request.json()

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required', code: 'INVALID_USERNAME' }, { status: 400 })
    }

    const trimmed = username.trim()

    // Validate username
    if (trimmed.length < 3 || trimmed.length > 20) {
      return NextResponse.json({ error: 'Username must be 3-20 characters', code: 'INVALID_USERNAME' }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores', code: 'INVALID_USERNAME' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This username is already taken. Please choose a different one.', code: 'USERNAME_TAKEN' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch (error: unknown) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}