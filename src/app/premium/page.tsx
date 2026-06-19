import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const features = [
  { title: 'Unlimited Submissions', description: 'Submit to all 3 daily challenges instead of just 1', icon: '🎨' },
  { title: 'AI Battle Mode', description: 'Challenge AI-generated artwork and let the community vote', icon: '⚔️' },
  { title: 'Full History', description: 'Access your complete submission history and stats', icon: '📊' },
  { title: 'Detailed Feedback', description: 'Get in-depth AI analysis and improvement suggestions', icon: '💡' },
]

export default function PremiumPage() {
  return (
    <div className="container py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="warning" className="mb-4">Premium</Badge>
          <h1 className="text-4xl font-bold mb-4">Unlock Your Full Potential</h1>
          <p className="text-xl text-muted-foreground">
            Get unlimited access to Daily Draw Arena and become the artist you were meant to be.
          </p>
        </div>

        <Card className="mb-12 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="py-12 text-center">
            <div className="text-6xl font-bold mb-2">$9.99</div>
            <p className="text-muted-foreground mb-6">per month</p>
            <Button size="lg" className="w-full max-w-xs">
              Subscribe Now
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Cancel anytime. Secure payment via Stripe.
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {features.map((feature, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="text-3xl">{feature.icon}</div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="py-8 text-center">
            <h3 className="font-bold mb-2">Have questions?</h3>
            <p className="text-muted-foreground mb-4">
              Contact us at support@daily.draw
            </p>
            <Link href="/challenges">
              <Button variant="outline">Continue with Free Plan</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
