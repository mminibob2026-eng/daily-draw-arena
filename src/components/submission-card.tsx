'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SubmissionCardProps {
  submission: {
    id: string
    image_url: string
    created_at: string
    profiles: {
      username: string
      avatar_url: string | null
    } | null
    evaluations: {
      final_score: number
    } | null
  }
}

export function SubmissionCard({ submission }: SubmissionCardProps) {
  return (
    <Link href={`/submissions/${submission.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
        <div className="aspect-[4/3] relative bg-muted">
          <Image
            src={submission.image_url}
            alt="Submission"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {submission.evaluations && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-primary/90 text-primary-foreground">
                {submission.evaluations.final_score.toFixed(1)}
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {submission.profiles?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-sm font-medium truncate">
              {submission.profiles?.username || 'Anonymous'}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
