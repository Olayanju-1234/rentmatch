"use client"

import { useAuth } from "@/src/context/AuthContext"

interface AuthLoaderProps {
  children: React.ReactNode
}

/**
 * Only blocks when there is no cached user AND the background token
 * validation is still running. Returning users see the UI immediately.
 */
export const AuthLoader: React.FC<AuthLoaderProps> = ({ children }) => {
  const { isLoading, user } = useAuth()

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
          <p className="text-sm text-gray-500">Loading RentMatch...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}