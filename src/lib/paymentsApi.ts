import apiClient from "./api"
import type { ApiResponse } from "@/src/types"

export interface DepositSession {
  checkout_url: string
  session_id: string
  amount: number
  currency: string
  expires_at: number
}

export interface PaystackDepositSession {
  reference: string
  amount: number
  currency: string
  email: string
  public_key: string
}

export interface DepositStatus {
  status: "pending" | "paid" | "refunded" | "forfeited" | "refund_requested"
  amount: number
  currency: string
  paid_at?: string
  refunded_at?: string
  refund_reason?: string
}

export interface RefundResult {
  refund_id: string
  status: string
  amount: number
  currency: string
}

export interface PaymentHistoryItem {
  _id: string
  viewingId: string
  propertyTitle: string
  propertyLocation?: string
  amount: number
  currency: string
  provider: "stripe" | "paystack"
  type: "deposit" | "refund"
  status: "paid" | "refunded" | "forfeited" | "refund_requested"
  paid_at: string
  refunded_at?: string
  refund_reason?: string
}

export interface PropertyReview {
  _id: string
  tenantId: string
  propertyId: string
  viewingId: string
  rating: number
  comment: string
  createdAt: string
  tenantName?: string
}

export const paymentsApi = {
  // Stripe deposit checkout session
  createDepositSession: async (viewingId: string): Promise<ApiResponse<DepositSession>> => {
    const response = await apiClient.post<ApiResponse<DepositSession>>(
      `/payments/viewing/${viewingId}/deposit`
    )
    return response.data
  },

  // Paystack deposit session (returns reference + public key for inline popup)
  createPaystackDepositSession: async (viewingId: string): Promise<ApiResponse<PaystackDepositSession>> => {
    const response = await apiClient.post<ApiResponse<PaystackDepositSession>>(
      `/payments/viewing/${viewingId}/deposit/paystack`
    )
    return response.data
  },

  // Verify Paystack payment after inline popup callback
  verifyPaystackDeposit: async (viewingId: string, reference: string): Promise<ApiResponse<DepositStatus>> => {
    const response = await apiClient.post<ApiResponse<DepositStatus>>(
      `/payments/viewing/${viewingId}/deposit/paystack/verify`,
      { reference }
    )
    return response.data
  },

  getDepositStatus: async (viewingId: string): Promise<ApiResponse<DepositStatus>> => {
    const response = await apiClient.get<ApiResponse<DepositStatus>>(
      `/payments/viewing/${viewingId}/deposit`
    )
    return response.data
  },

  requestRefund: async (viewingId: string, reason?: string): Promise<ApiResponse<RefundResult>> => {
    const response = await apiClient.post<ApiResponse<RefundResult>>(
      `/payments/viewing/${viewingId}/refund`,
      { reason: reason || "Viewing completed" }
    )
    return response.data
  },

  getPaymentHistory: async (): Promise<ApiResponse<PaymentHistoryItem[]>> => {
    const response = await apiClient.get<ApiResponse<PaymentHistoryItem[]>>(
      `/payments/history`
    )
    return response.data
  },

  // Property reviews
  submitReview: async (data: {
    propertyId: string
    viewingId: string
    rating: number
    comment: string
  }): Promise<ApiResponse<PropertyReview>> => {
    const response = await apiClient.post<ApiResponse<PropertyReview>>(
      `/reviews`,
      data
    )
    return response.data
  },

  getPropertyReviews: async (propertyId: string): Promise<ApiResponse<PropertyReview[]>> => {
    const response = await apiClient.get<ApiResponse<PropertyReview[]>>(
      `/reviews/property/${propertyId}`
    )
    return response.data
  },

  getActivityLog: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/payments/activity`)
    return response.data
  },

  createSubscriptionCheckout: async (plan: 'pro' | 'enterprise'): Promise<ApiResponse<{ checkout_url: string }>> => {
    const response = await apiClient.post<ApiResponse<{ checkout_url: string }>>(
      `/payments/subscription/checkout`,
      { plan },
    )
    return response.data
  },

  createBillingPortalSession: async (): Promise<ApiResponse<{ portal_url: string }>> => {
    const response = await apiClient.post<ApiResponse<{ portal_url: string }>>(
      `/payments/billing-portal`,
    )
    return response.data
  },

  startConnectOnboarding: async (): Promise<ApiResponse<{ onboarding_url: string }>> => {
    const response = await apiClient.post<ApiResponse<{ onboarding_url: string }>>(`/payments/connect/onboard`)
    return response.data
  },

  getConnectStatus: async (): Promise<ApiResponse<{
    status: 'none' | 'pending' | 'connected';
    accountId: string | null;
    payoutsEnabled?: boolean;
    chargesEnabled?: boolean;
    requirements?: string[];
  }>> => {
    const response = await apiClient.get<ApiResponse<any>>(`/payments/connect/status`)
    return response.data
  },
}
