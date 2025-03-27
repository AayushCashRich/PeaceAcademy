# AI Project Domain Concepts

This document outlines the core domain concepts that form the foundation of the AI Project system. Understanding these concepts is essential for developers and stakeholders who wish to work with or extend the system.

## Core Domain Concepts

The system is built around four major domain concepts:

1. KnowledgeBase
2. KnowledgeDocument
3. KnowledgeDocumentEmbeddings
4. Agent

Each of these concepts plays a critical role in enabling the AI-powered knowledge retrieval and conversational capabilities of the system.

## 1. KnowledgeBase

A KnowledgeBase is an aggregate that represents a logical collection of knowledge documents. It serves as the foundational unit of organized information.

### Entity Properties

- **code**: A unique identifier used to reference this knowledge base
- **name**: Human-readable name for the knowledge base
- **description**: Detailed description of the knowledge base's purpose and contents

### Relationships

- A KnowledgeBase contains many KnowledgeDocuments

### Persistence

- Stored in MongoDB (in the `knowledge_bases` collection)
- Documents are stored under the corresponding KnowledgeBaseCode folder in S3

### Business Rules

- A KnowledgeBase must have a unique code
- Documents added to the KnowledgeBase are always tied to this code

## 2. KnowledgeDocument

Also referred to as: Document, KnowledgeDoc

A KnowledgeDocument represents a single piece of content (e.g., PDF, text file) that contributes to a KnowledgeBase.

### Entity Properties

- **id**: Unique identifier for the document
- **knowledge_base_code**: The code of the parent KnowledgeBase
- **file_name**: Original name of the uploaded file
- **s3_url**: Location of the file in S3 storage
- **status**: Current processing status of the document
- **uploaded_at**: Timestamp of when the document was uploaded
- Additional metadata as needed

### Storage

- Files are uploaded and stored in S3, under a folder named after the parent KnowledgeBase code

### Behavior

- After upload, the document is processed to extract text and generate embeddings
- Documents undergo chunking to break them into manageable pieces for embedding generation

## 3. KnowledgeDocumentEmbeddings

Also referred to as: Embeddings

Embeddings represent the semantic meaning of a document in vector form, enabling efficient retrieval and similarity matching.

### Purpose

- Enable the agent to search for and reason over relevant knowledge from documents
- Power semantic search capabilities across the knowledge base

### Storage

- Persisted in MongoDB (one document can have multiple chunks, each with its own embedding)
- Embeddings are high-dimensional vectors that capture semantic meaning

### Generation

- Generated using OpenAI Embedding APIs
- Created as part of the document ingestion/upload API process

### Relationship

- Each embedding is tied to a specific chunk of a KnowledgeDocument
- Embeddings maintain a reference to their source document

## 4. Agent

Also referred to as: Virtual Assistant

An Agent is a service-like domain object responsible for handling user conversations and generating appropriate responses.

### Interface

- Primary method: `respond(query, messages, knowledge_base_code) → message`
- Takes user queries and conversation context to produce relevant responses

### Current Capabilities of Default Agent

- Intent detection (identifying what the user is asking for)
- Knowledge-based query resolution (via embeddings)
- Ticket creation for issues that require human attention
- Transactional logic for handling structured operations
- Handoff to a live agent when necessary

### Design

- A default agent implementation is provided out of the box
- Developers can extend the Agent interface to:
  - Compose with existing capabilities
  - Add new custom logic (e.g., domain-specific workflows)
  - Route logic conditionally based on request parameters

### Extensibility

- Designed for easy extension and composition using DDD principles
- Supports strategy and decorator patterns for customization
- New agent types can be created to handle specific knowledge bases or use cases

## Relationships Between Concepts

- **KnowledgeBase** contains many **KnowledgeDocuments**
- **KnowledgeDocuments** are processed to generate **KnowledgeDocumentEmbeddings**
- **Agent** uses **KnowledgeDocumentEmbeddings** to answer queries related to a specific **KnowledgeBase**

This domain model enables a flexible, extensible system that can be adapted to various knowledge management and conversational AI scenarios while maintaining a clear separation of concerns.
