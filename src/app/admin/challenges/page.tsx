'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'

interface Challenge {
  id: string
  title: string
  description: string
  is_enabled: boolean
  source: string
  created_by: string | null
  used: boolean
  lastUsed: string | null
  usageCount: number
}

export default function AdminChallengesPage() {
  const { user, profile } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, used: 0, available: 0, disabled: 0 })
  const [showAddForm, setShowAddForm] = useState(false)
  const [newChallenge, setNewChallenge] = useState({ title: '', description: '' })
  const [addingChallenge, setAddingChallenge] = useState(false)
  const [error, setError] = useState('')
  const [seeding, setSeeding] = useState(false)
  const [seedingMsg, setSeedingMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled' | 'used'>('all')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/challenges')
        const data = await res.json()
        
        if (res.ok) {
          setChallenges(data.challenges || [])
          setStats({
            total: data.total || 0,
            used: data.used || 0,
            available: data.available || 0,
            disabled: data.disabled || 0,
          })
          
          if (data.total === 0) {
            setSeedingMsg('Challenge bank is empty. Click "Seed Bank" to populate it.')
          }
        } else {
          setError(data.error || 'Failed to fetch challenges')
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredChallenges = useMemo(() => {
    return challenges.filter(c => {
      const matchesSearch = searchQuery === '' || 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      switch (filter) {
        case 'enabled':
          return matchesSearch && c.is_enabled && !c.used
        case 'disabled':
          return matchesSearch && !c.is_enabled
        case 'used':
          return matchesSearch && c.used
        default:
          return matchesSearch
      }
    })
  }, [challenges, searchQuery, filter])

  async function handleSeed() {
    setSeeding(true)
    setError('')
    setSeedingMsg('Seeding...')
    
    try {
      const res = await fetch('/api/admin/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      })
      const data = await res.json()
      
      if (res.ok) {
        setSeedingMsg(data.message)
        setTimeout(async () => {
          setSeedingMsg('')
          try {
            const refreshRes = await fetch('/api/admin/challenges')
            const refreshData = await refreshRes.json()
            if (refreshRes.ok) {
              setChallenges(refreshData.challenges || [])
              setStats({
                total: refreshData.total || 0,
                used: refreshData.used || 0,
                available: refreshData.available || 0,
                disabled: refreshData.disabled || 0,
              })
            }
          } catch {
            // silently fail
          }
        }, 1500)
      } else {
        setError(data.error || 'Failed to seed')
        setSeedingMsg('')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSeedingMsg('')
    } finally {
      setSeeding(false)
    }
  }

  async function handleToggle(challenge: Challenge) {
    const newEnabled = !challenge.is_enabled
    
    setChallenges(prev => prev.map(c => 
      c.id === challenge.id ? { ...c, is_enabled: newEnabled } : c
    ))
    
    try {
      const res = await fetch('/api/admin/challenges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: challenge.id, is_enabled: newEnabled }),
      })
      
      if (!res.ok) {
        setChallenges(prev => prev.map(c => 
          c.id === challenge.id ? { ...c, is_enabled: !newEnabled } : c
        ))
        setError('Failed to update challenge')
      }
    } catch {
      setChallenges(prev => prev.map(c => 
        c.id === challenge.id ? { ...c, is_enabled: !newEnabled } : c
      ))
      setError('Failed to update challenge')
    }
  }

  async function handleAddChallenge(e: React.FormEvent) {
    e.preventDefault()
    setAddingChallenge(true)
    setError('')
    
    try {
      const res = await fetch('/api/admin/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newChallenge }),
      })
      const data = await res.json()
      
      if (res.ok) {
        setChallenges(prev => [...prev, { ...data.challenge, used: false, lastUsed: null, usageCount: 0 }])
        setNewChallenge({ title: '', description: '' })
        setShowAddForm(false)
        setStats(prev => ({ ...prev, total: prev.total + 1, available: prev.available + 1 }))
      } else {
        setError(data.error || 'Failed to add challenge')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setAddingChallenge(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this custom challenge?')) return
    
    try {
      const res = await fetch(`/api/admin/challenges?id=${id}`, { method: 'DELETE' })
      
      if (res.ok) {
        setChallenges(prev => prev.filter(c => c.id !== id))
        setStats(prev => ({ 
          ...prev, 
          total: prev.total - 1,
          available: prev.available > 0 ? prev.available - 1 : prev.available,
        }))
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  if (!user) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive mb-4">Unauthorized</p>
              <p className="text-sm text-muted-foreground mb-4">
                You must be logged in to view this page.
              </p>
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!profile?.is_dev_account) {
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
          <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">
            ← Back to Profile
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Challenge Bank</h1>
            <Badge variant="secondary">Dev Only</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Manage challenge subjects for Daily Draw Arena
          </p>
        </div>

        {error && (
          <Card className="mb-4 border-destructive">
            <CardContent className="py-3 text-center text-destructive text-sm">
              {error}
            </CardContent>
          </Card>
        )}

        {seedingMsg && (
          <Card className="mb-4 border-primary">
            <CardContent className="py-3 text-center text-sm">
              {seedingMsg}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-primary">{stats.available}</p>
              <p className="text-sm text-muted-foreground">Enabled</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold">{stats.disabled}</p>
              <p className="text-sm text-muted-foreground">Disabled</p>
            </CardContent>
          </Card>
          <Card className="bg-warning/5 border-warning/20">
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-warning">{stats.used}</p>
              <p className="text-sm text-muted-foreground">Used</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 mb-6">
          {stats.total === 0 ? (
            <Button onClick={handleSeed} disabled={seeding}>
              {seeding ? 'Seeding...' : 'Seed Challenge Bank'}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : '+ Add Custom Challenge'}
            </Button>
          )}
        </div>

        {stats.total > 0 && (
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search challenges..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'enabled' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('enabled')}
              >
                Enabled
              </Button>
              <Button
                variant={filter === 'disabled' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('disabled')}
              >
                Disabled
              </Button>
              <Button
                variant={filter === 'used' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('used')}
              >
                Used
              </Button>
            </div>
            <p className="text-sm text-muted-foreground self-center ml-auto">
              Showing {filteredChallenges.length} of {stats.total}
            </p>
          </div>
        )}

        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add Custom Challenge</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddChallenge} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newChallenge.title}
                    onChange={e => setNewChallenge(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Challenge title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newChallenge.description}
                    onChange={e => setNewChallenge(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the challenge..."
                    required
                  />
                </div>
                <Button type="submit" disabled={addingChallenge}>
                  {addingChallenge ? 'Adding...' : 'Add Challenge'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        ) : filteredChallenges.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {searchQuery || filter !== 'all' 
                  ? 'No challenges match your filter.' 
                  : 'No challenges in the bank.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChallenges.map((challenge) => (
              <Card 
                key={challenge.id} 
                className={`
                  ${!challenge.is_enabled ? 'opacity-60' : ''}
                  ${challenge.used ? 'border-muted-foreground/20' : 'border-success/30'}
                `}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{challenge.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      {challenge.source === 'custom' && (
                        <Badge variant="outline" className="text-xs">Custom</Badge>
                      )}
                      {challenge.used ? (
                        <Badge variant="secondary" className="text-xs">Used</Badge>
                      ) : (
                        <Badge variant="success" className="text-xs">New</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {challenge.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={challenge.is_enabled}
                        onCheckedChange={() => handleToggle(challenge)}
                        id={`toggle-${challenge.id}`}
                      />
                      <Label htmlFor={`toggle-${challenge.id}`} className="text-xs cursor-pointer">
                        {challenge.is_enabled ? 'Enabled' : 'Disabled'}
                      </Label>
                    </div>
                    {challenge.source === 'custom' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(challenge.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                  {challenge.used && (
                    <div className="text-xs text-muted-foreground mt-2">
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
        )}
      </div>
    </div>
  )
}