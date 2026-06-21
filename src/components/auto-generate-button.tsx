'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface AutoGenerateButtonProps {
  date: string
}

export function AutoGenerateButton({ date }: AutoGenerateButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function handleGenerate() {
    setLoading(true)
    try {
      // Use public-generate endpoint that works for anyone
      const res = await fetch('/api/challenges/public-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (res.ok) {
        if (data.alreadyExists) {
          toast({
            title: 'Challenges already exist',
            description: 'Refreshing...',
          })
        } else {
          toast({
            title: 'Generated successfully!',
            description: `${data.count} challenges created for today.`,
          })
        }
        router.refresh()
        return
      }

      toast({
        title: 'Failed to generate',
        description: data.error || 'Unknown error',
        variant: 'destructive',
      })
    } catch (err) {
      console.error('Generate error:', err)
      toast({
        title: 'Failed to generate',
        description: 'Please try again or check your connection.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleGenerate} disabled={loading} size="sm" variant="primary">
      {loading ? 'Generating...' : 'Generate Today\'s Challenges'}
    </Button>
  )
}