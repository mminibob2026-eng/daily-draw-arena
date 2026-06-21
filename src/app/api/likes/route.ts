import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submissionId } = await request.json()

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })
    }

    // Check if like exists
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingLike) {
      // Already liked - delete (unlike)
      await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id)

      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('submission_id', submissionId)

      return NextResponse.json({ liked: false, count: count || 0 })
    } else {
      // Like it
      const { error } = await supabase
        .from('likes')
        .insert({
          submission_id: submissionId,
          user_id: user.id,
        })

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: 'Already liked' }, { status: 409 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('submission_id', submissionId)

      return NextResponse.json({ liked: true, count: count || 0 })
    }
  } catch (error: unknown) {
    console.error('Like error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submissionId } = await request.json()

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })
    }

    await supabase
      .from('likes')
      .delete()
      .eq('submission_id', submissionId)
      .eq('user_id', user.id)

    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submissionId)

    return NextResponse.json({ liked: false, count: count || 0 })
  } catch (error: unknown) {
    console.error('Unlike error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const submissionId = searchParams.get('submissionId')

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submissionId)

    let userLiked = false
    if (user) {
      const { data: like } = await supabase
        .from('likes')
        .select('id')
        .eq('submission_id', submissionId)
        .eq('user_id', user.id)
        .maybeSingle()
      userLiked = !!like
    }

    return NextResponse.json({ count: count || 0, userLiked })
  } catch (error: unknown) {
    console.error('Like fetch error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
