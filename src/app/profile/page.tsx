import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      challenges:challenge_id (title),
      evaluations (final_score)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold">
                  {profile?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <CardTitle className="text-2xl">{profile?.username}</CardTitle>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/profile/edit">
                  <Button variant="outline" size="sm">Edit Profile</Button>
                </Link>
                {profile?.is_dev_account && (
                  <Link href="/admin/challenges">
                    <Button variant="outline" size="sm">Challenges</Button>
                  </Link>
                )}
                {profile?.is_premium ? (
                  <Badge variant="warning">Premium</Badge>
                ) : (
                  <Link href="/premium">
                    <Button variant="outline" size="sm">Upgrade</Button>
                  </Link>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">{profile?.streak_count || 0}</p>
                <p className="text-sm text-muted-foreground">🔥 Streak</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">{profile?.submissions_count || 0}</p>
                <p className="text-sm text-muted-foreground">Submissions</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">{(profile?.total_score || 0).toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Total Score</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">
                  {profile?.submissions_count ? (profile.total_score / profile.submissions_count).toFixed(1) : '0'}
                </p>
                <p className="text-sm text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold mb-4">Recent Submissions</h2>
        {!submissions?.length ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                No submissions yet.
              </p>
              <Link href="/challenges">
                <Button>Start Drawing</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission: any) => (
              <Card key={submission.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      <img
                        src={submission.image_url}
                        alt="Submission"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{submission.challenges?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {submission.evaluations && (
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {submission.evaluations.final_score?.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">score</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
