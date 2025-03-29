import { NextRequest, NextResponse } from 'next/server'
// import { getPresignedUploadUrl } from '@/server/features/knowledge-docs/s3-service'
import { getPresignedUploadUrl } from '@/server/features/knowledge-docs/firebase-service'
import logger from '@/server/config/pino-config'

// POST - Generate a presigned URL for S3 file upload
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Unsupported content type' },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const knowledgeBaseCode = formData.get('knowledge_base_code') || formData.get('knowledgeBaseCode')
    const fileName = formData.get('file_name') || formData.get('fileName')
    const file = formData.get('file')

    // Basic validation
    if (!knowledgeBaseCode || !fileName || !file) {
      return NextResponse.json(
        { error: 'Knowledge base code and file name are required' },
        { status: 400 }
      )
    }
    // Validate file name (must be PDF)
    if (!(fileName as string).toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }
    // Generate the presigned URL
    const urlData = await getPresignedUploadUrl(
      knowledgeBaseCode as string,
      fileName as string,
      file as File
    )

    // Parse the JSON string returned from getPresignedUploadUrl
    const { file_url } = JSON.parse(urlData)

    return NextResponse.json({ file_url })
  } catch (error) {
    logger.error({ error }, 'Failed to generate presigned URL')
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    )
  }
}
