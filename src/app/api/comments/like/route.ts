import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { commentId } = await request.json()

    if (!commentId) {
      return NextResponse.json({ error: 'Missing commentId' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already liked this comment' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get total like count
    const { count } = await supabase
      .from('comment_likes')
      .select('id', { count: 'exact', head: true })
      .eq('comment_id', commentId)

    return NextResponse.json({ success: true, likeCount: count || 0 })
  } catch (error: unknown) {
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

    const { commentId } = await request.json()

    if (!commentId) {
      return NextResponse.json({ error: 'Missing commentId' }, { status: 400 })
    }

    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get total like count
    const { count } = await supabase
      .from('comment_likes')
      .select('id', { count: 'exact', head: true })
      .eq('comment_id', commentId)

    return NextResponse.json({ success: true, likeCount: count || 0 })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}