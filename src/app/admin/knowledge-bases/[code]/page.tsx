"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

export interface KnowledgeBase {
  _id: string
  code: string
  name: string
  description: string
  is_active: boolean
}

export interface KnowledgeDocument {
  _id: string
  knowledge_base_code: string
  file_name: string
  s3_url: string
  user_id: string
  file_size: number
  status: "pending" | "processed" | "error"
  error_message?: string
  created_at: string
  updated_at: string
}

export default function KnowledgeBaseDashboardPage() {
  const params = useParams()
  const knowledgeBaseCode = params.code as string
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null)
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch knowledge base details and knowledge documents
  useEffect(() => {
    const fetchKnowledgeBaseData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch knowledge base details
        const knowledgeBaseResponse = await fetch(`/api/admin/knowledge-bases?code=${knowledgeBaseCode}`)
        if (!knowledgeBaseResponse.ok) {
          throw new Error('Failed to fetch knowledge base details')
        }
        const knowledgeBaseData = await knowledgeBaseResponse.json()
        if (knowledgeBaseData.length === 0) {
          throw new Error(`Knowledge base with code ${knowledgeBaseCode} not found`)
        }
        setKnowledgeBase(knowledgeBaseData[0])

        // Fetch knowledge documents
        const documentsResponse = await fetch(`/api/admin/knowledge-docs?knowledge_base_code=${knowledgeBaseCode}`)
        if (!documentsResponse.ok) {
          throw new Error('Failed to fetch knowledge documents')
        }
        const documentsData = await documentsResponse.json()
        setDocuments(documentsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchKnowledgeBaseData()
  }, [knowledgeBaseCode])

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch (e) {
      console.log(e)
      return 'Invalid date'
    }
  }

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    else return (bytes / 1048576).toFixed(1) + ' MB'
  }

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF files are supported')
      return
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File size must be less than 20MB')
      return
    }

    // Reset states
    setUploadError(null)
    setUploadProgress(0)
    setIsUploading(true)

    try {
      // Step 1: Get presigned URL
      const presignedUrlResponse = await fetch('/api/admin/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          knowledge_base_code: knowledgeBaseCode,
          file_name: file.name,
          file: file
        }),
      })

      if (!presignedUrlResponse.ok) {
        const errorData = await presignedUrlResponse.json()
        throw new Error(errorData.error || 'Failed to get upload URL')
      }

      const { file_url } = await presignedUrlResponse.json()

      // Step 2: Upload file to S3
      // const xhr = new XMLHttpRequest()
      // xhr.open('PUT', presigned_url)
      // xhr.setRequestHeader('Content-Type', 'application/pdf')

      // // Set up progress tracking
      // xhr.upload.onprogress = (event) => {
      //   if (event.lengthComputable) {
      //     const percentComplete = Math.round((event.loaded / event.total) * 100)
      //     setUploadProgress(percentComplete)
      //   }
      // }

      // Set up completion handler
      // xhr.onload = async () => {
      // if (xhr.status === 200) {
      // Step 3: Register file in database
      try {
        const registerResponse = await fetch('/api/admin/knowledge-docs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            knowledge_base_code: knowledgeBaseCode,
            file_name: file.name,
            file_url,
            user_id: 'admin',
            file_size: file.size,
            status: 'pending'
          }),
        })

        if (!registerResponse.ok) {
          const errorData = await registerResponse.json()
          throw new Error(errorData.error || 'Failed to register document')
        }

        // Refresh document list
        const documentsResponse = await fetch(`/api/admin/knowledge-docs?knowledge_base_code=${knowledgeBaseCode}`)
        const documentsData = await documentsResponse.json()
        setDocuments(documentsData)

        setUploadProgress(100)
        // Reset after 2 seconds
        setTimeout(() => {
          setUploadProgress(null)
          setIsUploading(false)

          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }, 2000)
      } catch (err) {
        setUploadError('File uploaded but failed to register')
        setIsUploading(false)
      }
      // } else {
      //   setUploadError('Failed to upload file')
      //   setIsUploading(false)
      // }
      // }




    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
      setIsUploading(false)
    }
  }

  // Handle document deletion
  const handleDeleteDocument = async (docId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/knowledge-docs/${docId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete document')
      }

      // Update local state to remove the deleted document
      setDocuments(prevDocs => prevDocs.filter(doc => doc._id !== docId))
    } catch (err) {
      console.error('Error deleting document:', err)
      alert('Failed to delete document. Please try again.')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
        <div className="mt-4">
          <Link
            href="/admin/knowledge-bases"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Back to Knowledge Bases
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{knowledgeBase?.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Knowledge Base Code: {knowledgeBase?.code}
          </p>
        </div>
        <Link
          href="/admin/knowledge-bases"
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to Knowledge Bases
        </Link>
      </div>

      {/* Knowledge Base Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Knowledge Base Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${knowledgeBase?.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
              {knowledgeBase?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {knowledgeBase?.description && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 mb-1">Description</p>
            <p className="text-gray-800 dark:text-gray-200">{knowledgeBase.description}</p>
          </>
        )}
      </div>

      {/* Knowledge Documents */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Knowledge Documents</h2>

        {/* File Upload */}
        <div className="mb-6 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-md">
          <div className="flex flex-col items-center">
            <input
              ref={fileInputRef}
              type="file"
              id="fileUpload"
              onChange={handleFileChange}
              accept=".pdf"
              disabled={isUploading}
              className="hidden"
            />
            <label
              htmlFor="fileUpload"
              className={`flex items-center justify-center px-4 py-2 w-64 text-center rounded-md cursor-pointer ${isUploading
                ? 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800'
                }`}
            >
              {isUploading ? 'Uploading...' : 'Upload PDF Document'}
            </label>

            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              PDF files only, max 20MB
            </p>

            {uploadError && (
              <div className="mt-2 text-red-600 text-sm">
                {uploadError}
              </div>
            )}

            {uploadProgress !== null && (
              <div className="mt-4 w-full">
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-right">
                  {uploadProgress}%
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Documents Table */}
        {documents.length === 0 ? (
          <div className="text-center p-4 text-gray-600 dark:text-gray-400">
            No documents found for this knowledge base
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-gray-600 dark:text-gray-200 text-xs font-medium uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-4 py-2 text-gray-600 dark:text-gray-200 text-xs font-medium uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-2 text-gray-600 dark:text-gray-200 text-xs font-medium uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-4 py-2 text-gray-600 dark:text-gray-200 text-xs font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2 text-gray-600 dark:text-gray-200 text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      <a
                        href={doc.s3_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {doc.file_name}
                      </a>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${doc.status === 'processed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : doc.status === 'error'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 space-x-2">
                      <button
                        onClick={() => handleDeleteDocument(doc._id, doc.file_name)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
