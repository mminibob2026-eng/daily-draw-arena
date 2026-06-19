'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export function BattleButton({ submissionId }: { submissionId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleCreateBattle = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      })
      const data = await response.json()

      if (data.error) {
        toast({
          title: 'Battle failed',
          description: data.error,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Battle created!',
          description: 'Your AI battle is ready for voting.',
        })
        router.push(`/battles/${data.battle.id}`)
      }
    } catch (error) {
      toast({
        title: 'Battle failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  return (
    <Button onClick={handleCreateBattle} disabled={loading} variant="outline">
      {loading ? 'Creating...' : '⚔️ Start AI Battle'}
    </Button>
  )
}
