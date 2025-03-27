import { NextRequest, NextResponse } from 'next/server'
import logger from '@/server/config/pino-config'
import { defaultAgent } from '@/server/features/agents'
export const maxDuration = 60

/**
 * POST handler for chat API
 * @param req The incoming request
 * @returns Response from AI agent
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the request body and extract knowledge_base_code
    const { messages, knowledge_base_code, conversation_id } = await req.json()

    
    let responseString = processChatRequest(messages, knowledge_base_code, conversation_id)
    return NextResponse.json({ message: responseString })
  } catch (error) {
    logger.error({ error }, 'Error processing chat request')
    throw error
  }
}


export async function processChatRequest(messages: any[], knowledge_base_code: string, conversation_id: string) {
  // Get the latest user message to use for processing
  try {
    logger.info('Starting processChatRequest')
    logger.info({ messages, knowledge_base_code, conversation_id }, 'Received request parameters')

    if (!knowledge_base_code || !messages || !Array.isArray(messages) || messages.length === 0) {
      logger.error({ knowledge_base_code, messages }, 'Invalid request format')
      throw new Error('Invalid request format: Missing knowledge_base_code or messages')
    }

    logger.info('Validating request parameters passed')
    const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user')
    logger.info({ lastUserMessage }, 'Found last user message')

    if (!lastUserMessage || !lastUserMessage.content) {
      logger.error({ lastUserMessage }, 'No valid user message found')
      throw new Error('Invalid request: No user message found')
    }

    // Extract the user's query
    const query = lastUserMessage.content
    logger.info({ query }, 'Extracted user query')

    // Process the request using the DefaultAgent
    logger.info('Calling defaultAgent.process')
    const response = await defaultAgent.process({
      query,
      previousMessages: messages,
      knowledgeBaseCode: knowledge_base_code,
      conversationId: conversation_id
    })
    logger.info({ response }, 'Received response from defaultAgent')

    return response.message;
  }
  catch (error) {
    logger.error({ error }, 'Error in processChatRequest')
    throw error
  }
}