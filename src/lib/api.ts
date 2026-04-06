import axios from "axios"
import type { LoginRequest, RegisterRequest, UpdateProfileRequest, ChangePasswordRequest, ApiResponse } from "@/src/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
  },
  timeout: 60000, // 60 second timeout — accounts for Render free tier cold starts
})

// Function to get the token from localStorage
const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token")
  }
  return null
}

// Add a request interceptor to include the token in headers
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Only set Content-Type for JSON requests
    if (
      config.data &&
      typeof config.data === "object" &&
      !(config.data instanceof FormData)
    ) {
      config.headers["Content-Type"] = "application/json"
    } else {
      // Let Axios/browser set Content-Type for FormData
      delete config.headers["Content-Type"]
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      if (typeof window !== "undefined") {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        window.location.href = "/auth-pages?mode=login"
      }
    }
    return Promise.reject(error)
  }
)

// Helper function for better error messages
const getErrorMessage = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  if (error.message) {
    return error.message
  }
  if (error.code === "ECONNABORTED") {
    return "Request timed out. Please try again."
  }
  if (error.code === "NETWORK_ERROR") {
    return "Network error. Please check your connection."
  }
  return "An unexpected error occurred. Please try again."
}

export const registerUser = async (userData: RegisterRequest): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post<ApiResponse>("/auth/register", userData)
    return response.data
  } catch (error: any) {
    return {
      success: false,
      message: getErrorMessage(error)
    }
  }
}

export const loginUser = async (credentials: LoginRequest): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post<ApiResponse>("/auth/login", credentials)
    return response.data
  } catch (error: any) {
    return {
      success: false,
      message: getErrorMessage(error)
    }
  }
}

export const getProfile = async (): Promise<ApiResponse> => {
  try {
    const timestamp = new Date().getTime()
    const response = await apiClient.get<ApiResponse>(`/auth/me?t=${timestamp}`)
    return response.data
  } catch (error: any) {
    return {
      success: false,
      message: getErrorMessage(error)
    }
  }
}

export const updateProfile = async (profileData: UpdateProfileRequest): Promise<ApiResponse> => {
  try {
    const response = await apiClient.put<ApiResponse>("/auth/profile", profileData)
    return response.data
  } catch (error: any) {
    return {
      success: false,
      message: getErrorMessage(error)
    }
  }
}

export const changePassword = async (passwordData: ChangePasswordRequest): Promise<ApiResponse> => {
  try {
    const response = await apiClient.put<ApiResponse>("/auth/change-password", passwordData)
    return response.data
  } catch (error: any) {
    return {
      success: false,
      message: getErrorMessage(error)
    }
  }
}

export const logoutUser = async (): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post<ApiResponse>("/auth/logout")
    // Client-side cleanup
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    }
    return response.data
  } catch (error: any) {
    // Always clean up on client side, even if server request fails
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    }
    return {
      success: false,
      message: getErrorMessage(error)
    }
  }
}

export default apiClient
