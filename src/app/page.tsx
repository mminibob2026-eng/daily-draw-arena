import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getChallengeDate } from '@/lib/utils'
import { getOrCreateDailyChallenges } from '@/lib/daily-challenges'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    title: 'Daily Challenges',
    description: 'Three new drawing themes every day at midnight (MYT). Come back daily for fresh inspiration.',
  },
  {
    title: 'AI Scoring',
    description: 'Get instant feedback on creativity, storytelling, composition, effort, and originality.',
  },
  {
    title: 'Leaderboards',
    description: 'Compete against other artists and climb the daily rankings.',
  },
  {
    title: 'AI Battles',
    description: 'Premium feature: Challenge yourself against AI-generated art and let the community vote.',
  },
]

export default async function Home() {
  const supabase = await createClient()
  const today = getChallengeDate()

  // Deterministically derive today's challenges from the challenge bank.
  const challenges = await getOrCreateDailyChallenges(today)

  return (
    <div className="flex flex-col">
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-slide-up">
              <span>🔥</span>
              <span>Join thousands of artists worldwide</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
              Draw. Score.{' '}
              <span className="text-primary">Compete.</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
              Daily drawing challenges that test your creativity. Get AI-powered feedback, 
              climb leaderboards, and prove your art stands above the rest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '300ms' }}>
              <Link href="/challenges">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Drawing Today
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  View Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Daily Challenges</h2>
            <p className="text-muted-foreground">Three themes, infinite possibilities. Submissions reset at midnight MYT.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {challenges.map((challenge, i) => (
              <Card key={i} className="group hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <span className="text-primary font-bold">{i + 1}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                    {challenge.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {challenge.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/challenges">
              <Button variant="outline">View All Challenges</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Three simple steps to become a Daily Draw champion</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-bold mb-2">Pick a Challenge</h3>
              <p className="text-sm text-muted-foreground">
                Choose from three daily themes and create your artwork
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-bold mb-2">Upload & Get Scored</h3>
              <p className="text-sm text-muted-foreground">
                Submit your drawing and receive AI-powered feedback
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-bold mb-2">Climb the Ranks</h3>
              <p className="text-sm text-muted-foreground">
                Compete on the daily leaderboard and track your progress
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Features</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {features.map((feature, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <h3 className="font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Start?</h2>
            <p className="text-muted-foreground mb-8">
              Free users get 1 submission per day. Premium users get unlimited access and AI Battle Mode.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg">Create Free Account</Button>
              </Link>
              <Link href="/premium">
                <Button variant="outline" size="lg">Learn About Premium</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
