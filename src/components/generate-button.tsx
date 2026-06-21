'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface GenerateButtonProps {
  date: string
}

export function GenerateButton({ date }: GenerateButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch('/api/challenges/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      
      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to generate challenges')
      }
    } catch (e) {
      alert('Failed to generate challenges')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleGenerate} disabled={loading} size="sm">
      {loading ? 'Generating...' : 'Generate Today\'s Challenges'}
    </Button>
  )
}