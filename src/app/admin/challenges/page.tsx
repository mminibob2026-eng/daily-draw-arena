import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CHALLENGE_BANK } from '@/lib/challenges'

export default async function AdminChallengesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_dev_account')
    .eq('id', user.id)
    .single()

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

  const { data: usedChallenges } = await supabase
    .from('daily_challenges')
    .select('title, challenge_date')

  const usedTitles = new Set(usedChallenges?.map(c => c.title) || [])

  const challenges = CHALLENGE_BANK.map((c, i) => {
    const usages = usedChallenges?.filter(u => u.title === c.title) || []
    return {
      id: i + 1,
      title: c.title,
      description: c.description,
      used: usedTitles.has(c.title),
      lastUsed: usages.length > 0 ? usages[usages.length - 1].challenge_date : null,
      usageCount: usages.length,
    }
  })

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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Challenge Bank</h1>
            <Badge variant="secondary">Dev Only</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Review all {CHALLENGE_BANK.length} approved challenge subjects
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

        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              {stats.used} challenges have been used and won&apos;t repeat for 30 days per user
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {challenges.map((challenge) => (
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
      </div>
    </div>
  )
}
