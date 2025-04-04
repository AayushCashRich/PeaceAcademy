import {  TextPart, streamText, generateText, generateObject, streamObject } from 'ai'
import logger from '@/server/config/pino-config'
import type { CoreAssistantMessage, CoreSystemMessage, CoreToolMessage, CoreUserMessage, LanguageModelV1, Provider, StreamObjectOnFinishCallback, StreamTextOnFinishCallback, ToolSet, UIMessage } from 'ai'
import type { ZodType } from 'zod'
import { registry } from './providers'
/**
 * Configuration for the AI SDK Wrapper
 */
export interface AIWrapperConfig {
  /** Default model to use */
  modelRegistry: Provider
  /** Maximum number of retry attempts */
  maxRetries?: number
  /** Enable logging */
  enableLogging?: boolean
}

/**
 * Common parameters for all AI SDK methods
 */
interface BaseParams {
  maxTokens?: number
  temperature?: number
  topP?: number
  topK?: number
  presencePenalty?: number
  frequencyPenalty?: number
  seed?: number
  maxRetries?: number
}

/**
 * Parameters for text generation methods
 */
type BaseCompletionParams = BaseParams & {
  system?: string
  prompt?: string
  messages?: Array<CoreSystemMessage | CoreUserMessage | CoreAssistantMessage | CoreToolMessage> | Array<UIMessage>
  tools?: ToolSet
  toolChoice?:"auto" | "none" | "required" | { "type": "tool", "toolName": string }
}

type TextGenerationParams = BaseCompletionParams & {
  onFinish?: StreamTextOnFinishCallback<ToolSet>
}

/**
 * Parameters for object generation methods
 */
type ObjectGenerationParams<T> = BaseCompletionParams & {
  output?: 'object'
  schema: ZodType<T>,
  schemaName?:string
  schemaDescription?:string
  onFinish?:StreamObjectOnFinishCallback<T>
}

/**
 * A wrapper around Vercel's AI SDK that provides fallback functionality
 * when the primary model fails.
 */
export class AISdkWrapper {
  private config: AIWrapperConfig
  
  constructor(config: AIWrapperConfig) {
    this.config = {
      maxRetries: 1,
      enableLogging: true,
      ...config
    }
  }

  /**
   * Logs information using the application logger if logging is enabled
   */
  private log(message: string, data?: Record<string, unknown>): void {
    if (this.config.enableLogging) {
      logger.info({ ...data, component: 'AIWrapper' }, message)
    }
  }
  
  /**
   * Logs error information
   */
  private logError(message: string, error: unknown): void {
    if (this.config.enableLogging) {
      logger.error({ error, component: 'AIWrapper' }, message)
    }
  }

  /**
   * Handles errors from AI model calls and determines if a retry is needed
   */
  private shouldRetry(error: Error | unknown): boolean {
    // Check for common error patterns that would suggest retrying
    const retryableErrors = [
      'rate limit',
      'timeout',
      'overloaded',
      'capacity',
      'unavailable',
      'try again',
      'too many requests',
      '429',
      '503',
      '504'
    ]
    
    const errorString = error?.toString().toLowerCase() || ''
    return retryableErrors.some(e => errorString.includes(e))
  }
  
  /**
   * Gets an OpenAI model instance with the specified name
   */
  private getModel(attempts: number): LanguageModelV1 {
    if (attempts > 1) {
        return this.config.modelRegistry.languageModel("availableModels:fallback-model")
    }
    return this.config.modelRegistry.languageModel("availableModels:primary-model")
  }

  /**
   * Generates text with the AI model, falling back to the secondary model if needed
   */
  async generateText(params: TextGenerationParams): Promise<any> {
    let attempts = 0
    const maxAttempts = (this.config.maxRetries || 0) + 1

    while (attempts < maxAttempts) {
      attempts++
      const model = this.getModel(attempts)
      try {
        this.log('Generating text', { model: model.modelId })
        const result = await generateText({
          ...params,
          model: model,
          maxSteps: 10
        })
        logger.info({ result }, 'Generated text Function')
        // Return the text from the response

        // if (result.response.messages[0]?.content[0]) {
        //   return (result.response.messages[0].content[0] as TextPart).text as string
        // }
        // return 'Hi'
        return result.response.messages;
      } catch (error) {
        this.logError(`Error generating text with model ${model.modelId}`, error)
        
        if (attempts < maxAttempts && this.shouldRetry(error)) {
          this.log(`Retrying with fallback model`, { fallbackModel: model.modelId })
        } else {
          throw error
        }
      }
    }

    // This should never be reached due to the throw in the catch block
    throw new Error('Failed to generate text after exhausting all retry attempts')
  }

  /**
   * Streams text from the AI model, falling back to the secondary model if needed
   */
  streamText(params: TextGenerationParams) {
    let attempts = 0
    const maxAttempts = (this.config.maxRetries || 0) + 1

    while (attempts < maxAttempts) {
      attempts++
      const model = this.getModel(attempts)
      try {
        this.log('Streaming text', { model: model.modelId })
        const result = streamText({
          ...params,
          model: model
        })
        return result
      } catch (error) {
        this.logError(`Error streaming text with model ${model.modelId}`, error)
        
        if (attempts < maxAttempts && this.shouldRetry(error)) {
          this.log(`Retrying with fallback model`, { fallbackModel: model.modelId })
        } else {
          throw error
        }
      }
    }

    // This should never be reached due to the throw in the catch block
    throw new Error('Failed to stream text after exhausting all retry attempts')
  }

  /**
   * Generates a structured object with the AI model, falling back to the secondary model if needed
   */
  async generateObject<T>(
    params: ObjectGenerationParams<T>
  ): Promise<{ object: T }> {

    let attempts = 0
    const maxAttempts = (this.config.maxRetries || 0) + 1

    while (attempts < maxAttempts) {
      attempts++
      const model = this.getModel(attempts)
      try {
        this.log('Generating object', { model: model.modelId })
        const result = await generateObject<T>({
          ...params,
          model: model
        })
        return result
      } catch (error) {
        this.logError(`Error generating object with model ${model.modelId}`, error)
        
        if (attempts < maxAttempts && this.shouldRetry(error)) {
          this.log(`Retrying with fallback model`, { fallbackModel: model.modelId })
        } else {
          throw error
        }
      }
    }

    // This should never be reached due to the throw in the catch block
    throw new Error('Failed to generate object after exhausting all retry attempts')
  }

  /**
   * Streams a structured object from the AI model, falling back to the secondary model if needed
   */
  streamObject<T>(
    params: ObjectGenerationParams<T>
  ) {

    let attempts = 0
    const maxAttempts = (this.config.maxRetries || 0) + 1

    while (attempts < maxAttempts) {
      attempts++
      const model = this.getModel(attempts)
      try {
        this.log('Streaming object', { model: model.modelId })
        const result = streamObject<T>({
          ...params, 
          model: model
        })
        return result
      } catch (error) {
        this.logError(`Error streaming object with model ${model.modelId}`, error)
        
        if (attempts < maxAttempts && this.shouldRetry(error)) {
          this.log(`Retrying with fallback model`, { fallbackModel: model.modelId })
        } else {
          throw error
        }
      }
    }

    // This should never be reached due to the throw in the catch block
    throw new Error('Failed to stream object after exhausting all retry attempts')
  }
}

export const defaultAiSdkWrapper = new AISdkWrapper({
  modelRegistry: registry
})