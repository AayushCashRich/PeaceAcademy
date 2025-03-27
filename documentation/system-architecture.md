# System Architecture

This document provides an overview of the AI Project's architecture, including code organization, design principles, and common use cases.

## Architecture Overview

The AI Project is built as a modern web application with a Next.js frontend, TypeScript across the stack, and a MongoDB database. The architecture follows Domain-Driven Design principles with clear separation of concerns.

![System Architecture Diagram](../public/system-architecture.png)

## Code Organization

The codebase is organized following a feature-based structure:

```
src/
├── app/                       # Next.js app router pages
│   ├── api/                   # API routes
│   │   ├── admin/             # Administrative endpoints
│   │   ├── chat/              # Chat endpoint
│   │   └── conversations/     # Conversation management endpoints
│   └── [knowledgeBaseCode]/   # Dynamic routes based on knowledge base
│       └── chat/              # Chat interface for specific knowledge base
├── server/                    # Server-side code
│   ├── config/                # Configuration settings
│   ├── features/              # Domain features
│   │   ├── agents/            # Agent implementation
│   │   │   ├── capabilities/  # Agent capabilities
│   │   │   ├── default-agent/ # Default agent implementation
│   │   │   └── interfaces.ts  # Agent interfaces
│   │   ├── chunk-extractor/   # Document chunking logic
│   │   ├── conversations/     # Conversation management
│   │   ├── knowledge-docs/    # Knowledge document management
│   │   └── knowledge-doc-embeddings/ # Embedding generation and search
│   └── llm/                   # LLM service wrappers
└── components/                # Shared UI components
```

## Key Design Principles

The system follows several key design principles:

1. **Domain-Driven Design**: The codebase is organized around business domains rather than technical concerns.

2. **Interface-First Development**: Key components are defined by interfaces, allowing for multiple implementations.

3. **Dependency Inversion**: High-level modules depend on abstractions, not concrete implementations.

4. **Composition Over Inheritance**: Agent capabilities are composed rather than inherited.

5. **Single Responsibility Principle**: Each class and module has a single responsibility.

6. **TypeScript Throughout**: Strong typing is used across the codebase to ensure type safety.

## Core Components

### 1. Agent System

The Agent system is based on a clean interface that allows for multiple implementations:

```typescript
interface AIAgent {
  process(request: AgentRequest): Promise<AgentResponse>
}
```

The DefaultAgent implementation provides capabilities like:
- Intent classification
- Knowledge retrieval
- Transaction handling
- Ticket creation
- Live agent handoff

Location: `/src/server/features/agents/`

### 2. Knowledge Document System

The Knowledge Document system handles:
- Document storage in S3
- Document metadata in MongoDB
- Document processing and chunking

Location: `/src/server/features/knowledge-docs/`

### 3. Embedding System

The Embedding system manages:
- Generating embeddings from document chunks
- Storing embeddings in MongoDB
- Performing vector similarity search

Location: `/src/server/features/knowledge-doc-embeddings/`

### 4. Conversation Management

The Conversation system handles:
- Creating and retrieving conversations
- Adding messages to conversations
- Tracking conversation metadata

Location: `/src/server/features/conversations/`

### 5. AI SDK Wrapper

A wrapper around the Vercel AI SDK that provides:
- Fallback capabilities between models
- Retry mechanisms
- Consistent logging
- Error handling

Location: `/src/server/llm/ai-sdk-wrapper.ts`

## Common Use Cases

### 1. Creating a New Knowledge Base

```typescript
// Client makes an API call
const response = await fetch('/api/admin/knowledge-bases', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'TAX-2025',
    name: 'Tax Guidelines 2025',
    description: 'Official tax guidelines for the year 2025'
  })
})
```

The system creates a new knowledge base entry in the database, which can then be populated with documents.

### 2. Uploading a Document to a Knowledge Base

```typescript
// Client code
const formData = new FormData()
formData.append('file', documentFile)
formData.append('knowledge_base_code', 'TAX-2025')

const response = await fetch('/api/admin/knowledge-docs', {
  method: 'POST',
  body: formData
})
```

The server:
1. Uploads the file to S3
2. Creates a database entry for the document
3. Processes the document to extract text
4. Chunks the text into manageable segments
5. Generates embeddings for each chunk
6. Stores the embeddings in the database

### 3. User Asking a Question

```typescript
// Client code
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'How do I file my taxes?' }],
    knowledge_base_code: 'TAX-2025',
    conversation_id: conversationId
  })
})
```

The server:
1. Routes the request to the DefaultAgent
2. Classifies the intent of the message
3. Retrieves relevant knowledge using vector search
4. Generates a response using the AI model
5. Stores the conversation in the database
6. Returns the response to the client

### 4. Extending with a Custom Agent

To create a custom agent:

1. Implement the AIAgent interface:

```typescript
class CustomAgent implements AIAgent {
  async process(request: AgentRequest): Promise<AgentResponse> {
    // Custom implementation logic
    return {
      message: "Custom response",
      metadata: { /* custom metadata */ }
    }
  }
}
```

2. Register the agent for use:

```typescript
// Create instance with dependencies
const customAgent = new CustomAgent(dependencies)

// Use it in a route
app.post('/api/custom-chat', async (req, res) => {
  const response = await customAgent.process(req.body)
  return res.json(response)
})
```

## Performance Considerations

1. **Embedding Storage**: Embeddings are stored in a format optimized for vector similarity search

2. **Caching**: Frequently accessed data is cached to improve performance

3. **Document Processing**: Large documents are processed asynchronously to avoid blocking

4. **Rate Limiting**: API endpoints implement rate limiting to prevent abuse

5. **Connection Pooling**: Database connections are pooled for efficient resource usage

## Security Considerations

1. **Authentication**: Administrative endpoints require authentication

2. **Authorization**: Access to knowledge bases is controlled by permissions

3. **Input Validation**: All user inputs are validated before processing

4. **Content Filtering**: AI responses are filtered for inappropriate content

5. **Encryption**: Sensitive data is encrypted in transit and at rest

## Monitoring and Logging

The system implements comprehensive logging through the Pino logger:

```typescript
import logger from '@/server/config/pino-config'

// Usage
logger.info({ conversationId }, 'Processing chat request')
logger.error({ error }, 'Error handling knowledge query')
```

Key metrics tracked include:
- API request counts and response times
- Document processing times
- Embedding generation performance
- LLM response times
- Error rates

## Extending the System

The system is designed for extensibility in several ways:

1. **New Agent Capabilities**: Add new capabilities by implementing and composing with existing ones

2. **Custom Document Processors**: Extend document processing for new file types

3. **Alternative Embedding Providers**: Replace OpenAI embeddings with alternatives

4. **Custom Response Formats**: Modify response formats for specific use cases

5. **Integration with External Systems**: Connect to external data sources or services
