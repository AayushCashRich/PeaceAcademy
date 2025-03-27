# AI Project Documentation

Welcome to the AI Project documentation. This documentation provides comprehensive information about the architecture, components, and usage of the AI Project system.

## Table of Contents

1. [Domain Concepts](./domain-concepts.md) - Core domain concepts and their relationships
2. [API Specification](./api-specification.md) - Detailed API endpoints and usage examples
3. [Database Schema](./database-schema.md) - MongoDB collection schemas and relationships
4. [System Architecture](./system-architecture.md) - Overall system design, code organization, and extension points

## Getting Started

If you're new to the project, we recommend starting with the [Domain Concepts](./domain-concepts.md) document to understand the fundamental building blocks of the system.

For developers looking to integrate with the API, the [API Specification](./api-specification.md) provides detailed information about available endpoints.

## Project Structure

The project follows a domain-driven design approach with a clear separation of concerns:

```
src/
├── app/                       # Next.js app router pages
│   ├── api/                   # API routes
│   └── [knowledgeBaseCode]/   # Dynamic routes based on knowledge base
├── server/                    # Server-side code
│   ├── config/                # Configuration settings
│   ├── features/              # Domain features
│   │   ├── agents/            # Agent implementation
│   │   ├── chunk-extractor/   # Document chunking logic
│   │   ├── conversations/     # Conversation management
│   │   ├── knowledge-docs/    # Knowledge document management
│   │   └── knowledge-doc-embeddings/ # Embedding generation and search
│   └── llm/                   # LLM service wrappers
└── components/                # Shared UI components
```

## Common Use Cases

The [System Architecture](./system-architecture.md) document includes detailed examples of common use cases, such as:

1. Creating a new knowledge base
2. Uploading documents to a knowledge base
3. Handling user queries through the chat interface
4. Extending the system with custom agent capabilities

## Extending the System

The AI Project is designed to be extensible. Key extension points include:

1. Creating custom agents by implementing the `AIAgent` interface
2. Adding new agent capabilities through composition
3. Supporting new document types by extending the chunk extractor
4. Integrating with external systems through the agent framework

For detailed guidance on extending the system, refer to the [System Architecture](./system-architecture.md) document.
