'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface LeaderboardEntry {
  id: string
  rank: number
  final_score: number
  profiles: {
    id: string
    username: string
    avatar_url: string | null
    is_premium: boolean
  } | null
  challenges: {
    id: string
    title: string
  } | null
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null)

  useEffect(() => {
    fetchLeaderboard()
  }, [selectedChallenge])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const url = selectedChallenge
        ? `/api/leaderboard?challengeId=${selectedChallenge}`
        : '/api/leaderboard'
      const response = await fetch(url)
      const data = await response.json()
      setLeaderboard(data.leaderboard || [])
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    }
    setLoading(false)
  }

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500 text-yellow-950'
    if (rank === 2) return 'bg-gray-400 text-gray-950'
    if (rank === 3) return 'bg-amber-600 text-amber-50'
    return 'bg-muted text-muted-foreground'
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
  }

  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Today&apos;s Leaderboard</h1>
          <p className="text-muted-foreground">
            Top artists for today&apos;s challenges
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading leaderboard...</p>
          </div>
        ) : !leaderboard.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-4">🎨</p>
              <p className="text-muted-foreground mb-2">
                No submissions ranked yet today.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Be the first to submit and top the leaderboard!
              </p>
              <Link href="/challenges">
                <Button>View Challenges</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <p className="font-bold">{leaderboard[0]?.profiles?.username || 'Anonymous'}</p>
                      <p className="text-sm text-muted-foreground">
                        {getRankEmoji(1)} Rank #1 with {leaderboard[0]?.final_score?.toFixed(1)} points
                      </p>
                    </div>
                  </div>
                  {leaderboard[0]?.profiles?.is_premium && (
                    <Badge variant="warning">Premium</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>Top 10</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {leaderboard.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                        ${getRankStyle(entry.rank)}
                      `}>
                        {getRankEmoji(entry.rank) || entry.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate flex items-center gap-2">
                          {entry.profiles?.username || 'Anonymous'}
                          {entry.profiles?.is_premium && (
                            <Badge variant="warning" className="text-xs">★</Badge>
                          )}
                        </p>
                        {entry.challenges && (
                          <p className="text-sm text-muted-foreground truncate">
                            {entry.challenges.title}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          {entry.final_score?.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {leaderboard.length > 10 && (
              <Card className="mt-4">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    +{leaderboard.length - 10} more artists ranked
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
