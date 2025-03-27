# Database Schema

This document outlines the database schema used in the AI Project. The application uses MongoDB as its primary database.

## Database Collections

The system uses several collections to store and manage data:

1. `knowledge_bases`
2. `knowledge_documents`
3. `knowledge_document_embeddings`
4. `conversations`

## Schema Definitions

### Knowledge Bases Collection

The `knowledge_bases` collection stores information about each knowledge base in the system.

```typescript
interface KnowledgeBase {
  _id: ObjectId
  code: string                // Unique identifier for the knowledge base
  name: string                // Human-readable name
  description: string         // Detailed description
  created_at: Date            // Creation timestamp
  updated_at: Date            // Last update timestamp
}
```

#### Indexes:
- `code`: Unique index for fast lookup

### Knowledge Documents Collection

The `knowledge_documents` collection stores metadata about uploaded documents.

```typescript
interface KnowledgeDocument {
  _id: ObjectId
  knowledge_base_code: string  // Foreign key to knowledge_bases.code
  file_name: string            // Original filename of uploaded document
  file_type: string            // MIME type or file extension
  s3_url: string               // Location in S3 storage
  file_size_bytes: number      // Size of file in bytes
  status: 'processing' | 'processed' | 'failed'  // Processing status
  error_message?: string       // Error message if processing failed
  processed_at?: Date          // When processing completed
  uploaded_at: Date            // When document was uploaded
  updated_at: Date             // Last update timestamp
  metadata?: {                 // Optional additional metadata
    title?: string             // Document title
    author?: string            // Document author
    pages?: number             // Number of pages
    published_date?: string    // Publication date
    [key: string]: any         // Other custom metadata
  }
}
```

#### Indexes:
- `knowledge_base_code`: For finding all documents in a knowledge base
- `status`: For finding documents by processing status
- `uploaded_at`: For sorting by upload date

### Knowledge Document Embeddings Collection

The `knowledge_document_embeddings` collection stores vector embeddings for document chunks.

```typescript
interface KnowledgeDocumentEmbedding {
  _id: ObjectId
  knowledge_base_code: string  // Foreign key to knowledge_bases.code
  document_id: ObjectId        // Foreign key to knowledge_documents._id
  chunk_index: number          // Position in document
  chunk_text: string           // The actual text content
  embedding: number[]          // Vector embedding of the chunk
  created_at: Date             // Creation timestamp
  updated_at: Date             // Last update timestamp
  metadata?: {                 // Optional additional metadata
    page_number?: number       // Page number in source document
    heading?: string           // Section heading
    importance_score?: number  // Calculated importance of this chunk
    [key: string]: any         // Other custom metadata
  }
}
```

#### Indexes:
- `document_id`: For finding all chunks of a document
- `knowledge_base_code`: For finding all embeddings in a knowledge base
- Vector index on `embedding`: For similarity search (implementation depends on MongoDB version)

### Conversations Collection

The `conversations` collection stores chat conversations.

```typescript
interface Conversation {
  _id: ObjectId
  conversation_id: string      // UUID for the conversation
  knowledge_base_code: string  // Foreign key to knowledge_bases.code
  messages: Array<{
    role: 'user' | 'assistant' | 'system'  // Message sender
    content: string            // Message content
    created_at: Date           // Message timestamp
    metadata?: {               // Optional metadata about the message
      intent_type?: string     // Classified intent
      knowledge_source?: string // Source of knowledge
      has_relevant_information?: boolean // Whether relevant info was found
      [key: string]: any       // Other custom metadata
    }
  }>
  created_at: Date             // Conversation start timestamp
  updated_at: Date             // Last message timestamp
  expired: boolean             // Whether conversation has expired
  expiry_date?: Date           // When conversation will expire
}
```

#### Indexes:
- `conversation_id`: Unique index for fast lookup
- `knowledge_base_code`: For finding all conversations for a knowledge base
- `created_at`: For sorting by creation date
- `updated_at`: For sorting by last activity
- `expiry_date`: For cleanup of expired conversations

## Relationships

1. **KnowledgeBase to KnowledgeDocument**: One-to-many relationship through `knowledge_base_code`
2. **KnowledgeDocument to KnowledgeDocumentEmbedding**: One-to-many relationship through `document_id`
3. **KnowledgeBase to Conversation**: One-to-many relationship through `knowledge_base_code`

## Schema Design Considerations

1. **Denormalization**: Some data is denormalized for performance, such as including `knowledge_base_code` in both the document and embedding collections
2. **Scalability**: Indexes are designed to support efficient queries even with large data volumes
3. **Flexibility**: Schema includes optional metadata fields to accommodate future extensions
4. **Data Integrity**: References between collections are maintained through consistent field names
5. **Performance**: Embeddings are stored in a format optimized for vector similarity search

## Example Queries

### Find All Documents in a Knowledge Base

```typescript
const documents = await knowledgeDocumentsCollection.find({ 
  knowledge_base_code: "IFTA-2025" 
}).toArray()
```

### Find Relevant Document Chunks Using Vector Search

```typescript
const relevantChunks = await knowledgeDocumentEmbeddingsCollection.aggregate([
  {
    $vectorSearch: {
      index: "embedding_index",
      path: "embedding",
      queryVector: queryEmbedding,
      numCandidates: 100,
      limit: 5
    }
  },
  {
    $match: {
      knowledge_base_code: "IFTA-2025"
    }
  }
]).toArray()
```

### Get Conversation History

```typescript
const conversation = await conversationsCollection.findOne({ 
  conversation_id: "123e4567-e89b-12d3-a456-426614174000" 
})
```

### Add Message to Conversation

```typescript
await conversationsCollection.updateOne(
  { conversation_id: "123e4567-e89b-12d3-a456-426614174000" },
  { 
    $push: { 
      messages: {
        role: "assistant",
        content: "Hello, how can I help you?",
        created_at: new Date()
      } 
    },
    $set: { updated_at: new Date() }
  }
)
```
