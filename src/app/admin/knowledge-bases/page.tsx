"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { KnowledgeBase } from "./[code]/page"

export default function KnowledgeBasesPage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  
  // Fetch all knowledge bases
  const fetchKnowledgeBases = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/admin/knowledge-bases')
      if (!response.ok) {
        throw new Error('Failed to fetch knowledge bases')
      }
      const data = await response.json()
      setKnowledgeBases(data)
    } catch (err) {
      setError('Error loading knowledge bases. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    fetchKnowledgeBases()
  }, [])
  
  // Handle knowledge base deletion
  const handleDeleteKnowledgeBase = async (code: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/knowledge-bases/${code}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete knowledge base')
      }
      
      // Refresh the knowledge bases list
      fetchKnowledgeBases()
    } catch (err) {
      console.error('Error deleting knowledge base:', err)
      alert('Failed to delete knowledge base. Please try again.')
    }
  }
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch (e) {
      console.log(e)
      return 'Invalid date'
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Knowledge Bases</h1>
        <Link
          href="/admin/knowledge-bases/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2 px-4"
        >
          Create New Knowledge Base
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-300">Loading knowledge bases...</span>
          </div>
        ) : knowledgeBases.length === 0 ? (
          <div className="text-center p-8 text-gray-600 dark:text-gray-300">
            <p className="mb-4">No knowledge bases found</p>
            <Link
              href="/admin/knowledge-bases/new"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create your first knowledge base
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-gray-600 dark:text-gray-200 text-xs font-medium uppercase tracking-wider">
                    Knowledge Base Code
                  </th>
                  <th className="px-6 py-3 text-gray-600 dark:text-gray-200 text-xs font-medium uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-gray-600 dark:text-gray-200 text-xs font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-gray-600 dark:text-gray-200 text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {knowledgeBases.map((knowledgeBase) => (
                  <tr 
                    key={knowledgeBase._id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
                    onClick={() => router.push(`/admin/knowledge-bases/${knowledgeBase.code}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {knowledgeBase.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {knowledgeBase.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        knowledgeBase.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {knowledgeBase.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/admin/knowledge-bases/${knowledgeBase.code}/edit`)
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteKnowledgeBase(knowledgeBase._id, knowledgeBase.name)
                        }}
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
