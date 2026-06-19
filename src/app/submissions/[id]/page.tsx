import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SubmissionDetail from '@/components/submission-detail'

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: submission } = await supabase
    .from('submissions')
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        avatar_url,
        is_premium
      ),
      challenges:challenge_id (
        id,
        title,
        description
      ),
      evaluations (*)
    `)
    .eq('id', id)
    .single()

  if (!submission) {
    notFound()
  }

  return (
    <div className="container py-8">
      <Link
        href={`/challenges/${submission.challenge_id}`}
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block max-w-2xl mx-auto block"
      >
        ← Back to Challenge
      </Link>
      <SubmissionDetail submission={submission} />
    </div>
  )
}
