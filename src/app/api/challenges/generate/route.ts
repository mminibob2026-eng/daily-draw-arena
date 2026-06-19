import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChallengeDate } from '@/lib/utils'

const CHALLENGE_TEMPLATES = [
  { title: 'Your Morning Coffee', description: 'Draw your coffee mug, the steam rising, or what your coffee makes you feel like.' },
  { title: 'Tiny Creatures', description: 'Invent a bug, fairy, or mini monster.' },
  { title: 'Inside Your Bag', description: 'Sketch what\'s in your purse, backpack, or dream travel bag.' },
  { title: 'Rainy Day Vibes', description: 'Umbrellas, puddles, clouds, or cozy indoor scenes.' },
  { title: 'Doodle Your Mood', description: 'Use shapes, lines, or faces to express how you feel.' },
  { title: 'Magic Potions', description: 'Design bottles, labels, ingredients, and effects!' },
  { title: 'Your Favorite Snack', description: 'Sweet, salty, savory—make it cute or realistic.' },
  { title: 'Musical Shapes', description: 'What would music look like if it were a doodle?' },
  { title: 'Silly Robots', description: 'Create a funny or helpful robot with odd features.' },
  { title: 'Houseplants With Personality', description: 'Give each plant a name, face, and mood.' },
  { title: 'What\'s in the Sky?', description: 'Sun, stars, UFOs, hot air balloons—let your mind float.' },
  { title: 'Your Dream Shoes', description: 'Design sneakers, boots, or fantasy footwear.' },
  { title: 'Letters With Attitude', description: 'Make each letter of your name have its own style.' },
  { title: 'Under the Sea', description: 'Fish, coral, treasure, submarines—go deep.' },
  { title: 'The Perfect Picnic', description: 'Blankets, food, ants… or maybe a twist?' },
  { title: 'Self-Portrait as a Doodle', description: 'Draw yourself in your doodle style!' },
  { title: 'Doodle a Sound', description: 'What does laughter, wind, or traffic look like?' },
  { title: 'City in the Clouds', description: 'Floating buildings, bridges in the sky, dreamy skylines.' },
  { title: 'Your Favorite Word', description: 'Illustrate it in a creative way—with images, patterns, or color.' },
  { title: 'A Scene from Your Day', description: 'Pick a small moment and doodle it: breakfast, a walk, a nap.' },
]

function getChallengesForDate(dateStr: string): Array<{ title: string; description: string }> {
  const seed = dateStr.split('-').reduce((acc, val) => acc + parseInt(val), 0)
  const shuffled = [...CHALLENGE_TEMPLATES].sort((a, b) => {
    const seedA = (seed * a.title.length) % shuffled.length
    const seedB = (seed * b.title.length) % shuffled.length
    return seedA - seedB
  })
  return shuffled.slice(0, 3)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const authHeader = request.headers.get('authorization')
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'dev_secret'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date } = await request.json()
    const targetDate = date || getChallengeDate()
    const existingChallenges = await supabase
      .from('daily_challenges')
      .select('id')
      .eq('challenge_date', targetDate)

    if (existingChallenges.data?.length) {
      return NextResponse.json({ 
        error: 'Challenges already exist for this date',
        challenges: existingChallenges.data 
      }, { status: 409 })
    }

    const challenges = getChallengesForDate(targetDate)
    const insertedChallenges = []

    for (let i = 0; i < challenges.length; i++) {
      const { data, error } = await supabase
        .from('daily_challenges')
        .insert({
          title: challenges[i].title,
          description: challenges[i].description,
          challenge_date: targetDate,
          slot: i + 1,
        })
        .select()
        .single()

      if (error) {
        console.error(`Failed to insert challenge ${i + 1}:`, error)
        continue
      }

      insertedChallenges.push(data)
    }

    return NextResponse.json({
      success: true,
      date: targetDate,
      challenges: insertedChallenges,
    })
  } catch (error: any) {
    console.error('Challenge generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to generate challenges',
    example: {
      date: '2026-06-19',
    }
  })
}
