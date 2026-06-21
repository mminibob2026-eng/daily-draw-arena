'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface AutoGenerateButtonProps {
  date: string
}

export function AutoGenerateButton({ date }: AutoGenerateButtonProps) {
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
    } catch {
      alert('Failed to generate challenges')
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