import { NextRequest, NextResponse } from 'next/server'
import { conversationService } from '@/server/features/conversations/db/conversation-service'
import logger from '@/server/config/pino-config'

/**
 * GET handler for retrieving a conversation by ID
 * Gets the conversation ID from the URL path parameter
 */
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const conversationId = (await params).conversationId
  
  try {
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversation ID' },
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
    logger.info({ conversationId }, 'Retrieved conversation by ID')
    return NextResponse.json(conversation)
  } catch (error) {
    logger.error({ error, conversationId }, 'Error retrieving conversation')
    return NextResponse.json(
      { error: 'Failed to retrieve conversation' },
      { status: 500 }
    )
  }
}
