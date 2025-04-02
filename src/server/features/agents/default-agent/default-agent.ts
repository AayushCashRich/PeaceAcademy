import logger from '@/server/config/pino-config'
import { ChatIntentType, IntentClassifierService } from '@/server/features/agents/default-agent/intent-classifier'
import { TicketCreationHandlerService } from '@/server/features/agents/default-agent/ticket-creation-handler'
import { AISdkWrapper } from '@/server/llm/ai-sdk-wrapper'
import { AIAgent, AgentRequest, AgentResponse } from '../interfaces'
import { SmallTalkHandlerService } from './small-talk-handler'
import { TransactionHandlerService } from './transaction-handler'
import { DefaultLiveAgentHandoffService } from './live-agent-handler'
import { KnowledgeHandlerService } from './knowledge-handler'

// Define message interface to match expected types
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  id?: string
  metadata?: Record<string, unknown>
}

/**
 * DefaultAgent implements the AIAgent interface to process chat interactions
 */
export class DefaultAgent implements AIAgent<AgentRequest, AgentResponse> {
  intentClassifier:IntentClassifierService
  transactionHandler:TransactionHandlerService
  liveAgentHandoffService:DefaultLiveAgentHandoffService
  knowledgeHandler:KnowledgeHandlerService
  ticketCreationHandler:TicketCreationHandlerService
  smallTalkHandler:SmallTalkHandlerService
  aiSdkWrapper:AISdkWrapper

  constructor(intentClassifierService:IntentClassifierService, 
    transactionHandler:TransactionHandlerService,
     liveAgentHandoffService:DefaultLiveAgentHandoffService,
      knowledgeHandler:KnowledgeHandlerService,
       ticketCreationHandler:TicketCreationHandlerService,
       smallTalkHandler:SmallTalkHandlerService,
         aiSdkWrapper:AISdkWrapper){
    this.intentClassifier = intentClassifierService
    this.transactionHandler = transactionHandler
    this.liveAgentHandoffService = liveAgentHandoffService
    this.knowledgeHandler = knowledgeHandler
    this.ticketCreationHandler = ticketCreationHandler
    this.smallTalkHandler = smallTalkHandler
    this.aiSdkWrapper = aiSdkWrapper

  }
  /**
   * Process an agent request and produce a response
   * @param request The agent request to process
   * @returns Promise resolving to an agent response
   */
  async process(request: AgentRequest): Promise<AgentResponse> {
    try {
      const { query, previousMessages, knowledgeBaseCode, conversationId } = request
      
      // Validate required fields
      if (!knowledgeBaseCode || !query) {
        throw new Error('Invalid request format: Missing knowledgeBaseCode or query')
      }
      
      // Convert previous messages to ChatMessage format if needed
      const messages = previousMessages as ChatMessage[]
      
      logger.info(
        { knowledgeBaseCode, queryPreview: query.substring(0, 50) },
        'Processing chat request'
      )
      
      // Step 1: Classify the user's intent
      const intentClassification = await this.intentClassifier.classifyIntent(query, messages)
      logger.info(
        { intent: intentClassification.intentType },
        'Intent classification completed'
      )
      
      // Create the response object which will be modified by the handlers
      let responseObj: AgentResponse
      
      // Step 2: Route based on the classified intent
      switch (intentClassification.intentType) {
        case ChatIntentType.AGENT_REQUEST:
          // Priority 1: Hand over to a human agent
          responseObj = await this.liveAgentHandoffService.handoverToAgent(request)
          break
          
        // case ChatIntentType.TRANSACTION:
        //   // Priority 2: Process transaction
        //   responseObj = await this.transactionHandler.processTransaction(request)
        //   break
          
        // case ChatIntentType.TICKET_CREATION:
        //   // Priority 3: Handle ticket creation requests
        //   responseObj = await this.ticketCreationHandler.processTicketCreation(request)
        //   break
          
        // case ChatIntentType.FAQ:
        //   // Priority 4: Answer using knowledge base
        //   responseObj = await this.knowledgeHandler.handleKnowledgeQuery(request)
        //   break
          
        case ChatIntentType.SMALL_TALK:
          // Priority 5: Handle casual conversation
          responseObj = await this.smallTalkHandler.handleSmallTalk(request)
          break
          
        default:
          // Fallback: Use knowledge base as default
          responseObj = await this.knowledgeHandler.handleKnowledgeQuery(request)
          break
      }
      
      return responseObj
    } catch (error) {
      logger.error({ error }, 'Error processing chat request')
      throw error
    }
  }
}
