import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateForDisplay } from '@/lib/utils'
import { SubmissionCard } from '@/components/submission-card'

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: challenge } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('id', id)
    .single()

  if (!challenge) {
    notFound()
  }

  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      profiles:user_id (username, avatar_url),
      evaluations (*)
    `)
    .eq('challenge_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/challenges"
            className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
          >
            ← Back to Challenges
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge variant="secondary" className="mb-2">
                Challenge {challenge.slot} of 3
              </Badge>
              <h1 className="text-3xl font-bold mb-2">{challenge.title}</h1>
              <p className="text-muted-foreground">{challenge.description}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {formatDateForDisplay(challenge.challenge_date)}
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Submit Your Artwork</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Create your artwork based on this challenge and upload it to receive AI feedback and compete on the leaderboard.
            </p>
            <Link href={`/submit/${challenge.id}`}>
              <Button>Upload Drawing</Button>
            </Link>
          </CardContent>
        </Card>

        <div className="mb-6">
          <h2 className="text-xl font-bold">Recent Submissions</h2>
          <p className="text-sm text-muted-foreground">
            {submissions?.length || 0} submission{submissions?.length !== 1 ? 's' : ''}
          </p>
        </div>

        {!submissions?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No submissions yet. Be the first to submit!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {submissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
