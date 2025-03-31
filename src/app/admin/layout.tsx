"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    { name: "Dashboard", href: "/admin" },
    { name: "Knowledge Bases", href: "/admin/knowledge-bases" },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Admin header */}
      <header className="bg-blue-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Peace Academy Admin</h1>
          <Link href="/" className="text-sm hover:underline">
            View Site
          </Link>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar navigation */}
        <aside className="bg-gray-100 dark:bg-gray-800 w-64 p-6 shadow-md">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 rounded-lg transition-colors ${pathname === item.href
                    ? "bg-blue-600 text-white"
                    : "hover:bg-blue-100 dark:hover:bg-gray-700"
                  }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8 bg-gray-50 dark:bg-gray-900 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
