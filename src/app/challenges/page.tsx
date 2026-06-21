import { createClient } from '@/lib/supabase/server'
import { getChallengeDate } from '@/lib/utils'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AutoGenerateButton } from '@/components/auto-generate-button'

export default async function ChallengesPage() {
  const supabase = await createClient()
  const today = getChallengeDate()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('is_dev_account')
        .eq('id', user.id)
        .single()
    : { data: null }

  const { data: challenges, count } = await supabase
    .from('daily_challenges')
    .select('*', { count: 'exact' })
    .eq('challenge_date', today)
    .order('slot')

  const { data: userSubmissions } = user
    ? await supabase
        .from('submissions')
        .select('challenge_id')
        .eq('user_id', user.id)
    : { data: [] }

  const submittedChallengeIds = new Set(userSubmissions?.map(s => s.challenge_id) || [])

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Today&apos;s Challenges</h1>
          <p className="text-muted-foreground mt-1">
            {user ? "Choose a challenge and create your masterpiece" : "Sign in to start drawing!"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {!challenges?.length && (
            <AutoGenerateButton date={today} />
          )}
          <Badge variant="outline" className="text-sm">
            Resets at midnight MYT
          </Badge>
        </div>
      </div>

      {!challenges?.length ? (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No challenges available yet. Check back soon!
            </p>
            <Link href="/leaderboard">
              <Button variant="outline">View Leaderboard</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {challenges.map((challenge, index) => {
            const hasSubmitted = submittedChallengeIds.has(challenge.id)
            
            return (
              <Card key={challenge.id} className="group hover:shadow-lg transition-all duration-200 hover:border-primary/50 overflow-hidden">
                <div className="aspect-[4/3] bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
                  <span className="text-6xl opacity-50">
                    {index === 0 ? '☕' : index === 1 ? '🧚' : '👜'}
                  </span>
                </div>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">{index + 1}</span>
                    </div>
                    <CardTitle className="text-lg">{challenge.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">
                    {challenge.description}
                  </p>
                  
                  {hasSubmitted ? (
                    <div className="flex items-center gap-2 text-success text-sm">
                      <span>✓</span>
                      <span>Submitted</span>
                    </div>
                  ) : user ? (
                    <Link href={`/submit/${challenge.id}`} className="block">
                      <Button className="w-full bg-primary hover:bg-primary/90">
                        🎨 Submit Drawing
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/login" className="block">
                      <Button variant="outline" className="w-full">
                        Sign In to Submit
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="mt-12 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How to Participate</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground">1.</span>
                <span>Choose a challenge that inspires you</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground">2.</span>
                <span>Create your artwork (any medium, any style)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground">3.</span>
                <span>Upload and get AI feedback on creativity, storytelling, and more</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground">4.</span>
                <span>Compete on the daily leaderboard!</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
