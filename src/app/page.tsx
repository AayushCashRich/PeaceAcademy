"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { KnowledgeBase } from "./admin/knowledge-bases/[code]/page";

export default function Home() {
  const [selectedKnowledgeBase, setSelectedKnowledgeBases] = useState("");
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  // Fetch knowledge bases from the API when the component mounts
  useEffect(() => {
    const fetchKnowledgeBases = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/knowledge-bases');
        const fetchedKnowledgeBases = response.data.knowledgeBases;
        
        if (fetchedKnowledgeBases && fetchedKnowledgeBases.length > 0) {
          setKnowledgeBases(fetchedKnowledgeBases);
          // Set the first active knowledge base as the default selection
          const activeKnowledgeBase = fetchedKnowledgeBases.find((knowledgeBase: KnowledgeBase) => knowledgeBase.is_active) || fetchedKnowledgeBases[0];
          setSelectedKnowledgeBases(activeKnowledgeBase.code);
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch knowledge bases:', err);
        setError('Failed to load knowledge bases. Please try again later.');
        setLoading(false);
      }
    };

    fetchKnowledgeBases();
  }, []);

  const handleStartChat = () => {
    if (selectedKnowledgeBase) {
      router.push(`/${selectedKnowledgeBase}/chat`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="absolute top-0 left-0 w-full h-24 bg-blue-600 dark:bg-blue-800"></div>
      
      <main className="flex flex-col items-center max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-xl p-8 mt-16 z-10">
        <div className="w-16 h-16 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-6 shadow-md">
          IFTA
        </div>
        
        <h1 className="text-3xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600">
          IFTA Customer Agent
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
          Select your knowledge base and start chatting with our virtual assistant
        </p>
        
        {loading ? (
          <div className="w-full flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="w-full text-center text-red-500 py-4">{error}</div>
        ) : knowledgeBases.length === 0 ? (
          <div className="w-full text-center text-gray-500 py-4">No knowledge bases available.</div>
        ) : (
          <div className="w-full mb-6">
            <label htmlFor="knowledge-base-select" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
              Choose Knowledge Base
            </label>
            <div className="relative">
              <select
                id="knowledge-base-select"
                className="w-full p-3 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedKnowledgeBase}
                onChange={(e) => setSelectedKnowledgeBases(e.target.value)}
                disabled={knowledgeBases.length === 0}
              >
                {knowledgeBases.map((knowledgeBase) => (
                  <option key={knowledgeBase._id} value={knowledgeBase.code}>
                    {knowledgeBase.code}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700 dark:text-gray-300">
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={handleStartChat}
          disabled={loading || knowledgeBases.length === 0 || !selectedKnowledgeBase}
          className={`w-full py-3 px-6 font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-1 ${
            loading || knowledgeBases.length === 0 || !selectedKnowledgeBase
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          Start Chat
        </button>
      </main>
      
      <div className="mt-8 text-center">
        <Link
          href="/admin"
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors duration-200"
        >
          Manage Knowledge Bases
        </Link>
      </div>
      
      <footer className="mt-6 text-center text-gray-500 dark:text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} IFTA Customer Support. All rights reserved.
      </footer>
    </div>
  );
}
