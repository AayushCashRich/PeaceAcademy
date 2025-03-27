import { DefaultAgent } from './default-agent/default-agent'
import { intentClassifier } from './default-agent/intent-classifier'
import {  TicketCreationHandlerService } from './default-agent/ticket-creation-handler'
import { transactionHandler } from './default-agent/transaction-handler'
import { knowledgeHandler } from './default-agent/knowledge-handler'
import { TicketPlatform } from './capabilities/ticketing/ticket-factory-service'
import { defaultAiSdkWrapper } from '@/server/llm/ai-sdk-wrapper'
import { DefaultLiveAgentHandoffService } from './default-agent/live-agent-handler'
import { SmallTalkHandlerService } from './default-agent/small-talk-handler'

/**
 * Default instance of the AI agent
 */
export const defaultAgent = new DefaultAgent(intentClassifier,
    transactionHandler, 
    new DefaultLiveAgentHandoffService(),
    knowledgeHandler,
    new TicketCreationHandlerService(TicketPlatform.FRESHDESK), 
    new SmallTalkHandlerService(), 
    defaultAiSdkWrapper)

// Export interfaces
export * from './interfaces'
