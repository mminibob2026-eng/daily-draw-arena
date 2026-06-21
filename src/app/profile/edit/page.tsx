'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

export default function EditProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [username, setUsername] = useState(profile?.username || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !username.trim()) return

    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      })

      const data = await res.json()

      if (res.ok) {
        await refreshProfile()
        setSuccess(true)
        toast({ title: 'Profile updated!' })
        setTimeout(() => router.push('/profile'), 1000)
      } else {
        if (data.code === 'USERNAME_TAKEN' || res.status === 409) {
          setError('This username is already taken. Please choose a different one.')
        } else if (data.code === 'INVALID_USERNAME') {
          setError('Username must be 3-20 characters, alphanumeric and underscores only.')
        } else {
          setError(data.error || 'Failed to update profile')
        }
      }
    } catch (err) {
      setError('Failed to update profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setAvatarUrl(data.avatarUrl)
        await refreshProfile()
        toast({ title: 'Avatar updated!' })
      } else {
        setError(data.error || 'Failed to upload avatar')
      }
    } catch (err) {
      setError('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true)
    try {
      await fetch('/api/profile/avatar', { method: 'DELETE' })
      setAvatarUrl(null)
      await refreshProfile()
      toast({ title: 'Avatar removed' })
    } catch (err) {
      setError('Failed to remove avatar')
    } finally {
      setUploadingAvatar(false)
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

              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Avatar"
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-2xl font-bold">
                      {username[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
                  </Button>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Max 2MB. JPG, PNG, WebP.</p>
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
                  3-20 characters, alphanumeric and underscores only.
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