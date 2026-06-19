import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function BattlesPage() {
  const supabase = await createClient()

  const { data: battles } = await supabase
    .from('ai_battles')
    .select(`
      *,
      challenges:challenge_id (title),
      human_submissions:human_submission_id (
        image_url,
        profiles:user_id (username)
      ),
      ai_images:ai_image_id (
        image_url
      )
    `)
    .eq('status', 'voting')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">AI Battles</h1>
            <p className="text-muted-foreground mt-1">
              Vote on human vs AI artwork matchups
            </p>
          </div>
          <Badge variant="outline">
            {battles?.length || 0} active battles
          </Badge>
        </div>

        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">⚔️</div>
              <div>
                <h3 className="font-bold mb-1">Premium Feature</h3>
                <p className="text-sm text-muted-foreground">
                  Create your own AI Battle after submitting to a challenge.
                  Generate unique AI artwork and compete for community votes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!battles?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-4">🤖</p>
              <p className="text-muted-foreground mb-4">
                No active battles right now.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Submit to a challenge and start an AI Battle to create one!
              </p>
              <Link href="/challenges">
                <Button>View Challenges</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {battles.map((battle: any) => (
              <Card key={battle.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {battle.challenges?.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 text-center">Human</p>
                      <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
                        {battle.human_submissions?.image_url && (
                          <img
                            src={battle.human_submissions.image_url}
                            alt="Human submission"
                            className="object-cover w-full h-full"
                          />
                        )}
                      </div>
                      <p className="text-xs text-center mt-2 truncate">
                        {battle.human_submissions?.profiles?.username || 'Anonymous'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 text-center">AI</p>
                      <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
                        {battle.ai_images?.image_url && (
                          <img
                            src={battle.ai_images.image_url}
                            alt="AI generation"
                            className="object-cover w-full h-full"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-semibold">{battle.human_votes}</span>
                      <span className="text-muted-foreground"> votes </span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="font-semibold"> {battle.ai_votes}</span>
                    </div>
                    <Link href={`/battles/${battle.id}`}>
                      <Button size="sm">Vote Now</Button>
                    </Link>
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
