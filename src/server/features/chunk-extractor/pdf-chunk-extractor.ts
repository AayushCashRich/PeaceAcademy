import axios from 'axios'
import parsePdf from '@/server/utils/pdf-parse-wrapper'
import logger from '@/server/config/pino-config'

/**
 * Interface for text chunks extracted from documents
 */
export interface TextChunk {
  text: string
  chunk_id: string
}

/**
 * Interface for document chunking services
 */
export interface DocumentChunker {
  extractChunks(url: string): Promise<TextChunk[]>
}

/**
 * Service for extracting text chunks from PDF documents
 * Each page of the PDF is extracted as a separate chunk
 */
export class PdfChunkExtractor implements DocumentChunker {
  /**
   * Extract text chunks from a PDF document
   * @param url URL to the PDF document
   * @returns Array of text chunks, one per page
   */
  async extractChunks(url: string): Promise<TextChunk[]> {
    try {
      logger.info({ url }, 'Extracting text chunks from PDF')
      
      // Fetch the PDF file
      const pdfBuffer = await this.fetchPdfFile(url)
      
      return await this.extractTextFromPdf(pdfBuffer)
    } catch (error) {
      logger.error({ error, url }, 'Failed to extract chunks from PDF')
      throw error
    }
  }
  
  /**
   * Extract text from PDF page by page
   * @param pdfBuffer Buffer containing PDF data
   * @returns Array of text chunks, one per page
   */
  private async extractTextFromPdf(pdfBuffer: Buffer): Promise<TextChunk[]> {
    try {
      // Collect text from each page
      const chunks: TextChunk[] = []
      let currentPage = 0
      
      // Configure options for page-by-page extraction
      const options = {
        // This is the key improvement: use a custom page render function
        pagerender: function(pageData: any) {
          currentPage++
          // Extract text content from the page
          return pageData.getTextContent()
            .then(function(textContent: any) {
              // Combine all the text items into a single string
              let lastY = -1
              let text = ''
              
              for (const item of textContent.items) {
                // Add newline if y-position changes significantly
                if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 5) {
                  text += '\n'
                }
                
                text += item.str
                lastY = item.transform[5]
              }
              
              // Add to our chunks array
              chunks.push({
                text: text.trim(),
                chunk_id: `${currentPage+1}`
              })
              
              // Return empty string to prevent pdf-parse from accumulating text
              return ''
            })
        }
      }
      
      // Parse the PDF - the text from the PDF won't be used directly
      // Instead, we collect text in the pagerender callback
      await parsePdf(pdfBuffer, options)
      
      // Filter out empty chunks and clean the text
      const validChunks = chunks
        .filter(chunk => chunk.text.trim().length > 0)
        .map(chunk => ({
          ...chunk,
          text: this.cleanText(chunk.text)
        }))
      
      logger.info({ pageCount: validChunks.length }, 'Successfully extracted text from PDF')
      
      // If no valid chunks were found, chunk the entire PDF as fallback
      if (validChunks.length === 0) {
        logger.warn('No valid chunks found using page-by-page extraction, falling back to whole document extraction')
        return this.extractWholeDocument(pdfBuffer)
      }
      
      return validChunks
    } catch (error) {
      logger.error({ error }, 'Error extracting text page by page from PDF')
      throw error
    //   // Fallback to whole document extraction
    //   logger.warn('Falling back to whole document extraction')
    //   return this.extractWholeDocument(pdfBuffer)
    }
  }
  
  /**
   * Fallback method to extract text from the whole document
   * Used when page-by-page extraction fails
   */
  private async extractWholeDocument(pdfBuffer: Buffer): Promise<TextChunk[]> {
    try {
      // Parse the PDF with minimal options
      const data = await parsePdf(pdfBuffer)
      
      // Get the raw text from the PDF
      const fullText = data.text || ''
      
      // If the document is small enough, return it as a single chunk
      if (fullText.length < 4000) {
        return [{
          text: this.cleanText(fullText),
          chunk_id: 'chunk_1'
        }]
      }
      
      // For larger documents, split into chunks by sentence
      return this.splitIntoEqualChunks(fullText)
        .map((text, index) => ({
          text: this.cleanText(text),
          chunk_id: `chunk_${index + 1}`
        }))
    } catch (error) {
      logger.error({ error }, 'Error extracting whole document text from PDF')
      throw error
    }
  }
  
  /**
   * Clean text by removing extra whitespace and normalizing line breaks
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/(\r\n|\n|\r)/gm, ' ')  // Replace line breaks with spaces
      .trim()
  }
  
  /**
   * Split text into roughly equal chunks for long documents
   */
  private splitIntoEqualChunks(text: string, targetChunkSize = 4000): string[] {
    const chunks: string[] = []
    const sentences = text.split(/(?<=[.!?])\s+/)
    
    let currentChunk = ''
    
    for (const sentence of sentences) {
      // If adding this sentence would exceed the target size,
      // finalize the current chunk and start a new one
      if (currentChunk.length + sentence.length > targetChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk)
        currentChunk = ''
      }
      
      // Add the sentence to the current chunk
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence
    }
    
    // Add the final chunk if there's anything left
    if (currentChunk.length > 0) {
      chunks.push(currentChunk)
    }
    
    return chunks
  }
  
  /**
   * Fetch PDF file from URL or file system
   * @param url URL to the PDF document
   * @returns Buffer containing the PDF file
   */
  private async fetchPdfFile(url: string): Promise<Buffer> {
    try {
      // Handle local file paths (for testing)
      if (url.startsWith('file://')) {
        const path = url.replace('file://', '')
        // Use Node.js fs module to read local file
        const fs = require('fs')
        return fs.readFileSync(path)
      }
      
      // Handle HTTP/HTTPS URLs
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'Accept': 'application/pdf'
        }
      })
      
      return Buffer.from(response.data)
    } catch (error) {
      logger.error({ error, url }, 'Failed to fetch PDF file')
      throw new Error(`Failed to fetch PDF from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Export singleton instance
export const pdfChunkExtractor = new PdfChunkExtractor()