import apiClient from "./api"
import type { ApiResponse } from "@/src/types"

export interface LandlordAnalytics {
  properties: { total: number; available: number; occupied: number; totalInquiries: number }
  viewings: { total: number; confirmed: number; completed: number; conversionRate: number }
  revenue: { total: number; byCurrency: Record<string, number> }
  rating: { avg: number | null; total: number }
  monthlyViewings: { month: string; count: number; confirmed: number }[]
}

export interface TenantAnalytics {
  viewings: { total: number; confirmed: number; completed: number; cancelled: number }
  payments: { totalPaid: number; totalRefunded: number; currency: string }
  monthlyViewings: { month: string; count: number }[]
}

export const analyticsApi = {
  getLandlordAnalytics: async (): Promise<ApiResponse<LandlordAnalytics>> => {
    const response = await apiClient.get<ApiResponse<LandlordAnalytics>>("/analytics/landlord")
    return response.data
  },

  getTenantAnalytics: async (): Promise<ApiResponse<TenantAnalytics>> => {
    const response = await apiClient.get<ApiResponse<TenantAnalytics>>("/analytics/tenant")
    return response.data
  },
}
