import { NextRequest, NextResponse } from 'next/server'
import { knowledgeBaseDbService } from '@/server/features/knowledge-bases/db/knowledgebase-db-service'
import logger from '@/server/config/pino-config'

/**
 * GET - Fetch all knowledge bases from the database
 * This endpoint provides knowledge bases data for the frontend UI
 */
export async function GET(req: NextRequest) {
  try {
    // Get all knowledge bases from the database
    const knowledgeBases = await knowledgeBaseDbService.getAllKnowledgeBases()
    
    return NextResponse.json({ 
      knowledgeBases,
      count: knowledgeBases.length
    })
  } catch (error) {
    logger.error({ error }, 'Failed to fetch knowledge bases')
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch knowledge bases', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
