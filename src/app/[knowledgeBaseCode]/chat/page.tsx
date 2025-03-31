"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

// Interface for ChatMessage from the conversation service
interface ChatMessage {
  id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown>
}

// Interface for Conversation from the conversation service
interface Conversation {
  conversation_id: string
  knowledge_base_code: string
  messages: ChatMessage[]
  expiry?: Date
  created_at: Date
  updated_at: Date
}

// Cookie name for storing conversation ID
const CONVERSATION_COOKIE = 'conversation_id'

// Cookie expiry time in days
const COOKIE_EXPIRY_DAYS = 7

/**
 * Set a cookie with expiration
 */
function setCookie(name: string, value: string, expiryDays: number) {
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + expiryDays)
  document.cookie = `${name}=${value};expires=${expiryDate.toUTCString()};path=/;SameSite=Strict`
  console.log(`Set cookie: ${name}=${value} with expiry ${expiryDays} days`)
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | undefined {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')[1]

  return cookieValue
}

export default function ChatPage() {
  const params = useParams()
  const knowledgeBaseCode = params.knowledgeBaseCode as string
  const [loading, setLoading] = useState(true) // Start with loading state
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const [initialMessages, setInitialMessages] = useState<Array<{ id: string, role: string, content: string }>>([]) // Store initial messages here first
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load existing conversation when component mounts
  useEffect(() => {
    const fetchCurrentConversation = async () => {
      try {
        // First check for conversation ID in cookies
        const cookieConversationId = getCookie(CONVERSATION_COOKIE)
        let existingConversation = false

        if (cookieConversationId) {
          console.log('Found conversation ID in cookie:', cookieConversationId)

          // Try to fetch this conversation
          try {
            const response = await axios.get(`/api/conversations/${cookieConversationId}`)

            if (response.data && response.data.conversation_id) {
              const conversation = response.data as Conversation
              console.log("Conversation data:", conversation)
              // Only use the conversation if the knowledge base code matches
              if (conversation.knowledge_base_code === knowledgeBaseCode) {
                setConversationId(cookieConversationId)
                existingConversation = true

                // Map the conversation messages to the format expected by useChat
                if (conversation.messages && conversation.messages.length > 0) {
                  const chatMessages = conversation.messages.map((message: ChatMessage) => ({
                    id: message.id || Math.random().toString(36).substring(2, 15),
                    role: message.role,
                    content: message.content
                  }))

                  // Instead of setting messages directly, store them in state
                  // We'll use this to initialize the useChat hook
                  setInitialMessages(chatMessages)
                  console.log(`Loaded ${chatMessages.length} messages from existing conversation:`, cookieConversationId)
                }
              } else {
                console.log('Found conversation but knowledge base code does not match. Starting new conversation.')
              }
            }
          } catch (error) {
            console.error('Error fetching conversation from cookie ID:', error)
          }
        }

        // If no valid conversation found from cookie, generate a new conversation ID
        if (!existingConversation) {
          // Generate new conversation ID
          const newConversationId = uuidv4()
          setConversationId(newConversationId)

          // Set the cookie with 7-day expiry
          setCookie(CONVERSATION_COOKIE, newConversationId, COOKIE_EXPIRY_DAYS)
          console.log('Generated new conversation ID:', newConversationId)
        }
      } catch (error) {
        console.error('Error in conversation setup:', error)
      } finally {
        setLoading(false) // End the loading state
      }
    }

    fetchCurrentConversation()
  }, [knowledgeBaseCode])

  // Use our own state management instead of the useChat hook
  const [messages, setMessages] = useState<Array<{ id: string, role: string, content: string }>>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Set initial messages once they're loaded
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages)
    }
  }, [initialMessages])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    // Create user message
    const userMessage = {
      id: Math.random().toString(36).substring(2, 15),
      role: 'user',
      content: input.trim()
    }

    // Add user message to messages
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)

    // Clear input
    setInput('')

    // Set loading state
    setIsLoading(true)

    try {
      // Send request to API
      const response = await axios.post('/api/chat', {
        messages: newMessages,
        knowledge_base_code: knowledgeBaseCode,
        conversation_id: conversationId
      })

      // Add assistant message from the response
      if (response.data) {
        // Extract the message content based on the response format
        // DefaultAgent returns either a direct response or a structured response with message property
        const responseContent = typeof response.data === 'string'
          ? response.data
          : response.data.message || response.data.text || ''

        const assistantMessage = {
          id: Math.random().toString(36).substring(2, 15),
          role: 'assistant',
          content: responseContent
        }

        setMessages([...newMessages, assistantMessage])
        console.log('Received assistant response:', responseContent.substring(0, 50) + '...')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Add error message
      const errorMessage = {
        id: Math.random().toString(36).substring(2, 15),
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.'
      }

      setMessages([...newMessages, errorMessage])
    } finally {
      setIsLoading(false)
      setLoading(false)
    }
  }

  // Effect to log when messages change (for debugging)
  useEffect(() => {
    console.log('Messages changed, new count:', messages.length)
  }, [messages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Submit handler now directly calls handleSubmit
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setLoading(true)
    handleSubmit(e)
  }

  // Format the knowledge base code for display (e.g., "IFTA-2025")
  const formattedKnowledgeBaseCode = knowledgeBaseCode.toString()

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="absolute top-0 left-0 w-full h-24 bg-blue-600 dark:bg-blue-800"></div>

      <main className="flex flex-col w-full max-w-3xl bg-white dark:bg-gray-800 shadow-xl rounded-xl mt-16 z-10 h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
              Peace Academy
            </div>
            <div>
              <h1 className="font-semibold text-lg text-gray-800 dark:text-white">
                {formattedKnowledgeBaseCode} Customer Support
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ask any questions about the knowledge base
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                Welcome to {formattedKnowledgeBaseCode} Chat Support
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-sm">
                How can I help you today? Ask me any questions about the knowledge base.
              </p>
            </div>
          ) : (
            <>
              {messages.map(m => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-lg ${m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-tl-none'
                      }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}

              {/* Show searching placeholder when loading and the last message is from user */}
              {(isLoading || loading) && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] px-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-tl-none flex items-center space-x-2">
                    <div className="w-4 h-4 animate-pulse rounded-full bg-blue-500"></div>
                    <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-300">Searching through docs...</p>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={onSubmit} className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isLoading || !input.trim()}
            >
              {isLoading || loading ? (
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </main>

      <footer className="mt-6 text-center text-gray-500 dark:text-gray-400 text-sm pb-4">
        &copy; {new Date().getFullYear()} Peace Academy Customer Support. All rights reserved.
      </footer>
    </div>
  )
}
