'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface Challenge {
  id: number
  title: string
  description: string
  used: boolean
  lastUsed: string | null
  usageCount: number
}

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'used' | 'available'>('all')
  const router = useRouter()

  useEffect(() => {
    fetchChallenges()
  }, [])

  const fetchChallenges = async () => {
    try {
      const response = await fetch('/api/admin/challenges')
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setChallenges(data.challenges)
      }
    } catch (err) {
      setError('Failed to load challenges')
    }
    setLoading(false)
  }

  const filteredChallenges = challenges.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                         c.description.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || 
                         (filter === 'used' && c.used) || 
                         (filter === 'available' && !c.used)
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <p className="text-sm text-muted-foreground mb-4">
                This page is only accessible to dev accounts.
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

  const stats = {
    total: challenges.length,
    used: challenges.filter(c => c.used).length,
    available: challenges.filter(c => !c.used).length,
  }

  return (
    <div className="container py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">
            ← Back to Profile
          </Link>
          <h1 className="text-3xl font-bold mb-2">Challenge Bank</h1>
          <p className="text-muted-foreground">
            Review all 100 approved challenge subjects
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Challenges</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-primary">{stats.used}</p>
              <p className="text-sm text-muted-foreground">Used</p>
            </CardContent>
          </Card>
          <Card className="bg-success/5 border-success/20">
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-success">{stats.available}</p>
              <p className="text-sm text-muted-foreground">Available</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex gap-4 items-center">
              <Input
                placeholder="Search challenges..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All ({stats.total})
                </Button>
                <Button
                  variant={filter === 'used' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('used')}
                >
                  Used ({stats.used})
                </Button>
                <Button
                  variant={filter === 'available' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('available')}
                >
                  Available ({stats.available})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChallenges.map((challenge) => (
            <Card 
              key={challenge.id} 
              className={challenge.used ? 'opacity-75' : 'border-success/30'}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{challenge.title}</CardTitle>
                  {challenge.used ? (
                    <Badge variant="secondary" className="text-xs">Used</Badge>
                  ) : (
                    <Badge variant="success" className="text-xs">Available</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {challenge.description}
                </p>
                {challenge.used && (
                  <div className="text-xs text-muted-foreground">
                    <span>Used {challenge.usageCount}x</span>
                    {challenge.lastUsed && (
                      <span> · Last: {challenge.lastUsed}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredChallenges.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No challenges match your search.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
