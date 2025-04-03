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

    // Fetch previous messages from Chatwoot API
    try {
      const chatwootMessagesResponse = await axios.get(
        `https://app.chatwoot.com/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
        {
          headers: {
            'api_access_token': CHATWOOT_API_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info({ messageCount: chatwootMessagesResponse.data.length }, "Retrieved previous messages from Chatwoot")
      
      // Convert Chatwoot messages to the format expected by the AI model
      const previousMessages = chatwootMessagesResponse.data.payload
        .filter((msg: any) => {
          // Filter out messages with no content and private messages
          return msg.content && !msg.private;
        })
        .map((msg: any) => ({
          role: msg.message_type === 0 ? 'user' : 'assistant', // 0 is incoming (user), 1 is outgoing (assistant)
          content: msg.content,
          created_at: msg.created_at // Optionally keep timestamp for chronological ordering
        }))
        .sort((a: any, b: any) => a.created_at - b.created_at) // Sort by timestamp
        .map(({ role, content }: { role: string; content: string }) => ({ role, content })) // Remove timestamp after sorting
        .slice(-10); // Only include the last 10 messages for context
      
      // Add the current message
      const messages = [
        ...previousMessages,
        {
          role: 'user',
          content: messageContent
        }
      ];
      
      logger.info({ 
        messageCount: messages.length,
        firstMessage: messages[0]?.content?.substring(0, 100),
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 100)
      }, "Prepared messages with conversation history")
      
      logger.info({ messages: JSON.stringify(messages) }, "Messages with conversation history")
      // Process the request using DefaultAgent with conversation history
      const response = await processChatRequest(messages, 'Peace-Academy', conversationId)
      
     
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
      logger.error({ error }, 'Error fetching previous messages from Chatwoot')
      // Continue with just the current message if we can't fetch history
      const messages = [
        {
          role: 'user',
          content: messageContent
        }
      ];
      
      // Process the request using DefaultAgent
      const response = await processChatRequest(messages, 'Peace-Academy', conversationId)
      
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

      logger.info({ chatwootResponse: chatwootResponse.data }, "Sent response back to Chatwoot (without history)")

      return NextResponse.json({
        success: true,
        chatwoot_response: chatwootResponse.data
      })
    }

  } catch (error) {
    logger.error({ error }, 'Error processing webhook chat request')
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
} 