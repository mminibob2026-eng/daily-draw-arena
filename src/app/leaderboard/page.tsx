import { createClient } from '@/lib/supabase/server'
import { getChallengeDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const today = getChallengeDate()

  const { data: challenges } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('challenge_date', today)
    .order('slot')

  const { data: leaderboardEntries } = await supabase
    .from('leaderboard')
    .select(`
      *,
      profiles:user_id (username, avatar_url),
      challenges:challenge_id (title)
    `)
    .eq('challenge_id', challenges?.[0]?.id)
    .order('rank')

  const topEntries = leaderboardEntries?.slice(0, 10) || []

  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Today&apos;s Leaderboard</h1>
          <p className="text-muted-foreground">
            Top artists for {today}
          </p>
        </div>

        {!challenges?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No challenges available yet. Check back soon!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex gap-2 mb-6 flex-wrap">
              {challenges.map((challenge) => (
                <Badge key={challenge.id} variant="outline">
                  {challenge.title}
                </Badge>
              ))}
            </div>

            {!topEntries.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-2">
                    No submissions yet today.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Be the first to submit and top the leaderboard!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>🏆</span> Top 10
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {topEntries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center font-bold
                          ${index === 0 ? 'bg-yellow-500 text-yellow-950' : ''}
                          ${index === 1 ? 'bg-gray-400 text-gray-950' : ''}
                          ${index === 2 ? 'bg-amber-600 text-amber-50' : ''}
                          ${index > 3 ? 'bg-muted text-muted-foreground' : ''}
                        `}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {entry.profiles?.username || 'Anonymous'}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {entry.challenges?.title}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">
                            {entry.final_score?.toFixed(1)}
                          </p>
                          <p className="text-xs text-muted-foreground">points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {leaderboardEntries && leaderboardEntries.length > 10 && (
              <Card className="mt-4">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    +{leaderboardEntries.length - 10} more artists ranked
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
