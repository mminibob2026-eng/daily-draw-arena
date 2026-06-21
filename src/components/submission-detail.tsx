'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'

interface Evaluation {
  final_score: number
  creativity: number
  storytelling: number
  composition: number
  effort: number
  originality: number
  strengths: string
  weaknesses: string
  improvements: string
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  parent_comment_id: string | null
  like_count: number
  user_has_liked: boolean
  reply_count: number
  profiles: { id: string; username: string; avatar_url: string | null; is_premium?: boolean } | null
}

interface Reply {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { id: string; username: string; avatar_url: string | null } | null
}

export default function SubmissionDetail({
  submission,
}: {
  submission: {
    id: string
    image_url: string
    created_at: string
    user_id: string
    profiles: { username: string; is_premium: boolean } | null
    challenges: { title: string } | null
    evaluations: Evaluation | null
  }
}) {
  const { user, profile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [userLiked, setUserLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  const [sort, setSort] = useState<'newest' | 'liked' | 'oldest'>('newest')

  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [postingReply, setPostingReply] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Replies display
  const [expandedReplies, setExpandedReplies] = useState<Record<string, Reply[]>>({})
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({})

  const evaluation = submission.evaluations

  useEffect(() => {
    fetchComments()
    fetchLikes()
  }, [submission.id, sort])

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments?submissionId=${submission.id}&sort=${sort}`)
      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    }
  }

  const fetchLikes = async () => {
    try {
      const response = await fetch(`/api/likes?submissionId=${submission.id}`)
      const data = await response.json()
      setLikeCount(data.count || 0)
      setUserLiked(data.userLiked || false)
    } catch (error) {
      console.error('Failed to fetch likes:', error)
    }
  }

  const fetchReplies = async (commentId: string) => {
    if (expandedReplies[commentId]) {
      // Already loaded - just toggle off
      setExpandedReplies(prev => {
        const next = { ...prev }
        delete next[commentId]
        return next
      })
      return
    }

    setLoadingReplies(prev => ({ ...prev, [commentId]: true }))
    try {
      const response = await fetch(`/api/comments/replies?commentId=${commentId}`)
      const data = await response.json()
      setExpandedReplies(prev => ({ ...prev, [commentId]: data.replies || [] }))
    } catch (error) {
      console.error('Failed to fetch replies:', error)
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }))
    }
  }

  const handlePostComment = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to comment.' })
      router.push('/login')
      return
    }
    if (!newComment.trim()) return
    setPosting(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, content: newComment }),
      })
      const data = await response.json()
      if (data.error) {
        toast({ title: 'Failed to post', description: data.error, variant: 'destructive' })
      } else {
        setNewComment('')
        fetchComments()
        toast({ title: 'Comment posted!' })
      }
    } catch (error) {
      toast({ title: 'Failed to post comment', variant: 'destructive' })
    }
    setPosting(false)
  }

  const handlePostReply = async (parentCommentId: string) => {
    if (!user) {
      toast({ title: 'Sign in required' })
      router.push('/login')
      return
    }
    if (!replyText.trim()) return
    setPostingReply(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          content: replyText,
          parentCommentId,
        }),
      })
      const data = await response.json()
      if (data.error) {
        toast({ title: 'Failed to post', description: data.error, variant: 'destructive' })
      } else {
        setReplyText('')
        setReplyingTo(null)
        // Refresh replies
        const repliesRes = await fetch(`/api/comments/replies?commentId=${parentCommentId}`)
        const repliesData = await repliesRes.json()
        setExpandedReplies(prev => ({ ...prev, [parentCommentId]: repliesData.replies || [] }))
        fetchComments() // Update reply count
        toast({ title: 'Reply posted!' })
      }
    } catch {
      toast({ title: 'Failed to post reply', variant: 'destructive' })
    }
    setPostingReply(false)
  }

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return
    try {
      const response = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, content: editText }),
      })
      const data = await response.json()
      if (data.error) {
        toast({ title: 'Failed to edit', description: data.error, variant: 'destructive' })
      } else {
        setEditingId(null)
        setEditText('')
        fetchComments()
        toast({ title: 'Comment updated' })
      }
    } catch {
      toast({ title: 'Failed to edit', variant: 'destructive' })
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return
    try {
      const response = await fetch('/api/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      })
      const data = await response.json()
      if (data.error) {
        toast({ title: 'Failed to delete', description: data.error, variant: 'destructive' })
      } else {
        fetchComments()
        toast({ title: 'Comment deleted' })
      }
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' })
    }
  }

  const handleLikeComment = async (comment: Comment) => {
    if (!user) {
      toast({ title: 'Sign in required' })
      router.push('/login')
      return
    }

    try {
      const method = comment.user_has_liked ? 'DELETE' : 'POST'
      const response = await fetch('/api/comments/like', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: comment.id }),
      })
      const data = await response.json()
      if (data.error) {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' })
      } else {
        // Update local state
        setComments(prev => prev.map(c =>
          c.id === comment.id
            ? { ...c, like_count: data.likeCount, user_has_liked: !c.user_has_liked }
            : c
        ))
      }
    } catch {
      toast({ title: 'Failed to like', variant: 'destructive' })
    }
  }

  const handleLike = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to like.' })
      router.push('/login')
      return
    }
    setLiking(true)
    try {
      const method = userLiked ? 'DELETE' : 'POST'
      const response = await fetch('/api/likes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id }),
      })
      const data = await response.json()
      if (!data.error) {
        setUserLiked(!userLiked)
        setLikeCount(data.count)
      }
    } catch (error) {
      console.error('Failed to like:', error)
    }
    setLiking(false)
  }

  // Helper: parse JSON field from evaluation
  const parseJsonField = (field: string | undefined): string[] => {
    if (!field) return []
    try {
      const parsed = JSON.parse(field)
      return Array.isArray(parsed) ? parsed : [String(parsed)]
    } catch {
      return [field]
    }
  }

  const strengths = parseJsonField(evaluation?.strengths)
  const weaknesses = parseJsonField(evaluation?.weaknesses)
  const improvements = parseJsonField(evaluation?.improvements)

  const isOwnComment = (comment: Comment) => user?.id === comment.user_id
  const isDev = profile?.is_dev_account

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="overflow-hidden">
        <div className="aspect-[4/3] relative bg-muted">
          <Image
            src={submission.image_url}
            alt="Submission"
            fill
            className="object-contain"
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-bold">
                  {submission.profiles?.username?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="font-medium">{submission.profiles?.username || 'Anonymous'}</p>
                <p className="text-sm text-muted-foreground">
                  {submission.challenges?.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleLike} disabled={liking}>
                {userLiked ? '❤️' : '🤍'} {likeCount}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {evaluation ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>AI Evaluation</span>
              <Badge className="text-lg px-3 py-1" variant="default">
                {evaluation.final_score?.toFixed(1)}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <ScoreItem label="Creativity" score={evaluation.creativity} weight="25%" />
              <ScoreItem label="Storytelling" score={evaluation.storytelling} weight="20%" />
              <ScoreItem label="Composition" score={evaluation.composition} weight="20%" />
              <ScoreItem label="Effort" score={evaluation.effort} weight="15%" />
              <ScoreItem label="Originality" score={evaluation.originality} weight="20%" />
            </div>

            <div className="border-t pt-6 space-y-4">
              {strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold text-success mb-2">✓ Strengths</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {strengths.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
              {weaknesses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-destructive mb-2">✗ Weaknesses</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {weaknesses.map((w, i) => <li key={i}>• {w}</li>)}
                  </ul>
                </div>
              )}
              {improvements.length > 0 && (
                <div>
                  <h4 className="font-semibold text-primary mb-2">💡 Suggestions</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {improvements.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Evaluation pending...</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Comments ({comments.length})</CardTitle>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'liked' | 'oldest')}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="liked">Most Liked</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
            />
            <Button onClick={handlePostComment} disabled={posting || !newComment.trim()}>
              {posting ? '...' : 'Post'}
            </Button>
          </div>

          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No comments yet.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="space-y-2">
                  <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold">
                        {comment.profiles?.username?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{comment.profiles?.username || 'Anonymous'}</p>
                        {comment.profiles?.is_premium && (
                          <Badge variant="warning" className="text-xs">Premium</Badge>
                        )}
                      </div>
                      {editingId === comment.id ? (
                        <div className="mt-2 space-y-2">
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleEditComment(comment.id)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditText('') }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm mt-1 whitespace-pre-wrap break-words">{comment.content}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <button
                          onClick={() => handleLikeComment(comment)}
                          className={`hover:text-foreground flex items-center gap-1 ${comment.user_has_liked ? 'text-red-500' : ''}`}
                        >
                          {comment.user_has_liked ? '❤️' : '🤍'} {comment.like_count || 0}
                        </button>
                        {user && (
                          <button
                            onClick={() => {
                              setReplyingTo(replyingTo === comment.id ? null : comment.id)
                              setReplyText('')
                            }}
                            className="hover:text-foreground"
                          >
                            Reply
                          </button>
                        )}
                        {(isOwnComment(comment) || isDev) && editingId !== comment.id && (
                          <>
                            {isOwnComment(comment) && (
                              <button
                                onClick={() => {
                                  setEditingId(comment.id)
                                  setEditText(comment.content)
                                }}
                                className="hover:text-foreground"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="hover:text-destructive"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {comment.reply_count > 0 && (
                          <button
                            onClick={() => fetchReplies(comment.id)}
                            className="hover:text-foreground"
                          >
                            {expandedReplies[comment.id] ? 'Hide' : 'View'} {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reply form */}
                  {replyingTo === comment.id && (
                    <div className="ml-11 flex gap-2">
                      <Input
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePostReply(comment.id)}
                      />
                      <Button size="sm" onClick={() => handlePostReply(comment.id)} disabled={postingReply || !replyText.trim()}>
                        {postingReply ? '...' : 'Reply'}
                      </Button>
                    </div>
                  )}

                  {/* Replies */}
                  {expandedReplies[comment.id] && (
                    <div className="ml-11 space-y-2">
                      {loadingReplies[comment.id] ? (
                        <p className="text-xs text-muted-foreground">Loading...</p>
                      ) : (
                        expandedReplies[comment.id].map((reply) => (
                          <div key={reply.id} className="flex gap-2 p-2 bg-muted/30 rounded-lg">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold">
                                {reply.profiles?.username?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-xs">{reply.profiles?.username || 'Anonymous'}</p>
                              <p className="text-sm mt-1">{reply.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ScoreItem({ label, score, weight }: { label: string; score: number; weight: string }) {
  const percentage = (score / 100) * 100
  const color = score >= 80 ? 'bg-success' : score >= 60 ? 'bg-primary' : score >= 40 ? 'bg-accent' : 'bg-destructive'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{score}/100 ({weight})</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}