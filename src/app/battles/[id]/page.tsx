'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'

export default function BattlePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [battle, setBattle] = useState<any>(null)
  const [userVote, setUserVote] = useState<string | null>(null)
  const [votes, setVotes] = useState<any>({ human: 0, ai: 0, humanPercent: 50, aiPercent: 50 })
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    fetchBattle()
  }, [params.id])

  const fetchBattle = async () => {
    try {
      const response = await fetch(`/api/battles/${params.id}/vote`)
      const data = await response.json()
      setBattle(data.battle)
      setUserVote(data.userVote)
      setVotes(data.votes)
    } catch (error) {
      console.error('Failed to fetch battle:', error)
    }
    setLoading(false)
  }

  const handleVote = async (voteFor: string) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to vote.',
        variant: 'destructive',
      })
      router.push('/login')
      return
    }

    setVoting(true)
    try {
      const response = await fetch(`/api/battles/${params.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteFor }),
      })
      const data = await response.json()

      if (data.error) {
        toast({
          title: 'Vote failed',
          description: data.error,
          variant: 'destructive',
        })
      } else {
        setUserVote(voteFor)
        setVotes(data.votes)
        toast({
          title: 'Vote recorded!',
          description: `You voted for the ${voteFor === 'human' ? 'human' : 'AI'} submission.`,
        })
      }
    } catch (error) {
      toast({
        title: 'Vote failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    }
    setVoting(false)
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-muted-foreground">Loading battle...</p>
        </div>
      </div>
    )
  }

  if (!battle) {
    return (
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Battle not found.</p>
              <Link href="/battles">
                <Button>View All Battles</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const isOwner = user?.id === battle.human_submissions?.user_id

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/battles"
          className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
        >
          ← Back to Battles
        </Link>

        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-2">
            AI Battle
          </Badge>
          <h1 className="text-2xl font-bold">{battle.challenges?.title}</h1>
          <p className="text-muted-foreground">{battle.challenges?.description}</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center">Vote for Your Favorite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="text-center">
                  <Badge variant="secondary" className="mb-2">Human Artist</Badge>
                </div>
                <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
                  {battle.human_submissions?.image_url && (
                    <Image
                      src={battle.human_submissions.image_url}
                      alt="Human submission"
                      fill
                      className="object-contain"
                    />
                  )}
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  by {battle.human_submissions?.profiles?.username || 'Anonymous'}
                </p>
                <Button
                  className="w-full"
                  variant={userVote === 'human' ? 'primary' : 'outline'}
                  disabled={voting || (userVote !== null && userVote !== 'human')}
                  onClick={() => handleVote('human')}
                >
                  {userVote === 'human' ? '✓ Voted' : 'Vote for Human'}
                </Button>
                <div className="text-center">
                  <p className="text-2xl font-bold">{votes.humanPercent}%</p>
                  <p className="text-sm text-muted-foreground">{votes.human} votes</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <Badge variant="outline" className="mb-2">AI Generated</Badge>
                </div>
                <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
                  {battle.ai_images?.image_url && (
                    <Image
                      src={battle.ai_images.image_url}
                      alt="AI generation"
                      fill
                      className="object-contain"
                    />
                  )}
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  by AI (agnes-image-1.2)
                </p>
                <Button
                  className="w-full"
                  variant={userVote === 'ai' ? 'primary' : 'outline'}
                  disabled={voting || (userVote !== null && userVote !== 'ai')}
                  onClick={() => handleVote('ai')}
                >
                  {userVote === 'ai' ? '✓ Voted' : 'Vote for AI'}
                </Button>
                <div className="text-center">
                  <p className="text-2xl font-bold">{votes.aiPercent}%</p>
                  <p className="text-sm text-muted-foreground">{votes.ai} votes</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${votes.humanPercent}%` }}
                />
                <div
                  className="bg-accent h-full transition-all"
                  style={{ width: `${votes.aiPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Human</span>
                <span>AI</span>
              </div>
            </div>

            {isOwner && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  This is your submission. Share the battle link to get more votes!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
