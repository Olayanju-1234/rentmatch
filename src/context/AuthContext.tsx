"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { loginUser, registerUser, getProfile, logoutUser as logoutUserApi, updateProfile } from "@/src/lib/api"
import type { LoginRequest, RegisterRequest, IUser } from "@/src/types"

interface AuthContextType {
  user: IUser | null
  token: string | null
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => void
  updateUserProfile: (userData: IUser) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const PUBLIC_ROUTES = ['/auth-pages', '/', '/landing-page']

/** Read cached user from localStorage synchronously — no network needed. */
function readCachedUser(): IUser | null {
  try {
    const raw = localStorage.getItem("user")
    return raw ? (JSON.parse(raw) as IUser) : null
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Optimistic init: show cached user immediately, validate in background
  const [user, setUser] = useState<IUser | null>(() => {
    if (typeof window === "undefined") return null
    return readCachedUser()
  })
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("token")
  })
  // isLoading is only true during the initial background token validation
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem("token")

      if (!storedToken) {
        setUser(null)
        setToken(null)
        setIsLoading(false)
        return
      }

      try {
        const response = await getProfile()
        if (response.success && response.data) {
          setUser(response.data)
          setToken(storedToken)
          localStorage.setItem("user", JSON.stringify(response.data))
        } else {
          // Token expired or invalid — clear everything
          setUser(null)
          setToken(null)
          localStorage.removeItem("token")
          localStorage.removeItem("user")
        }
      } catch {
        // Network error — keep cached user so UI isn't wiped on brief connectivity loss
        // but don't treat it as confirmed auth
      } finally {
        setIsLoading(false)
      }
    }

    validateToken()
  }, [])

  // Auto-redirect logged-in users away from public pages
  useEffect(() => {
    if (isLoading || !user || !pathname) return
    if (PUBLIC_ROUTES.includes(pathname)) {
      if (user.userType === "tenant") router.push("/tenant-dashboard")
      else if (user.userType === "landlord") router.push("/property-manager-dashboard")
    }
  }, [user, isLoading, pathname, router])

  const login = async (credentials: LoginRequest) => {
    const response = await loginUser(credentials)
    if (response.success && response.data) {
      setToken(response.data.token)
      setUser(response.data.user)
      localStorage.setItem("token", response.data.token)
      localStorage.setItem("user", JSON.stringify(response.data.user))
      if (response.data.user.userType === "tenant") router.push("/tenant-dashboard")
      else if (response.data.user.userType === "landlord") router.push("/property-manager-dashboard")
      else router.push("/")
    } else {
      throw new Error(response.message || "Login failed")
    }
  }

  const register = async (userData: RegisterRequest) => {
    const response = await registerUser(userData)
    if (response.success && response.data) {
      setToken(response.data.token)
      setUser(response.data.user)
      localStorage.setItem("token", response.data.token)
      localStorage.setItem("user", JSON.stringify(response.data.user))
      if (response.data.user.userType === "tenant") router.push("/tenant-dashboard")
      else if (response.data.user.userType === "landlord") router.push("/property-manager-dashboard")
      else router.push("/")
    } else {
      throw new Error(response.message || "Registration failed")
    }
  }

  const logout = async () => {
    await logoutUserApi().catch(() => {})
    setUser(null)
    setToken(null)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  const updateUserProfile = (userData: IUser) => {
    setUser(userData)
    localStorage.setItem("user", JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
