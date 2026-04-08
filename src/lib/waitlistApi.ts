import apiClient from "./api"
import type { ApiResponse } from "@/src/types"

export const waitlistApi = {
  join: async (propertyId: string): Promise<ApiResponse<{ position: number }>> => {
    const response = await apiClient.post<ApiResponse<{ position: number }>>(`/waitlist/${propertyId}`)
    return response.data
  },

  leave: async (propertyId: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/waitlist/${propertyId}`)
    return response.data
  },

  getStatus: async (propertyId: string): Promise<ApiResponse<{ onWaitlist: boolean; position: number | null }>> => {
    const response = await apiClient.get<ApiResponse<{ onWaitlist: boolean; position: number | null }>>(`/waitlist/status/${propertyId}`)
    return response.data
  },

  getMy: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/waitlist/my`)
    return response.data
  },
}
