# API Specification

This document outlines the key API endpoints available in the AI Project system.

## Chat API

### Post a Chat Message

Processes a user's message and returns a response from the AI agent.

**Endpoint:** `POST /api/chat`

**Request Body:**
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, unknown>
  }>,
  knowledge_base_code: string,
  conversation_id?: string
}
```

**Response:**
```typescript
{
  message: string,
  metadata?: Record<string, unknown>
}
```

**Description:**
- Handles user chat messages and routes them to the appropriate agent for processing
- If no conversation_id is provided, a new conversation will be created
- The agent analyzes intent and generates appropriate responses based on knowledge base content
- Various response types are possible depending on intent classification

**Example Request:**
```json
{
  "messages": [
    {"role": "user", "content": "How do I file my IFTA tax return?"}
  ],
  "knowledge_base_code": "IFTA-2025"
}
```

**Example Response:**
```json
{
  "message": "To file your IFTA tax return, you need to follow these steps: 1) Gather your mileage and fuel records for all jurisdictions...",
  "metadata": {
    "intentType": "FAQ",
    "knowledgeSource": "vector_search",
    "hasRelevantInformation": true
  }
}
```

## Knowledge Base Administration APIs

### List Knowledge Bases

Retrieves all available knowledge bases.

**Endpoint:** `GET /api/admin/knowledge-bases`

**Response:**
```typescript
{
  knowledge_bases: Array<{
    code: string,
    name: string,
    description: string,
    created_at: string,
    updated_at: string
  }>
}
```

### Create Knowledge Base

Creates a new knowledge base.

**Endpoint:** `POST /api/admin/knowledge-bases`

**Request Body:**
```typescript
{
  code: string,
  name: string,
  description: string
}
```

**Response:**
```typescript
{
  knowledge_base: {
    code: string,
    name: string,
    description: string,
    created_at: string
  }
}
```

## Knowledge Document APIs

### List Knowledge Documents

Retrieves all documents for a specific knowledge base.

**Endpoint:** `GET /api/admin/knowledge-docs?knowledge_base_code=<code>`

**Response:**
```typescript
{
  documents: Array<{
    id: string,
    knowledge_base_code: string,
    file_name: string,
    s3_url: string,
    status: 'processing' | 'processed' | 'failed',
    uploaded_at: string,
    updated_at: string
  }>
}
```

### Upload Knowledge Document

Uploads a new document to a knowledge base.

**Endpoint:** `POST /api/admin/knowledge-docs`

**Request:**
- Multi-part form data with:
  - `file`: The document file (PDF, etc.)
  - `knowledge_base_code`: String

**Response:**
```typescript
{
  document: {
    id: string,
    knowledge_base_code: string,
    file_name: string,
    s3_url: string,
    status: 'processing',
    uploaded_at: string
  }
}
```

**Description:**
- After upload, the document is processed asynchronously:
  1. Text extraction from the document
  2. Chunking into logical sections
  3. Embedding generation for each chunk
  4. Storage in the vector database
- Status updates can be tracked via GET requests to the documents endpoint

### Delete Knowledge Document

Removes a document from a knowledge base.

**Endpoint:** `DELETE /api/admin/knowledge-docs/:id`

**Response:**
```typescript
{
  success: true,
  message: "Document successfully deleted"
}
```

## Conversation APIs

### Get Conversation History

Retrieves the full conversation history for a specific conversation ID.

**Endpoint:** `GET /api/conversations/:conversation_id`

**Response:**
```typescript
{
  conversation_id: string,
  knowledge_base_code: string,
  messages: Array<{
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, unknown>,
    created_at: string
  }>,
  created_at: string,
  updated_at: string
}
```

### List Conversations

Retrieves all conversations for a specific knowledge base.

**Endpoint:** `GET /api/conversations?knowledge_base_code=<code>`

**Response:**
```typescript
{
  conversations: Array<{
    conversation_id: string,
    knowledge_base_code: string,
    message_count: number,
    created_at: string,
    updated_at: string
  }>
}
```

## Error Handling

All API endpoints follow consistent error handling patterns:

**Error Response Format:**
```typescript
{
  error: string,
  details?: any
}
```

**Common HTTP Status Codes:**
- 200: Success
- 400: Bad Request (invalid parameters)
- 401: Unauthorized
- 403: Forbidden
- 404: Resource Not Found
- 500: Internal Server Error

## Authentication

Most administrative endpoints require authentication. Authentication is handled using:

1. JWT tokens with appropriate scopes
2. API keys for service-to-service communication

Authentication details should be included in the request header:
- `Authorization: Bearer <token>` for JWT
- `X-API-Key: <api-key>` for API key authentication
