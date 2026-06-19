'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  profiles: {
    username: string
  } | null
}

export default function SubmissionDetail({
  submission,
}: {
  submission: {
    id: string
    image_url: string
    created_at: string
    profiles: { username: string; is_premium: boolean } | null
    challenges: { title: string } | null
    evaluations: Evaluation | null
  }
}) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [userLiked, setUserLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  const [sort, setSort] = useState<'newest' | 'liked'>('newest')

  const evaluation = submission.evaluations

  useEffect(() => {
    fetchComments()
    fetchLikes()
  }, [submission.id])

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

  const handleLike = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to like.' })
      router.push('/login')
      return
    }

    setLiking(true)
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id }),
      })
      const data = await response.json()

      if (!data.error) {
        setUserLiked(data.liked)
        setLikeCount(data.count)
      }
    } catch (error) {
      console.error('Failed to like:', error)
    }
    setLiking(false)
  }

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
              <div>
                <h4 className="font-semibold text-success mb-2">✓ Strengths</h4>
                <p className="text-sm text-muted-foreground">
                  {evaluation.strengths || 'No specific strengths noted.'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-destructive mb-2">✗ Weaknesses</h4>
                <p className="text-sm text-muted-foreground">
                  {evaluation.weaknesses || 'No specific weaknesses noted.'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-primary mb-2">💡 Suggestions</h4>
                <p className="text-sm text-muted-foreground">
                  {evaluation.improvements || 'No suggestions at this time.'}
                </p>
              </div>
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
              onChange={(e) => { setSort(e.target.value as 'newest' | 'liked'); fetchComments(); }}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="newest">Newest</option>
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
                <div key={comment.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold">
                      {comment.profiles?.username?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{comment.profiles?.username || 'Anonymous'}</p>
                    <p className="text-sm mt-1">{comment.content}</p>
                  </div>
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
