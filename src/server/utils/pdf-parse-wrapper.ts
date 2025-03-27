/**
 * A wrapper module for pdf-parse that handles common initialization errors
 * This is needed because pdf-parse attempts to access test files even in production use
 */

// Mock the fs module to prevent pdf-parse from accessing test files
// This needs to be done before requiring pdf-parse
import { join } from 'path'
import fs from 'fs'

// Save the original readFileSync function
const originalReadFileSync = fs.readFileSync

// Create a patched version of readFileSync to intercept calls to test files
// @ts-ignore - Overriding readFileSync with custom implementation
fs.readFileSync = function(path: string, options?: any) {
  // Check if this is a call to the test file that causes the error
  if (path.includes('test/data/05-versions-space.pdf') || 
      path.includes('test/data') || 
      path.toString().includes('test/data')) {
    // Return an empty PDF buffer instead of trying to read the test file
    return Buffer.from('%PDF-1.3\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[]/Count 0>>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<</Size 3/Root 1 0 R>>\nstartxref\n110\n%%EOF\n')
  }
  
  // Otherwise, call the original function
  return originalReadFileSync(path, options)
}

// Now we can safely require pdf-parse
// @ts-ignore
const pdfParse = require('pdf-parse')

/**
 * Parse a PDF buffer and extract its text content
 * @param dataBuffer The PDF file buffer
 * @param options Optional configuration options
 * @returns Promise with PDF parsing result
 */
export async function parsePdf(dataBuffer: Buffer, options?: any): Promise<any> {
  try {
    return await pdfParse(dataBuffer, options)
  } catch (error) {
    // If we still get an error, throw a more descriptive one
    if (error instanceof Error) {
      throw new Error(`PDF parsing failed: ${error}`)
    }
    throw error
  }
}

export default parsePdf
