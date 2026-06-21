import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already premium
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single()

    if (profile?.is_premium) {
      return NextResponse.json({ error: 'You are already a premium member' }, { status: 400 })
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      // Dev mode: directly grant premium without payment
      // This allows testing without Stripe configured
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', user.id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to upgrade' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        devMode: true,
        message: 'Premium granted (dev mode - no payment processed)',
      })
    }

    const stripe = new Stripe(stripeSecretKey)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Daily Draw Arena Premium',
              description: 'Unlimited daily submissions + AI Battle mode',
            },
            unit_amount: 999, // $9.99/month
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/premium?canceled=true`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
      },
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}