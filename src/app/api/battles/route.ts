import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBattleImage } from '@/lib/agnes'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submissionId } = await request.json()

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium, is_dev_account')
      .eq('id', user.id)
      .single()

    if (!profile?.is_premium && !profile?.is_dev_account) {
      return NextResponse.json({ error: 'Premium only' }, { status: 403 })
    }

    const { data: submission } = await supabase
      .from('submissions')
      .select('*, daily_challenges(*)')
      .eq('id', submissionId)
      .eq('user_id', user.id)
      .single()

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const existingBattle = await supabase
      .from('ai_battles')
      .select('id')
      .eq('human_submission_id', submissionId)
      .single()

    if (existingBattle.data) {
      return NextResponse.json({ error: 'Battle already exists', battleId: existingBattle.data.id }, { status: 409 })
    }

    const challenge = submission.daily_challenges

    const aiImageUrl = await generateBattleImage(
      challenge.title,
      challenge.description || ''
    )

    const { data: aiImage, error: aiImageError } = await supabase
      .from('ai_generated_images')
      .insert({
        challenge_id: submission.challenge_id,
        image_url: aiImageUrl,
        variant: 1,
      })
      .select()
      .single()

    if (aiImageError) {
      console.error('AI image insert error:', aiImageError)
    }

    const { data: battle, error: battleError } = await supabase
      .from('ai_battles')
      .insert({
        challenge_id: submission.challenge_id,
        human_submission_id: submissionId,
        ai_image_id: aiImage?.id,
        status: 'voting',
        ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (battleError) {
      console.error('Battle insert error:', battleError)
      return NextResponse.json({ error: 'Failed to create battle' }, { status: 500 })
    }

    return NextResponse.json({ success: true, battle })
  } catch (error: any) {
    console.error('Battle creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'voting'

    let query = supabase
      .from('ai_battles')
      .select(`
        *,
        challenges:challenge_id (
          id,
          title,
          description
        ),
        human_submissions:human_submission_id (
          id,
          image_url,
          user_id,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        ),
        ai_images:ai_image_id (
          id,
          image_url
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })

    const { data: battles, error } = await query.limit(20)

    if (error) {
      console.error('Battles fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch battles' }, { status: 500 })
    }

    return NextResponse.json({ battles: battles || [] })
  } catch (error: any) {
    console.error('Battles error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
