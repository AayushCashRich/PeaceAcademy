"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function AdminDashboard() {
  const [knowledgeBaseCount, setKnowledgeBaseCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/admin/knowledge-bases')
        if (response.ok) {
          const knowledgeBases = await response.json()
          setKnowledgeBaseCount(knowledgeBases.length)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchStats()
  }, [])
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString()}
        </div>
      </div>
      
      <p className="text-gray-600 dark:text-gray-300">
        Welcome to the Knowledge Base Admin Dashboard. Manage knowledge base from here.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {/* Stats Card: Events */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Knowledge Bases
          </h3>
          <div className="flex items-end gap-2">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {isLoading ? "..." : knowledgeBaseCount}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              total
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/admin/knowledge-bases"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage Knowledge Bases →
            </Link>
          </div>
        </div>
        
        {/* Stats Card: Files */}
        {/* <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Knowledge Base
          </h3>
          <div className="flex items-end gap-2">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              0
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              files
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/admin/upload"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Upload Files →
            </Link>
          </div>
        </div> */}
        
        {/* Stats Card: Chats */}
        {/* <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Chat Sessions
          </h3>
          <div className="flex items-end gap-2">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              0
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              today
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/admin/analytics"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Analytics →
            </Link>
          </div>
        </div> */}
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/admin/knowledge-bases/new"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2 px-4 text-center"
          >
            Create New Knowledge Base
          </Link>
        </div>
      </div>
    </div>
  )
}
