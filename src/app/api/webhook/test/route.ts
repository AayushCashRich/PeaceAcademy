import { NextRequest, NextResponse } from 'next/server'
import logger from '@/server/config/pino-config'
import { defaultAgent } from '@/server/features/agents'
import axios from 'axios'
import { processChatRequest } from '@/app/api/chat/route'

const CHATWOOT_API_TOKEN = process.env.CHATWOOT_API_TOKEN

/**
 * GET handler for retrieving a conversation by ID
 * Gets the conversation ID from the URL path parameter
 */
export async function POST(req: NextRequest) {
  try {
    const body  = await req.json()
    logger.info({ body }, "Received webhook payload")
    if(body.message_type === 'outgoing' || body.conversation.status === 'open'){
      return NextResponse.json({
        success: true,
        chatwoot_response: "Outgoing message"
      })
    }

    // Extract the message content from the Chatwoot webhook payload
    const messageContent = body.content
    const conversationId = body.conversation.id
    const accountId = body.account.id
    const url = body.conversation.additional_attributes.referer; // Ensure correct path to referer
    const baseUrl = new URL(url).origin;

    logger.info({ baseUrl }, "Extracted base URL")

    if (!messageContent) {
      logger.error('No message content found in webhook payload')
      return NextResponse.json(
        { error: 'No message content found in webhook payload' },
        { status: 400 }
      )
    }

    logger.info({ messageContent, conversationId }, "Extracted message content and conversation ID")

    const messages = [
      {
        role: 'user',
        content: messageContent
      }
    ]

    // Process the request using DefaultAgent
    const response = await processChatRequest(messages,'Peace-Academy', conversationId)
    
    console.log(conversationId)
     
    // Send response back to Chatwoot
    const chatwootResponse = await axios.post(
      `https://app.chatwoot.com/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
      {
        content: response,
        message_type: 'outgoing',
        private: false,
        content_type: 'text'
      },
      {
        headers: {
          'api_access_token': CHATWOOT_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    )

    logger.info({ chatwootResponse: chatwootResponse.data }, "Sent response back to Chatwoot")

    return NextResponse.json({
      success: true,
      chatwoot_response: chatwootResponse.data
    })

  } catch (error) {
    logger.error({ error }, 'Error processing webhook chat request')
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
} 