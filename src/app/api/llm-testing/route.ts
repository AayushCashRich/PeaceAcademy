import { NextRequest, NextResponse } from 'next/server'
import { processChatRequest } from '@/app/api/chat/route'
import logger from '@/server/config/pino-config'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { messages, conversation_id } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: No messages provided' },
        { status: 400 }
      )
    }

    const response = await processChatRequest(messages, 'Peace-Academy', conversation_id)

    return NextResponse.json({ message: response })
  } catch (error) {
    logger.error({ error }, 'Error processing LLM testing request')
    return NextResponse.json(
      { error: 'Failed to process LLM testing request' },
      { status: 500 }
    )
  }
}