import apiClient from "./api"
import type { ApiResponse } from "@/src/types"

export interface DepositSession {
  checkout_url: string
  session_id: string
  amount: number
  currency: string
  expires_at: number
}

export interface DepositStatus {
  status: "pending" | "paid" | "refunded" | "forfeited"
  amount: number
  currency: string
  paid_at?: string
  refund_reason?: string
}

export const paymentsApi = {
  createDepositSession: async (viewingId: string): Promise<ApiResponse<DepositSession>> => {
    const response = await apiClient.post<ApiResponse<DepositSession>>(
      `/payments/viewing/${viewingId}/deposit`
    )
    return response.data
  },

  getDepositStatus: async (viewingId: string): Promise<ApiResponse<DepositStatus>> => {
    const response = await apiClient.get<ApiResponse<DepositStatus>>(
      `/payments/viewing/${viewingId}/deposit`
    )
    return response.data
  },
}
