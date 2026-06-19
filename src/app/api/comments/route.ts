import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const submissionId = searchParams.get('submissionId')
    const sort = searchParams.get('sort') || 'newest'

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })
    }

    let query = supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('submission_id', submissionId)

    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false })
    } else if (sort === 'liked') {
      query = query.order('created_at', { ascending: false })
    }

    const { data: comments, error } = await query.limit(50)

    if (error) {
      console.error('Comments fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    const { data: likes } = await supabase
      .from('likes')
      .select('submission_id, user_id')
      .eq('submission_id', submissionId)

    const commentsWithLikes = comments?.map(comment => ({
      ...comment,
      like_count: likes?.filter(l => l.user_id === comment.user_id).length || 0,
    })) || []

    return NextResponse.json({ comments: commentsWithLikes })
  } catch (error: any) {
    console.error('Comments error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submissionId, content } = await request.json()

    if (!submissionId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 })
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        submission_id: submissionId,
        user_id: user.id,
        content: content.trim(),
      })
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Comment insert error:', error)
      return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 })
    }

    return NextResponse.json({ comment })
  } catch (error: any) {
    console.error('Comment error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
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

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Comment delete error:', error)
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Comment delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
