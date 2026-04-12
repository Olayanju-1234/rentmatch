import apiClient from "./api"
import type { ApiResponse } from "@/src/types"

export interface ReadinessBreakdownItem {
  score: number
  max: number
  note: string
}

export interface TenantReadiness {
  tenantUserId: string
  score: number
  label: string
  breakdown: {
    viewingCompletion: ReadinessBreakdownItem
    cancellationRecord: ReadinessBreakdownItem
    paymentReliability: ReadinessBreakdownItem
    reviewEngagement: ReadinessBreakdownItem
    searchSeriousness: ReadinessBreakdownItem
    accountMaturity: ReadinessBreakdownItem
  }
  stats: {
    total: number
    completed: number
    confirmed: number
    cancelled: number
    paidPayments: number
    reviews: number
    saved: number
  }
}

export interface ViewingConflict {
  date: string
  count: number
  recommendation: string
  viewings: {
    viewingId: string
    tenantId: string
    tenantName: string
    tenantEmail: string
    requestedTime: string
    status: string
  }[]
}

export interface NeighbourhoodCategory {
  key: string
  name: string
  count: number
  items: { name: string; type: string }[]
}

export interface NeighbourhoodInsights {
  coordinates: { lat: number; lng: number }
  liveabilityScore: number
  liveabilityLabel: string
  categories: NeighbourhoodCategory[]
}

export interface LeaseMeta {
  property: { id: string; title: string; address: string }
  tenant: { id: string; name: string; email: string }
  landlord: { id: string; name: string }
  startDate: string
  endDate: string
  rentAmount: string
  depositAmount: string
  generatedAt: string
}

export const insightsApi = {
  getTenantReadiness: async (tenantUserId: string): Promise<ApiResponse<TenantReadiness>> => {
    const res = await apiClient.get<ApiResponse<TenantReadiness>>(`/insights/tenant/${tenantUserId}/readiness`)
    return res.data
  },

  getViewingConflicts: async (propertyId: string): Promise<ApiResponse<{ conflicts: ViewingConflict[]; totalConflicts: number }>> => {
    const res = await apiClient.get<ApiResponse<{ conflicts: ViewingConflict[]; totalConflicts: number }>>(`/insights/property/${propertyId}/conflicts`)
    return res.data
  },

  generateLease: async (body: {
    propertyId: string
    tenantUserId: string
    landlordUserId?: string
    startDate: string
    endDate: string
    rentAmount: number
    depositAmount?: number
  }): Promise<ApiResponse<{ leaseText: string; meta: LeaseMeta }>> => {
    const res = await apiClient.post<ApiResponse<{ leaseText: string; meta: LeaseMeta }>>(`/insights/lease/generate`, body)
    return res.data
  },

  getNeighbourhoodInsights: async (params: { lat?: number; lng?: number; address?: string }): Promise<ApiResponse<NeighbourhoodInsights>> => {
    const res = await apiClient.get<ApiResponse<NeighbourhoodInsights>>(`/insights/neighbourhood`, { params })
    return res.data
  },
}
