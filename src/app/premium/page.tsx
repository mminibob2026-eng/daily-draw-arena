'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'

const features = [
  { title: 'Unlimited Submissions', description: 'Submit to all 3 daily challenges every day', icon: '🎨' },
  { title: 'AI Battle Mode', description: 'Challenge AI-generated artwork and let the community vote', icon: '⚔️' },
  { title: 'Full History', description: 'Access your complete submission history and stats', icon: '📊' },
  { title: 'Detailed Feedback', description: 'Get in-depth AI analysis and improvement suggestions', icon: '💡' },
]

export default function PremiumPage() {
  const { user, profile, refreshProfile } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubscribe = async () => {
    if (!user) {
      router.push('/login?redirect=/premium')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
      })
      const data = await res.json()

      if (res.ok) {
        if (data.devMode) {
          // Dev mode - directly upgraded
          await refreshProfile?.()
          router.push('/premium/success')
        } else {
          // Redirect to Stripe checkout
          window.location.href = data.url
        }
      } else {
        setError(data.error || 'Failed to start checkout')
      }
    } catch (err) {
      setError('Failed to start checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (profile?.is_premium) {
    return (
      <div className="container py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <Badge variant="warning" className="mb-4">Premium Member</Badge>
              <h1 className="text-2xl font-bold mb-2">You&apos;re already Premium!</h1>
              <p className="text-muted-foreground mb-6">
                Thanks for supporting Daily Draw Arena.
              </p>
              <Link href="/challenges">
                <Button>Start Drawing</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="warning" className="mb-4">Premium</Badge>
          <h1 className="text-4xl font-bold mb-4">Unlock Your Full Potential</h1>
          <p className="text-xl text-muted-foreground">
            Get unlimited access to Daily Draw Arena and become the artist you were meant to be.
          </p>
        </div>

        <Card className="mb-12 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="py-12 text-center">
            <div className="text-6xl font-bold mb-2">$9.99</div>
            <p className="text-muted-foreground mb-6">per month</p>

            {error && (
              <p className="text-sm text-destructive mb-4">{error}</p>
            )}

            <Button
              size="lg"
              className="w-full max-w-xs"
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? 'Loading...' : user ? 'Subscribe Now' : 'Sign In to Subscribe'}
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Cancel anytime. Secure payment via Stripe.
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {features.map((feature, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="text-3xl">{feature.icon}</div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="py-8 text-center">
            <h3 className="font-bold mb-2">Have questions?</h3>
            <p className="text-muted-foreground mb-4">
              Contact us at support@daily.draw
            </p>
            <Link href="/challenges">
              <Button variant="outline">Continue with Free Plan</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}