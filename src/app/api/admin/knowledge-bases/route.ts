import { NextRequest, NextResponse } from 'next/server'
import { knowledgeBaseDbService } from '@/server/features/knowledge-bases/db/knowledgebase-db-service'
import logger from '@/server/config/pino-config'

// GET - Fetch all knowledge bases
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    
    if (code) {
      // If code is provided, fetch specific knowledgebase
      const knowledgeBase = await knowledgeBaseDbService.getKnowledgeBaseByCode(code)
      
      if (!knowledgeBase) {
        return NextResponse.json(
          [],  // Return empty array for consistency
          { status: 200 }
        )
      }
      
      return NextResponse.json([knowledgeBase])  // Return as array for consistency
    }
    
    // Otherwise fetch all knowledge bases
    const knowledgeBases = await knowledgeBaseDbService.getAllKnowledgeBases()
    return NextResponse.json(knowledgeBases)
  } catch (error) {
    logger.error({ error }, 'Failed to fetch knowledge bases')
    return NextResponse.json(
      { error: 'Failed to fetch knowledge bases' },
      { status: 500 }
    )
  }
}

// POST - Create a new knowledge base
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Basic validation
    if (!body.code || !body.name || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Check if knowledge base code already exists
    const exists = await knowledgeBaseDbService.codeExists(body.code)
    if (exists) {
      return NextResponse.json(
        { error: 'Knowledge base code already exists' },
        { status: 409 }
      )
    }
    
    // Convert from camelCase request body to snake_case for database
    const knowledgeBaseData = {
      code: body.code,
      name: body.name,
      description: body.description || '',
      is_active: body.isActive !== undefined ? body.isActive : true
    }
    
    const newKnowledgeBase = await knowledgeBaseDbService.createKnowledgeBase(knowledgeBaseData)
    return NextResponse.json(newKnowledgeBase, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create knowledge base')
    return NextResponse.json(
      { error: 'Failed to create knowledge base' },
      { status: 500 }
    )
  }
}
