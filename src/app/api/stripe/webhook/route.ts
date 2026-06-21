import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!stripeSecretKey || !webhookSecret) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
    }

    const stripe = new Stripe(stripeSecretKey)
    const supabase = await createClient()

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (!userId) {
          console.error('Missing user_id in checkout session metadata')
          break
        }

        // Update profile to premium
        await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('id', userId)

        // Create subscription record
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan: 'premium',
            status: 'active',
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }, {
            onConflict: 'stripe_subscription_id'
          })

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.user_id

        if (userId) {
          await supabase
            .from('profiles')
            .update({ is_premium: false })
            .eq('id', userId)

          await supabase
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('stripe_subscription_id', subscription.id)
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.user_id

        if (userId) {
          const isActive = subscription.status === 'active'
          await supabase
            .from('profiles')
            .update({ is_premium: isActive })
            .eq('id', userId)

          await supabase
            .from('subscriptions')
            .update({
              status: subscription.status,
              current_period_end: new Date(((subscription as any).current_period_end || Date.now() / 1000) * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id)
        }

        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}