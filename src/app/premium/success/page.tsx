'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

function PremiumSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile, refreshProfile } = useAuth()
  const [refreshing, setRefreshing] = useState(true)

  useEffect(() => {
    refreshProfile?.()
    const timer = setTimeout(() => setRefreshing(false), 3000)
    return () => clearTimeout(timer)
  }, [refreshProfile])

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              🎉 Welcome to Premium!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your subscription is now active. You have access to:
            </p>
            <ul className="text-sm space-y-2 text-left">
              <li>✅ Unlimited daily submissions</li>
              <li>✅ AI Battle mode</li>
              <li>✅ Priority support</li>
              <li>✅ Premium badge</li>
            </ul>
            {refreshing ? (
              <p className="text-sm text-muted-foreground">Setting up your account...</p>
            ) : (
              <p className="text-sm text-success">Your account is upgraded!</p>
            )}
            <Link href="/challenges">
              <Button className="w-full">Start Drawing</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PremiumSuccessPage() {
  return (
    <Suspense fallback={<div className="container py-8 text-center">Loading...</div>}>
      <PremiumSuccessContent />
    </Suspense>
  )
}