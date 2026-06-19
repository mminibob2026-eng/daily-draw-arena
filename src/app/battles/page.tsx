'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'

interface Battle {
  id: string
  human_votes: number
  ai_votes: number
  status: string
  challenges: {
    id: string
    title: string
    description: string
  } | null
  human_submissions: {
    id: string
    image_url: string
    user_id: string
    profiles: {
      id: string
      username: string
      avatar_url: string | null
    } | null
  } | null
  ai_images: {
    id: string
    image_url: string
  } | null
}

export default function BattlesPage() {
  const [battles, setBattles] = useState<Battle[]>([])
  const [loading, setLoading] = useState(true)
  const { user, profile } = useAuth()

  useEffect(() => {
    fetchBattles()
  }, [])

  const fetchBattles = async () => {
    try {
      const response = await fetch('/api/battles?status=voting')
      const data = await response.json()
      setBattles(data.battles || [])
    } catch (error) {
      console.error('Failed to fetch battles:', error)
    }
    setLoading(false)
  }

  const canCreateBattle = profile?.is_premium || profile?.is_dev_account

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">AI Battles</h1>
            <p className="text-muted-foreground mt-1">
              Vote on human vs AI artwork matchups
            </p>
          </div>
          <Badge variant="outline">
            {battles.length} active battles
          </Badge>
        </div>

        {!canCreateBattle && (
          <Card className="mb-8 bg-primary/5 border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">⚔️</div>
                <div>
                  <h3 className="font-bold mb-1">Premium Feature</h3>
                  <p className="text-sm text-muted-foreground">
                    Create your own AI Battle after submitting to a challenge.
                    Generate unique AI artwork and compete for community votes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading battles...</p>
          </div>
        ) : !battles.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-4">🤖</p>
              <p className="text-muted-foreground mb-4">
                No active battles right now.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                {canCreateBattle
                  ? 'Submit to a challenge and start an AI Battle!'
                  : 'Sign up for premium to create AI Battles!'}
              </p>
              <Link href="/challenges">
                <Button>View Challenges</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {battles.map((battle) => {
              const total = (battle.human_votes || 0) + (battle.ai_votes || 0)
              const humanPercent = total > 0 ? Math.round((battle.human_votes / total) * 100) : 50

              return (
                <Card key={battle.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      {battle.challenges?.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 text-center">Human</p>
                        <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
                          {battle.human_submissions?.image_url ? (
                            <Image
                              src={battle.human_submissions.image_url}
                              alt="Human submission"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-2xl">👤</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-center mt-2 truncate">
                          {battle.human_submissions?.profiles?.username || 'Anonymous'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 text-center">AI</p>
                        <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
                          {battle.ai_images?.image_url ? (
                            <Image
                              src={battle.ai_images.image_url}
                              alt="AI generation"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-2xl">🤖</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{ width: `${humanPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-sm">
                        <span>
                          <span className="font-semibold">{battle.human_votes || 0}</span>
                          <span className="text-muted-foreground"> human</span>
                        </span>
                        <span>
                          <span className="font-semibold">{battle.ai_votes || 0}</span>
                          <span className="text-muted-foreground"> ai</span>
                        </span>
                      </div>
                      <Link href={`/battles/${battle.id}`}>
                        <Button size="sm">Vote Now</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
