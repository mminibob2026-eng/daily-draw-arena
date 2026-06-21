'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/auth-context'
import { CHALLENGE_BANK } from '@/lib/challenges'

interface DaySchedule {
  date: string
  dayName: string
  isToday: boolean
  challenges: {
    id: string
    title: string
    description: string
    slot: number
  }[]
}

export default function AdminSchedulePage() {
  const { user, profile } = useAuth()
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [settingChallenge, setSettingChallenge] = useState<string | null>(null)
  const error = null

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch('/api/challenges/generate?days=7')
      const data = await res.json()
      
      if (res.ok) {
        setSchedule(data.schedule)
      }
    } catch {
      // handle error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  async function handleGenerate(date: string) {
    setGenerating(date)
    try {
      const res = await fetch('/api/challenges/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      
      if (res.ok) {
        fetchSchedule()
      }
    } catch {
      // handle error
    } finally {
      setGenerating(null)
    }
  }

  async function handleSetChallenge(date: string, slot: number, title: string) {
    setSettingChallenge(`${date}-${slot}`)
    try {
      const challenge = CHALLENGE_BANK.find(c => c.title === title)
      if (!challenge) return

      const supabase = (window as any).__SUPABASE__
      
      const { error } = await supabase
        .from('daily_challenges')
        .insert({
          title: challenge.title,
          description: challenge.description,
          challenge_date: date,
          slot: slot,
        })

      if (!error) {
        fetchSchedule()
      }
    } catch {
      // handle error
    } finally {
      setSettingChallenge(null)
    }
  }

  if (!user || !profile?.is_dev_account) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive mb-4">Access Denied</p>
              <p className="text-sm text-muted-foreground mb-4">
                This page is only for dev accounts.
              </p>
              <Link href="/">
                <Button>Go Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/challenges" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">
            ← Back to Challenge Bank
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">7-Day Challenge Schedule</h1>
            <Badge variant="secondary">Dev Only</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Auto-generates daily. Manually set challenges or let it random pick unused ones.
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading schedule...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {schedule.map((day) => (
              <Card key={day.date} className={day.isToday ? 'border-primary' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle>
                        {day.isToday ? 'Today' : day.dayName}
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">{day.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!day.challenges.length ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleGenerate(day.date)}
                          disabled={generating === day.date}
                        >
                          {generating === day.date ? 'Generating...' : 'Auto Generate'}
                        </Button>
                      ) : (
                        <Badge variant="success">Scheduled</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {day.challenges.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {day.challenges.map((challenge) => (
                        <div 
                          key={challenge.id} 
                          className="p-3 rounded-lg bg-muted/50 border"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">Slot {challenge.slot}</Badge>
                          </div>
                          <p className="font-medium text-sm">{challenge.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {challenge.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No challenges scheduled. Click &quot;Auto Generate&quot; to create 3 random challenges.</p>
                      <p className="text-xs mt-1">Uses challenges not used in the last 30 days.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Auto Generate:</strong> Picks 3 random challenges that haven&apos;t been used in the last 30 days</li>
              <li>• Challenges are available at midnight MYT (UTC+8)</li>
              <li>• Users see today&apos;s challenges on the Challenges page</li>
              <li>• Once generated for a date, challenges cannot be changed</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}