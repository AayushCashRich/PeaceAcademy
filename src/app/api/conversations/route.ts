import { NextRequest, NextResponse } from 'next/server'
import { conversationService } from '@/server/features/conversations/db/conversation-service'
import logger from '@/server/config/pino-config'

/**
 * GET handler for retrieving a conversation by ID
 * Checks the request for a conversation_id parameter
 */
export async function GET(req: NextRequest) {
  try {
    // Get the conversation ID from query parameters
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversation_id')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversation_id parameter' },
        { status: 400 }
      )
    }

    // Retrieve the conversation
    const conversation = await conversationService.getConversation(conversationId)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Return the conversation with a 200 status code
    return NextResponse.json(conversation)
  } catch (error) {
    logger.error({ error }, 'Error retrieving conversation')
    return NextResponse.json(
      { error: 'Failed to retrieve conversation' },
      { status: 500 }
    )
  }
}
