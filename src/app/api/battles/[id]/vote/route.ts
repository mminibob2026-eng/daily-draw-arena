import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: battleId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { voteFor } = await request.json()

    if (!voteFor || !['human', 'ai'].includes(voteFor)) {
      return NextResponse.json({ error: 'Invalid vote' }, { status: 400 })
    }

    const { data: existingVote } = await supabase
      .from('votes')
      .select('id, vote_for')
      .eq('battle_id', battleId)
      .eq('user_id', user.id)
      .single()

    if (existingVote) {
      if (existingVote.vote_for === voteFor) {
        return NextResponse.json({ error: 'Already voted for this option' }, { status: 409 })
      }

      const oldVote = existingVote.vote_for
      const oldColumn = oldVote === 'human' ? 'human_votes' : 'ai_votes'
      const newColumn = voteFor === 'human' ? 'human_votes' : 'ai_votes'

      const { data: currentBattle } = await supabase
        .from('ai_battles')
        .select('human_votes, ai_votes')
        .eq('id', battleId)
        .single()

      if (currentBattle) {
        const oldCount = currentBattle[oldColumn] || 0
        const newCount = currentBattle[newColumn] || 0

        await supabase
          .from('ai_battles')
          .update({
            [oldColumn]: Math.max(0, oldCount - 1),
            [newColumn]: newCount + 1,
          })
          .eq('id', battleId)
      }

      await supabase
        .from('votes')
        .update({ vote_for: voteFor })
        .eq('id', existingVote.id)
    } else {
      const { data: currentBattle } = await supabase
        .from('ai_battles')
        .select('human_votes, ai_votes')
        .eq('id', battleId)
        .single()

      await supabase
        .from('votes')
        .insert({
          battle_id: battleId,
          user_id: user.id,
          vote_for: voteFor,
        })

      if (currentBattle) {
        const column = voteFor === 'human' ? 'human_votes' : 'ai_votes'
        const currentCount = currentBattle[column] || 0

        await supabase
          .from('ai_battles')
          .update({ [column]: currentCount + 1 })
          .eq('id', battleId)
      }
    }

    const { data: battle } = await supabase
      .from('ai_battles')
      .select('human_votes, ai_votes')
      .eq('id', battleId)
      .single()

    const total = (battle?.human_votes || 0) + (battle?.ai_votes || 0)
    const humanPercent = total > 0 ? Math.round((battle?.human_votes / total) * 100) : 50
    const aiPercent = total > 0 ? Math.round((battle?.ai_votes / total) * 100) : 50

    return NextResponse.json({
      success: true,
      votes: {
        human: battle?.human_votes || 0,
        ai: battle?.ai_votes || 0,
        humanPercent,
        aiPercent,
      }
    })
  } catch (error: any) {
    console.error('Vote error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: battleId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: battle } = await supabase
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
      .eq('id', battleId)
      .single()

    if (!battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 })
    }

    let userVote = null
    if (user) {
      const { data: vote } = await supabase
        .from('votes')
        .select('vote_for')
        .eq('battle_id', battleId)
        .eq('user_id', user.id)
        .single()
      userVote = vote?.vote_for
    }

    const total = (battle.human_votes || 0) + (battle.ai_votes || 0)

    return NextResponse.json({
      battle,
      userVote,
      votes: {
        human: battle.human_votes || 0,
        ai: battle.ai_votes || 0,
        humanPercent: total > 0 ? Math.round((battle.human_votes / total) * 100) : 50,
        aiPercent: total > 0 ? Math.round((battle.ai_votes / total) * 100) : 50,
        total,
      }
    })
  } catch (error: any) {
    console.error('Battle fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
