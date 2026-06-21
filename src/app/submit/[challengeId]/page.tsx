'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function SubmitPage({
  params,
}: {
  params: Promise<{ challengeId: string }>
}) {
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [checking, setChecking] = useState(true)
  const { user, profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const evaluationDoneRef = useRef(false)

  useEffect(() => {
    params.then(({ challengeId }) => setChallengeId(challengeId))
  }, [params])

  useEffect(() => {
    if (!challengeId) return

    const fetchChallenge = async () => {
      const { data } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('id', challengeId)
        .single()
      setChallenge(data)
    }

    const checkExistingSubmission = async () => {
      if (!user) return
      const { data } = await supabase
        .from('submissions')
        .select('id')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId)
        .single()
      
      if (data) {
        toast({
          title: 'Already submitted',
          description: 'You have already submitted to this challenge.',
          variant: 'destructive',
        })
        router.push(`/challenges/${challengeId}`)
      }
      setChecking(false)
    }

    fetchChallenge()
    checkExistingSubmission()
  }, [challengeId, user, supabase, router, toast])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (!selected.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an image file.',
        variant: 'destructive',
      })
      return
    }

    if (selected.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB.',
        variant: 'destructive',
      })
      return
    }

    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  const triggerEvaluation = async (submissionId: string) => {
    try {
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      })

      if (!response.ok) {
        throw new Error('Evaluation failed')
      }

      const { evaluation } = await response.json()
      
      toast({
        title: 'Evaluation complete!',
        description: `Final score: ${evaluation.finalScore.toFixed(1)}/100`,
      })
    } catch (error) {
      console.error('Evaluation error:', error)
      toast({
        title: 'Evaluation pending',
        description: 'Your drawing has been submitted. AI evaluation will complete shortly.',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !user || !challengeId) return
    if (evaluationDoneRef.current) return

    setUploading(true)
    evaluationDoneRef.current = true

    try {
      // Use server-side API for race-safe submission
      const formData = new FormData()
      formData.append('file', file)
      formData.append('challengeId', challengeId)

      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle 409 conflict (already submitted)
        if (response.status === 409) {
          toast({
            title: 'Already submitted',
            description: data.error || 'You have already submitted to this challenge.',
            variant: 'destructive',
          })
          router.push(`/challenges/${challengeId}`)
          return
        }
        throw new Error(data.error || 'Submission failed')
      }

      const submission = data.submission

      setEvaluating(true)
      toast({
        title: 'Submission received!',
        description: 'Your drawing is being evaluated by AI...',
      })

      await triggerEvaluation(submission.id)

      router.push(`/challenges/${challengeId}`)
      router.refresh()
    } catch (error) {
      evaluationDoneRef.current = false
      const err = error as Error
      toast({
        title: 'Upload failed',
        description: err.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
      setUploading(false)
    }
  }

  if (checking) {
    return (
      <div className="container py-8">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4">Please sign in to submit your artwork.</p>
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
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/challenges/${challengeId}`}
          className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
        >
          ← Back to Challenge
        </Link>

        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit mb-2">
              Challenge {challenge?.slot} of 3
            </Badge>
            <CardTitle className="text-2xl">{challenge?.title}</CardTitle>
            <CardDescription>{challenge?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload Your Drawing
                </label>
                <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                  {preview ? (
                    <div className="relative max-w-md mx-auto">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded-lg object-contain"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setFile(null)
                          setPreview(null)
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                          <span className="text-2xl">🎨</span>
                        </div>
                        <p className="text-sm font-medium mb-1">
                          Click to upload your artwork
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, WebP up to 10MB
                        </p>
                      </label>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={!file || uploading || evaluating}
                  className="flex-1"
                >
                  {uploading ? 'Uploading...' : evaluating ? 'Evaluating...' : 'Submit Drawing'}
                </Button>
                <Link href={`/challenges/${challengeId}`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Free users can submit 1 drawing per day. Your drawing will be 
                evaluated by AI for creativity, storytelling, composition, effort, 
                and originality.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
