'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export default function EditProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (profile?.username) {
      setUsername(profile.username)
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !username.trim()) return

    setError('')
    setSuccess(false)
    setLoading(true)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: username.trim() })
      .eq('id', user.id)

    if (updateError) {
      if (updateError.code === '23505') {
        setError('This username is already taken.')
      } else {
        setError(updateError.message)
      }
      setLoading(false)
    } else {
      await refreshProfile()
      setSuccess(true)
      setLoading(false)
      router.push('/profile')
    }
  }

  if (!user) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4">Please sign in to edit your profile.</p>
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto">
        <Link
          href="/profile"
          className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
        >
          ← Back to Profile
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-lg bg-success/10 text-success text-sm">
                  Profile updated successfully!
                </div>
              )}

              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold">
                  {username[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-medium">{username || 'user_xxx'}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">Username</label>
                <Input
                  id="username"
                  type="text"
                  placeholder="artista_42"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  3-20 characters. This is how other users see you.
                </p>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Link href="/profile">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
