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

    // Fetch top-level comments only (no parent_comment_id) for the main list
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
      .is('parent_comment_id', null)

    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false })
    } else if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true })
    }
    // For 'liked' we fetch then sort manually with like counts

    const { data: comments, error } = await query.limit(50)

    if (error) {
      console.error('Comments fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    // Fetch like counts from comment_likes table
    const commentIds = comments?.map(c => c.id) || []
    const { data: likes } = await supabase
      .from('comment_likes')
      .select('comment_id, user_id')
      .in('comment_id', commentIds)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch reply counts for each comment
    const { data: replyCounts } = await supabase
      .from('comments')
      .select('parent_comment_id')
      .in('parent_comment_id', commentIds)

    const replyCountMap: Record<string, number> = {}
    replyCounts?.forEach(r => {
      if (r.parent_comment_id) {
        replyCountMap[r.parent_comment_id] = (replyCountMap[r.parent_comment_id] || 0) + 1
      }
    })

    const likeCountMap: Record<string, number> = {}
    const userLikedSet = new Set<string>()
    likes?.forEach(l => {
      likeCountMap[l.comment_id] = (likeCountMap[l.comment_id] || 0) + 1
      if (user && l.user_id === user.id) {
        userLikedSet.add(l.comment_id)
      }
    })

    let commentsWithLikes = comments?.map(comment => ({
      ...comment,
      like_count: likeCountMap[comment.id] || 0,
      user_has_liked: userLikedSet.has(comment.id),
      reply_count: replyCountMap[comment.id] || 0,
    })) || []

    // Sort by likes if requested
    if (sort === 'liked') {
      commentsWithLikes = commentsWithLikes.sort((a, b) => {
        if (b.like_count !== a.like_count) {
          return b.like_count - a.like_count
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }

    return NextResponse.json({ comments: commentsWithLikes })
  } catch (error: unknown) {
    console.error('Comments error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submissionId, content, parentCommentId } = await request.json()

    if (!submissionId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 })
    }

    if (content.trim().length > 2000) {
      return NextResponse.json({ error: 'Comment too long (max 2000 chars)' }, { status: 400 })
    }

    // If parentCommentId is provided, verify it exists
    if (parentCommentId) {
      const { data: parent } = await supabase
        .from('comments')
        .select('id, parent_comment_id')
        .eq('id', parentCommentId)
        .single()

      if (!parent) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }

      // Only allow one level of nesting - don't allow replying to a reply
      if (parent.parent_comment_id) {
        return NextResponse.json({ error: 'Cannot reply to a reply' }, { status: 400 })
      }
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        submission_id: submissionId,
        user_id: user.id,
        content: content.trim(),
        parent_comment_id: parentCommentId || null,
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
  } catch (error: unknown) {
    console.error('Comment error:', error)
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

    // Check ownership before delete
    const { data: comment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single()

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (comment.user_id !== user.id) {
      // Check if user is dev
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_dev_account')
        .eq('id', user.id)
        .single()

      if (!profile?.is_dev_account) {
        return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 })
      }
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      console.error('Comment delete error:', error)
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Comment delete error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { commentId, content } = await request.json()

    if (!commentId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing commentId or content' }, { status: 400 })
    }

    if (content.trim().length > 2000) {
      return NextResponse.json({ error: 'Comment too long (max 2000 chars)' }, { status: 400 })
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .update({ content: content.trim() })
      .eq('id', commentId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Comment update error:', error)
      return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 })
    }

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found or not authorized' }, { status: 404 })
    }

    return NextResponse.json({ comment })
  } catch (error: unknown) {
    console.error('Comment update error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}