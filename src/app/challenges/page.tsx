import { createClient } from '@/lib/supabase/server'
import { getChallengeDate } from '@/lib/utils'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function ChallengesPage() {
  const supabase = await createClient()
  const today = getChallengeDate()

  const { data: challenges } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('challenge_date', today)
    .order('slot')

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Today&apos;s Challenges</h1>
          <p className="text-muted-foreground mt-1">
            Choose a challenge and create your masterpiece
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Resets at midnight MYT
        </Badge>
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
          {challenges.map((challenge, index) => (
            <Card key={challenge.id} className="group hover:shadow-lg transition-all duration-200 hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">{index + 1}</span>
                  </div>
                  <CardTitle className="text-xl">{challenge.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  {challenge.description}
                </p>
                <Link href={`/challenges/${challenge.id}`} className="block">
                  <Button className="w-full group-hover:animate-pulse-glow">
                    Submit Drawing
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-12 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Past Challenges</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Historical challenges are available for viewing but submissions are closed.
            </p>
            <Link href="/leaderboard" className="inline-block mt-4">
              <Button variant="outline" size="sm">View Leaderboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
