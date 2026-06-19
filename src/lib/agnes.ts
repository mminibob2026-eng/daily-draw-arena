const AGNES_API_KEY = process.env.AGNES_API_KEY
const AGNES_BASE_URL = 'https://apihub.agnes-ai.com/v1'

interface EvaluationScores {
  creativity: number
  storytelling: number
  composition: number
  effort: number
  originality: number
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
}

export async function analyzeDrawing(
  imageUrl: string,
  challengeTitle: string,
  challengeDescription: string
): Promise<{ scores: EvaluationScores; finalScore: number }> {
  const response = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AGNES_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'agnes-2.0-flash',
      messages: [
        {
          role: 'system',
          content: `You are an expert art critic analyzing drawings for a daily art challenge.

Return a JSON object with this exact structure:
{
  "creativity": number (1-100),
  "storytelling": number (1-100),
  "composition": number (1-100),
  "effort": number (1-100),
  "originality": number (1-100),
  "strengths": string[],
  "weaknesses": string[],
  "improvements": string[]
}

Be critical but fair. Focus on what makes this artwork unique for the given challenge.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Challenge: "${challengeTitle}"

Description: "${challengeDescription}"

Analyze this drawing. Evaluate creativity, storytelling, composition, effort, and originality. Provide specific strengths, weaknesses, and improvement suggestions.

Return ONLY valid JSON with no additional text.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 2048,
    }),
  })

  if (!response.ok) {
    throw new Error(`Agnes AI analysis failed: ${response.statusText}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  let scores: EvaluationScores
  try {
    const cleanedContent = content.replace(/```json\n?|```\n?/g, '').trim()
    scores = JSON.parse(cleanedContent)
  } catch {
    throw new Error('Failed to parse AI evaluation response')
  }

  const finalScore =
    scores.creativity * 0.25 +
    scores.storytelling * 0.2 +
    scores.composition * 0.2 +
    scores.effort * 0.15 +
    scores.originality * 0.2

  return { scores, finalScore: Math.round(finalScore * 100) / 100 }
}

export async function generateBattleImage(
  challengeTitle: string,
  challengeDescription: string
): Promise<string> {
  const response = await fetch(`${AGNES_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AGNES_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'agnes-image-1.2',
      prompt: `${challengeTitle}: ${challengeDescription}\n\nCreate a detailed, high-quality artwork matching this theme. Style: digital art, detailed, professional quality, masterpiece.`,
      size: '1024x768',
    }),
  })

  if (!response.ok) {
    throw new Error(`Agnes AI image generation failed: ${response.statusText}`)
  }

  const data = await response.json()
  const imageUrl = data.data[0]?.url

  if (!imageUrl) {
    throw new Error('No image URL in generation response')
  }

  return imageUrl
}
