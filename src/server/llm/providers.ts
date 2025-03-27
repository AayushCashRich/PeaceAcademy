import { openai as originalOpenAI } from '@ai-sdk/openai';
import { customProvider } from 'ai';
import { anthropic as originalAnthropic } from '@ai-sdk/anthropic';
import { experimental_createProviderRegistry as createProviderRegistry } from 'ai';


// custom provider with different model settings:
export const availableModels = customProvider({
  languageModels: {
    // replacement model with custom settings:
    'primary-model': originalOpenAI(process.env.PRIMARY_LLM_OPENAI_MODEL_NAME || 'gpt-4o-mini'),
    'fallback-model': originalAnthropic(process.env.FALLBACK_LLM_ANTHROPIC_MODEL_NAME || 'claude-3-5-sonnet'),
  },
  fallbackProvider: originalOpenAI,
});


export const registry = createProviderRegistry({
  // register provider with prefix and default setup:
  availableModels,
});