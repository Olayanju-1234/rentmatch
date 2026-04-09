"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin, Home, Heart, Search, Star, Bath, Bed, MessageSquare,
  Calendar, BarChart3, Settings, Bell, CreditCard, ChevronRight,
  RefreshCw, CheckCircle, Clock, XCircle, LogOut, User, Filter,
  Receipt, RotateCcw, AlertCircle, TrendingUp, Wallet,
} from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { tenantsApi } from "@/src/lib/tenantsApi";
import { optimizationApi } from "@/src/lib/optimizationApi";
import { propertiesApi } from "@/src/lib/propertiesApi";
import { communicationApi } from "@/src/lib/communicationApi";
import { paymentsApi } from "@/src/lib/paymentsApi";
import { waitlistApi } from "@/src/lib/waitlistApi";
import type { PaymentHistoryItem, PropertyReview } from "@/src/lib/paymentsApi";
import { PreferencesModal } from "@/components/tenant/PreferencesModal";
import { MessageCenter } from "@/components/communication/MessageCenter";
import { ProfileManager } from "@/components/profile/ProfileManager";
import { RequestViewingModal } from "@/components/common/RequestViewingModal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ViewingCalendar } from "@/components/viewings/ViewingCalendar";
import { convertBackendToFrontend } from "@/src/utils/typeConversion";
import type { ITenant, PropertyMatch, IProperty } from "@/src/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useSocket } from "@/src/hooks/useSocket";
import { NotificationBell } from "@/components/ui/notification-bell";
import type { Notification } from "@/components/ui/notification-bell";
import { analyticsApi } from "@/src/lib/analyticsApi";
import type { TenantAnalytics } from "@/src/lib/analyticsApi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Tab = "matches" | "viewings" | "saved" | "payments" | "preferences" | "messages" | "analytics" | "profile";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  confirmed: "bg-green-50 text-green-700 border border-green-200",
  cancelled: "bg-red-50 text-red-700 border border-red-200",
  completed: "bg-gray-50 text-gray-600 border border-gray-200",
};

const DEPOSIT_STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  pending: { label: "Awaiting Payment", cls: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
  paid: { label: "Deposit Paid", cls: "bg-green-50 text-green-700 border border-green-200" },
  refunded: { label: "Refunded", cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  forfeited: { label: "Forfeited", cls: "bg-red-50 text-red-700 border border-red-200" },
  refund_requested: { label: "Refund Requested", cls: "bg-purple-50 text-purple-700 border border-purple-200" },
};

// Paystack inline loader — injects script once
function loadPaystack(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).PaystackPop) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

// Currency formatter — respects actual currency from payment data
function formatAmount(amount: number, currency: string): string {
  const curr = (currency || 'GBP').toUpperCase();
  if (curr === 'GBP') return `£${amount.toLocaleString()}`;
  if (curr === 'NGN' || curr === 'NGN') return `₦${amount.toLocaleString()}`;
  if (curr === 'USD') return `$${amount.toLocaleString()}`;
  return `${curr} ${amount.toLocaleString()}`;
}

// Format audit log metadata into human-readable text
function formatActivityMeta(action: string, meta: Record<string, any>): string {
  if (!meta) return '';
  const { provider, amount, currency, sessionId, paymentIntentId, reference, rating, viewingId } = meta;
  if (action.includes('deposit')) {
    const parts: string[] = [];
    if (provider) parts.push(provider.charAt(0).toUpperCase() + provider.slice(1));
    if (amount && currency) parts.push(formatAmount(amount, currency));
    if (viewingId) parts.push(`viewing …${String(viewingId).slice(-6)}`);
    return parts.join(' · ');
  }
  if (action.includes('review')) {
    return rating ? `${rating} star${rating !== 1 ? 's' : ''}` : '';
  }
  if (action.includes('refund')) {
    const parts: string[] = [];
    if (provider) parts.push(provider);
    if (reference) parts.push(`ref …${String(reference).slice(-8)}`);
    return parts.join(' · ');
  }
  // Fallback: show non-id fields
  const safe = Object.entries(meta)
    .filter(([k, v]) => !['sessionId', 'paymentIntentId', 'transactionId'].includes(k) && typeof v !== 'object')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
  return safe;
}

// Star rating component
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className="focus:outline-none"
        >
          <Star
            className={`h-6 w-6 transition-colors ${(hovered || value) >= s ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function TenantDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();


  const [tenant, setTenant] = useState<ITenant | null>(null);
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [properties, setProperties] = useState<IProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMatches, setFetchingMatches] = useState(false);
  // propertyId → { avg: number; total: number }
  const [propertyRatings, setPropertyRatings] = useState<Record<string, { avg: number; total: number }>>({});
  const [activeTab, setActiveTab] = useState<Tab>("matches");
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [viewingPropertyId, setViewingPropertyId] = useState<string | null>(null);
  const [viewings, setViewings] = useState<any[]>([]);
  const [loadingViewings, setLoadingViewings] = useState(false);
  const [depositStatuses, setDepositStatuses] = useState<Record<string, any>>({});
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Payment history
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Activity log
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Viewings display mode
  const [viewingsDisplay, setViewingsDisplay] = useState<"list" | "calendar">("list");

  // Search filters for matches tab
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ minRent: "", maxRent: "", bedrooms: "", city: "" });

  // Property comparison (up to 3 saved properties)
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Waitlist — tracks which properties the tenant has joined
  const [waitlistedIds, setWaitlistedIds] = useState<Set<string>>(new Set());
  const [joiningWaitlist, setJoiningWaitlist] = useState<string | null>(null);

  // Refund state
  const [refundingId, setRefundingId] = useState<string | null>(null);

  // Tenant analytics
  const [tenantAnalytics, setTenantAnalytics] = useState<TenantAnalytics | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (n: Omit<Notification, "id" | "time" | "read">) => {
    setNotifications((prev) => [{ ...n, id: String(Date.now()), time: new Date(), read: false }, ...prev].slice(0, 30));
  };

  // Payment method selection
  const [payMethodViewing, setPayMethodViewing] = useState<string | null>(null);

  // Reviews
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewViewing, setReviewViewing] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedViewingIds, setReviewedViewingIds] = useState<Set<string>>(new Set());

  const fetchViewings = useCallback(async () => {
    if (!user) return;
    setLoadingViewings(true);
    try {
      const response = await communicationApi.getViewings(undefined, undefined, undefined, "tenant");
      if (response.success) {
        const converted = (response.data ?? []).map((v: any) => convertBackendToFrontend.viewing(v));
        setViewings(converted);
        const withDeposit = converted.filter((v: any) => ["confirmed", "completed", "cancelled"].includes(v.status));
        const statuses: Record<string, any> = {};
        await Promise.all(withDeposit.map(async (v: any) => {
          try {
            const res = await paymentsApi.getDepositStatus(v._id);
            if (res.success && res.data) statuses[v._id] = res.data;
          } catch { }
        }));
        setDepositStatuses(statuses);
      } else {
        setViewings([]);
      }
    } catch {
      setViewings([]);
    } finally {
      setLoadingViewings(false);
    }
  }, [user]);

  // Real-time notifications via Socket.io
  useSocket({
    userId: user?._id,
    onViewingStatusUpdated: ({ status, propertyTitle }) => {
      const desc = `Your viewing for "${propertyTitle || 'a property'}" is now ${status}.`;
      toast({ title: "Viewing Update", description: desc });
      addNotification({ type: "viewing", title: "Viewing Update", description: desc });
      fetchViewings();
    },
    onNewMessage: ({ subject }) => {
      const desc = subject || "You have a new message.";
      toast({ title: "New Message", description: desc });
      addNotification({ type: "message", title: "New Message", description: desc });
    },
  });

  const fetchPaymentHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await paymentsApi.getPaymentHistory();
      if (res.success && res.data) setPaymentHistory(res.data);
    } catch { }
    finally { setLoadingHistory(false); }
  }, []);

  const fetchActivityLog = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await paymentsApi.getActivityLog();
      if (res.success && res.data) setActivityLog(res.data);
    } catch { }
    finally { setLoadingActivity(false); }
  }, []);

  useEffect(() => {
    if (!user || authLoading || user.userType !== "tenant") return;
    const fetchTenantData = async () => {
      setLoading(true);
      try {
        const tenantId = user.tenantId || user._id;
        const res = await tenantsApi.getProfile(tenantId);
        if (res.success && res.data) {
          const converted = convertBackendToFrontend.tenant(res.data);
          setTenant(converted);
          if (!res.data.preferences?.preferredLocation) {
            setShowPreferencesModal(true);
          } else {
            await fetchMatches(converted);
          }
          if (converted.savedProperties?.length) {
            await fetchSavedProperties(converted.savedProperties);
          }
        } else {
          setShowPreferencesModal(true);
        }
      } catch {
        setShowPreferencesModal(true);
      } finally {
        setLoading(false);
      }
    };
    fetchTenantData();
  }, [user, authLoading]);

  useEffect(() => {
    if (user) fetchViewings();
  }, [user]);

  // Load already-reviewed viewing IDs so the "Leave Review" button shows correctly
  useEffect(() => {
    if (!user) return;
    paymentsApi.getMyReviews()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          const ids = new Set<string>(res.data.map((r: any) => String(r.viewingId?._id ?? r.viewingId)));
          setReviewedViewingIds(ids);
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (activeTab === "payments") {
      fetchPaymentHistory();
      fetchActivityLog();
    }
    if (activeTab === "analytics" && !tenantAnalytics && user) {
      analyticsApi.getTenantAnalytics()
        .then((res) => { if (res.success && res.data) setTenantAnalytics(res.data); })
        .catch(() => {});
    }
  }, [activeTab, user]);

  const fetchSavedProperties = async (savedIds: string[]) => {
    if (!savedIds.length) return;
    const results = await Promise.allSettled(savedIds.map((id) => propertiesApi.getById(id)));
    const fetched = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => convertBackendToFrontend.property(r.value.data))
      .filter(Boolean) as IProperty[];
    setProperties((prev) => {
      const existingIds = new Set(prev.map((p) => p._id));
      const newOnes = fetched.filter((p) => !existingIds.has(p._id));
      return [...prev, ...newOnes];
    });
  };

  const fetchMatches = async (tenantData: ITenant) => {
    if (!tenantData._id) return;
    setFetchingMatches(true);
    try {
      const res = await optimizationApi.findMatches(tenantData._id);
      if (res.success && res.data?.matches) {
        const converted = res.data.matches.map((m) => convertBackendToFrontend.propertyMatch(m));
        setMatches(converted);
        const ids = converted.map((m) => m.propertyId);
        const results = await Promise.allSettled(ids.map((id) => propertiesApi.getById(id)));
        const valid = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
          .map((r) => convertBackendToFrontend.property(r.value.data))
          .filter(Boolean);
        setProperties(valid);

        // Fetch review summaries in parallel — shown on each match card
        const reviewResults = await Promise.allSettled(ids.map((id) => paymentsApi.getPropertyReviews(id)));
        const ratings: Record<string, { avg: number; total: number }> = {};
        reviewResults.forEach((r, i) => {
          if (r.status === "fulfilled" && r.value.success && Array.isArray(r.value.data) && r.value.data.length) {
            const list = r.value.data;
            const avg = list.reduce((s: number, rv: any) => s + rv.rating, 0) / list.length;
            ratings[ids[i]] = { avg: Math.round(avg * 10) / 10, total: list.length };
          }
        });
        setPropertyRatings(ratings);
      } else {
        setMatches([]);
      }
    } catch {
      setMatches([]);
    } finally {
      setFetchingMatches(false);
    }
  };

  const handlePreferencesSaved = async () => {
    if (!user) return;
    setShowPreferencesModal(false);
    setLoading(true);
    try {
      const tenantId = user.tenantId || user._id;
      const res = await tenantsApi.getProfile(tenantId);
      if (res.success && res.data) {
        const converted = convertBackendToFrontend.tenant(res.data);
        setTenant(converted);
        await fetchMatches(converted);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProperty = async (propertyId: string) => {
    if (!user) return;
    const isSaved = tenant?.savedProperties?.includes(propertyId);
    try {
      const tenantId = user.tenantId || user._id;
      if (isSaved) {
        await tenantsApi.removeSavedProperty(tenantId, propertyId);
        toast({ title: "Removed", description: "Property removed from your saved list." });
      } else {
        await tenantsApi.addSavedProperty(tenantId, propertyId);
        toast({ title: "Saved", description: "Property added to your saved list." });
      }
      const res = await tenantsApi.getProfile(tenantId);
      if (res.success && res.data) setTenant(convertBackendToFrontend.tenant(res.data));
    } catch {
      toast({ title: "Error", description: isSaved ? "Failed to remove property." : "Failed to save property.", variant: "destructive" });
    }
  };

  const handleJoinWaitlist = async (propertyId: string) => {
    setJoiningWaitlist(propertyId);
    try {
      const res = await waitlistApi.join(propertyId);
      if (res.success) {
        setWaitlistedIds((prev) => new Set([...prev, propertyId]));
        toast({ title: "Added to Waitlist", description: res.message || "You'll be notified when this property becomes available." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to join waitlist.", variant: "destructive" });
    } finally {
      setJoiningWaitlist(null);
    }
  };

  const handleSubmitViewing = async ({ propertyId, requestedDate, requestedTime, notes }: { propertyId: string; requestedDate: string; requestedTime: string; notes?: string }) => {
    if (!user) return;
    const property = properties.find((p) => p._id === propertyId);
    let landlordId: any = property?.landlordId;
    if (typeof landlordId === "object" && landlordId !== null) landlordId = landlordId._id || landlordId.id || "";
    landlordId = landlordId?.toString() || "";
    if (!landlordId) { toast({ title: "Error", description: "Could not find landlord.", variant: "destructive" }); return; }
    try {
      const tenantId = user.tenantId || user._id;
      const res = await tenantsApi.requestViewing(tenantId, { propertyId, landlordId, requestedDate, requestedTime, message: notes });
      if (res.success) {
        toast({ title: "Viewing Requested!", description: "Your request has been sent." });
        setShowViewingModal(false);
        await fetchViewings();
      }
    } catch {
      toast({ title: "Error", description: "Failed to request viewing.", variant: "destructive" });
    }
  };

  // Stripe deposit
  const handlePayStripe = async (viewingId: string) => {
    try {
      const res = await paymentsApi.createDepositSession(viewingId);
      if (res.success && res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        toast({ title: "Payment Error", description: res.message || "Could not start checkout.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Payment Error", description: "Failed to create payment session.", variant: "destructive" });
    }
    setPayMethodViewing(null);
  };

  // Paystack deposit
  const handlePayPaystack = async (viewingId: string) => {
    try {
      const res = await paymentsApi.createPaystackDepositSession(viewingId);
      if (!res.success || !res.data) {
        toast({ title: "Payment Error", description: res.message || "Could not initialise Paystack.", variant: "destructive" });
        return;
      }
      await loadPaystack();
      const { reference, amount, email, public_key } = res.data;
      const handler = (window as any).PaystackPop.setup({
        key: public_key,
        email,
        amount: amount * 100, // kobo
        currency: "NGN",
        ref: reference,
        onClose: () => { },
        callback: async () => {
          // Verify on our backend then redirect to deposit-success — same UX as Stripe
          try {
            await paymentsApi.verifyPaystackDeposit(viewingId, reference);
          } catch { /* best-effort; webhook will confirm regardless */ }
          router.push(`/viewings/${viewingId}/deposit-success?provider=paystack`);
        },
      });
      handler.openIframe();
    } catch {
      toast({ title: "Payment Error", description: "Failed to initialise Paystack.", variant: "destructive" });
    }
    setPayMethodViewing(null);
  };

  // Request refund
  const handleRequestRefund = async (viewingId: string) => {
    setRefundingId(viewingId);
    try {
      const res = await paymentsApi.requestRefund(viewingId);
      if (res.success) {
        toast({ title: "Refund Requested", description: "Your refund is being processed. It arrives within 5–10 business days." });
        await fetchViewings();
      } else {
        toast({ title: "Refund Failed", description: res.message || "Could not process refund.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Refund Failed", description: "Could not process refund.", variant: "destructive" });
    } finally {
      setRefundingId(null);
    }
  };

  // Submit review
  const handleSubmitReview = async () => {
    if (!reviewViewing || reviewRating === 0) return;
    setSubmittingReview(true);
    try {
      const propertyId = typeof reviewViewing.propertyId === "object"
        ? reviewViewing.propertyId._id
        : reviewViewing.propertyId;
      const res = await paymentsApi.submitReview({
        propertyId,
        viewingId: reviewViewing._id,
        rating: reviewRating,
        comment: reviewComment,
      });
      if (res.success) {
        toast({ title: "Review Submitted", description: "Thank you for your feedback!" });
        setReviewedViewingIds((prev) => new Set([...prev, reviewViewing._id]));
        setShowReviewModal(false);
        setReviewViewing(null);
        setReviewRating(5);
        setReviewComment("");
      } else {
        toast({ title: "Error", description: res.message || "Failed to submit review.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit review.", variant: "destructive" });
    } finally {
      setSubmittingReview(false);
    }
  };

  const bestMatch = matches.length > 0 ? Math.round(Math.max(...matches.map((m) => m.matchScore))) : null;
  const avgMatch = matches.length > 0 ? Math.round(matches.reduce((s, m) => s + m.matchScore, 0) / matches.length) : null;
  const totalPaid = paymentHistory.filter((p) => p.type === "deposit").reduce((s, p) => s + p.amount, 0);
  const totalRefunded = paymentHistory.filter((p) => p.type === "refund").reduce((s, p) => s + p.amount, 0);

  // Only block if there's no cached user at all — returning users see content immediately
  if ((authLoading && !user) || (loading && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.userType !== "tenant") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access denied</h2>
          <p className="text-gray-500 text-sm">Please log in with a tenant account.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "matches", label: "My Matches", count: matches.length || undefined },
    { id: "viewings", label: "Viewings", count: viewings.length || undefined },
    { id: "saved", label: "Saved", count: tenant?.savedProperties?.length || undefined },
    { id: "payments", label: "Payments" },
    { id: "preferences", label: "Preferences" },
    { id: "messages", label: "Messages" },
    { id: "analytics", label: "Analytics" },
    { id: "profile", label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <PreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        onPreferencesSaved={handlePreferencesSaved}
        preferences={tenant?.preferences}
      />
      <RequestViewingModal
        open={showViewingModal}
        onOpenChange={setShowViewingModal}
        initialPropertyId={viewingPropertyId || undefined}
        onSubmit={handleSubmitViewing}
      />

      {/* Review modal */}
      {showReviewModal && reviewViewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Leave a Review</h3>
            <p className="text-sm text-gray-500 mb-5">
              {reviewViewing.propertyId?.title || "Property"}
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">Your Rating</label>
              <StarRating value={reviewRating} onChange={setReviewRating} />
            </div>
            <div className="mb-5">
              <label className="text-sm font-medium text-gray-700 block mb-2">Comments (optional)</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                placeholder="Share your experience at this property..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowReviewModal(false); setReviewViewing(null); }}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview || reviewRating === 0}
                className="flex-1 bg-gray-900 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment method picker */}
      {payMethodViewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Payment Method</h3>
            <p className="text-sm text-gray-500 mb-1">Select how you'd like to pay your viewing deposit.</p>
            <p className="text-xs text-blue-600 mb-5 flex items-center gap-1">
              <CheckCircle className="h-3 w-3 shrink-0" />
              Refunded automatically after your viewing completes.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handlePayStripe(payMethodViewing)}
                className="w-full flex items-center gap-4 border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Stripe</p>
                  <p className="text-xs text-gray-500">Card, Apple Pay, Google Pay</p>
                </div>
              </button>
              <button
                onClick={() => handlePayPaystack(payMethodViewing)}
                className="w-full flex items-center gap-4 border border-green-300 bg-green-50 rounded-xl p-4 hover:border-green-400 hover:bg-green-100 transition-all text-left group relative"
              >
                <span className="absolute -top-2.5 right-3 bg-green-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Recommended for Nigeria
                </span>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Paystack</p>
                  <p className="text-xs text-gray-500">Card, bank transfer, USSD</p>
                </div>
              </button>
            </div>
            <button
              onClick={() => setPayMethodViewing(null)}
              className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
              <Home className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">RentMatch</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Tenant</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell
              notifications={notifications}
              onClearAll={() => setNotifications([])}
              onMarkRead={(id) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))}
            />
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center hover:ring-2 hover:ring-blue-300 transition-all"
              >
                <span className="text-xs font-semibold text-blue-700">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              </button>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-lg z-40 overflow-hidden py-1">
                    <div className="px-3 py-2 border-b border-gray-50">
                      <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); setActiveTab("profile"); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="h-3.5 w-3.5 text-gray-400" /> Profile
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); setActiveTab("preferences"); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5 text-gray-400" /> Preferences
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); setActiveTab("payments"); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Receipt className="h-3.5 w-3.5 text-gray-400" /> Payments
                    </button>
                    <div className="border-t border-gray-50 mt-1">
                      <button
                        onClick={() => { setShowUserMenu(false); logout(); router.push("/"); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome + stats */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back, {user.name?.split(" ")[0]}</h1>
          <p className="text-gray-500 text-sm">
            {fetchingMatches ? "Finding your best matches..." : `${matches.length} propert${matches.length === 1 ? "y" : "ies"} match your preferences`}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Matches", value: matches.length, color: "text-blue-600" },
            { label: "Best Match", value: bestMatch ? `${bestMatch}%` : "-", color: "text-green-600" },
            { label: "Avg. Score", value: avgMatch ? `${avgMatch}%` : "-", color: "text-purple-600" },
            { label: "Viewings", value: viewings.length, color: "text-orange-600" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-all ${activeTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === t.id ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Matches */}
        {activeTab === "matches" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Your Top Matches</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg bg-white transition-colors ${showFilters ? "border-blue-300 text-blue-600 bg-blue-50" : "border-gray-200 text-gray-500 hover:text-gray-700"}`}
                >
                  <Filter className="h-3.5 w-3.5" /> Filters
                </button>
                <button
                  onClick={() => setShowPreferencesModal(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg bg-white"
                >
                  <Settings className="h-3.5 w-3.5" /> Preferences
                </button>
                <button
                  onClick={() => tenant && fetchMatches(tenant)}
                  disabled={fetchingMatches}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg bg-white disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${fetchingMatches ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Min Rent (£/yr)</label>
                    <input
                      type="number"
                      value={filters.minRent}
                      onChange={(e) => setFilters((f) => ({ ...f, minRent: e.target.value }))}
                      placeholder="e.g. 10000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Max Rent (£/yr)</label>
                    <input
                      type="number"
                      value={filters.maxRent}
                      onChange={(e) => setFilters((f) => ({ ...f, maxRent: e.target.value }))}
                      placeholder="e.g. 30000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Bedrooms</label>
                    <select
                      value={filters.bedrooms}
                      onChange={(e) => setFilters((f) => ({ ...f, bedrooms: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Any</option>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">City</label>
                    <input
                      type="text"
                      value={filters.city}
                      onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                      placeholder="e.g. London"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => setFilters({ minRent: "", maxRent: "", bedrooms: "", city: "" })}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}

            {fetchingMatches && (
              <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
            )}

            {!fetchingMatches && matches.length === 0 && (
              <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
                <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">No matches yet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {tenant?.preferences ? "Try adjusting your preferences." : "Set up your preferences to get matches."}
                </p>
                <button onClick={() => setShowPreferencesModal(true)} className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                  {tenant?.preferences ? "Update Preferences" : "Set Preferences"}
                </button>
              </div>
            )}

            {matches.filter((match) => {
              const property = properties.find((p) => p._id === match.propertyId);
              if (!property) return true;
              if (filters.minRent && property.rent < Number(filters.minRent)) return false;
              if (filters.maxRent && property.rent > Number(filters.maxRent)) return false;
              if (filters.bedrooms && property.bedrooms < Number(filters.bedrooms)) return false;
              if (filters.city && !property.location?.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
              return true;
            }).map((match) => {
              const property = properties.find((p) => p._id === match.propertyId);
              const score = Math.round(match.matchScore);
              return (
                <div key={match.propertyId} className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="md:flex">
                    <div className="md:w-64 shrink-0">
                      <img
                        src={property?.images?.[0] || "/placeholder.svg"}
                        alt={property?.title}
                        className="w-full h-48 md:h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                            {property?.title || `Property ${match.propertyId}`}
                          </h3>
                          {property?.location && (
                            <div className="flex items-center gap-1 text-gray-400 text-sm mb-2">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              {property.location.address}, {property.location.city}
                            </div>
                          )}
                          {property?.rent && (
                            <p className="text-xl font-bold text-gray-900">
                              ₦{property.rent.toLocaleString()}<span className="text-sm font-normal text-gray-400">/yr</span>
                            </p>
                          )}
                        </div>
                        <div className="ml-4 text-right shrink-0">
                          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold ${score >= 70 ? "bg-green-50 text-green-700" : score >= 50 ? "bg-yellow-50 text-yellow-700" : "bg-gray-50 text-gray-600"}`}>
                            {score}% Match
                          </div>
                          <div className="mt-2 h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${score}%` }} />
                          </div>
                          {propertyRatings[match.propertyId] && (
                            <div className="mt-2 flex items-center justify-end gap-1">
                              {[1,2,3,4,5].map((s) => (
                                <Star key={s} className={`h-3 w-3 ${s <= Math.round(propertyRatings[match.propertyId].avg) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                              ))}
                              <span className="text-xs text-gray-400 ml-1">{propertyRatings[match.propertyId].avg} ({propertyRatings[match.propertyId].total})</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {property && (
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <span className="flex items-center gap-1"><Bed className="h-4 w-4" />{property.bedrooms} bed</span>
                          <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{property.bathrooms} bath</span>
                          {property.size && <span>{property.size} sqm</span>}
                        </div>
                      )}

                      {match.explanation?.length > 0 && (
                        <div className="mb-4">
                          <ul className="space-y-0.5">
                            {match.explanation.slice(0, 3).map((r, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500">
                                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {(() => {
                          const isSaved = tenant?.savedProperties?.includes(match.propertyId);
                          return (
                            <button
                              onClick={() => handleSaveProperty(match.propertyId)}
                              className={`flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg transition-colors ${isSaved ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100" : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}
                            >
                              <Heart className={`h-3.5 w-3.5 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
                              {isSaved ? "Saved" : "Save"}
                            </button>
                          );
                        })()}
                        {property?.status === "available" ? (
                          <button
                            onClick={() => { if (property) { setViewingPropertyId(property._id); setShowViewingModal(true); } }}
                            className="flex items-center gap-1.5 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700"
                          >
                            <Calendar className="h-3.5 w-3.5" /> Request Viewing
                          </button>
                        ) : (
                          <button
                            onClick={() => handleJoinWaitlist(match.propertyId)}
                            disabled={waitlistedIds.has(match.propertyId) || joiningWaitlist === match.propertyId}
                            className="flex items-center gap-1.5 text-xs border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Bell className="h-3.5 w-3.5" />
                            {waitlistedIds.has(match.propertyId) ? "On Waitlist" : joiningWaitlist === match.propertyId ? "Joining..." : "Join Waitlist"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Viewings */}
        {activeTab === "viewings" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Viewing Requests</h2>
              <div className="flex items-center gap-2">
                {/* List / Calendar toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5">
                  <button
                    onClick={() => setViewingsDisplay("list")}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md transition-all ${viewingsDisplay === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <RefreshCw className="h-3 w-3" /> List
                  </button>
                  <button
                    onClick={() => setViewingsDisplay("calendar")}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md transition-all ${viewingsDisplay === "calendar" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <Calendar className="h-3 w-3" /> Calendar
                  </button>
                </div>
                <button
                  onClick={fetchViewings}
                  disabled={loadingViewings}
                  className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingViewings ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>
            </div>
            {loadingViewings ? (
              <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
            ) : viewings.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
                <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">No viewing requests</h3>
                <p className="text-sm text-gray-500">Request a viewing from your matched properties.</p>
              </div>
            ) : viewingsDisplay === "calendar" ? (
              <ViewingCalendar
                viewings={viewings}
                onViewingClick={(id) => {
                  setViewingsDisplay("list");
                  const el = document.getElementById(`viewing-${id}`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              />
            ) : (
              viewings.map((viewing) => {
                const deposit = depositStatuses[viewing._id];
                const depositInfo = deposit ? DEPOSIT_STATUS_STYLES[deposit.status] : null;
                const canRefund = deposit?.status === "paid" && ["completed", "cancelled"].includes(viewing.status);
                const canReview = viewing.status === "completed" && !reviewedViewingIds.has(viewing._id);

                return (
                  <div key={viewing._id} id={`viewing-${viewing._id}`} className="bg-white border border-gray-100 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[viewing.status] || "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                            {viewing.status}
                          </span>
                          {depositInfo && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${depositInfo.cls}`}>
                              {depositInfo.label}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-0.5 truncate">
                          {viewing.propertyId?.title || "Unknown Property"}
                        </h3>
                        {viewing.propertyId?.location && (
                          <p className="text-xs text-gray-400 mb-2">
                            {viewing.propertyId.location.address}, {viewing.propertyId.location.city}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{viewing.landlordId?.name || "Landlord"}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{viewing.requestedDate?.slice(0, 10)}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{viewing.requestedTime}</span>
                        </div>
                        {deposit && (
                          <div className="mt-2 text-xs text-gray-400">
                            Deposit: ₦{deposit.amount?.toLocaleString()} {deposit.currency?.toUpperCase()}
                            {deposit.refunded_at && ` · Refunded ${new Date(deposit.refunded_at).toLocaleDateString()}`}
                          </div>
                        )}
                        {viewing.notes && <p className="text-xs text-gray-400 mt-1">Notes: {viewing.notes}</p>}
                      </div>

                      <div className="shrink-0 flex flex-col gap-2 items-end">
                        {/* Pay deposit */}
                        {viewing.status === "confirmed" && (!deposit || deposit.status === "pending") && (
                          <button
                            onClick={() => setPayMethodViewing(viewing._id)}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                          >
                            <CreditCard className="h-3.5 w-3.5" /> Pay Deposit
                          </button>
                        )}

                        {/* Request refund */}
                        {canRefund && (
                          <button
                            onClick={() => handleRequestRefund(viewing._id)}
                            disabled={refundingId === viewing._id}
                            className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className={`h-3.5 w-3.5 ${refundingId === viewing._id ? "animate-spin" : ""}`} />
                            {refundingId === viewing._id ? "Processing..." : "Request Refund"}
                          </button>
                        )}

                        {/* Leave review */}
                        {canReview && (
                          <button
                            onClick={() => { setReviewViewing(viewing); setShowReviewModal(true); }}
                            className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                          >
                            <Star className="h-3.5 w-3.5" /> Leave Review
                          </button>
                        )}
                        {viewing.status === "completed" && reviewedViewingIds.has(viewing._id) && (
                          <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                            <CheckCircle className="h-3.5 w-3.5" /> Reviewed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Saved */}
        {activeTab === "saved" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Saved Properties</h2>
                {compareIds.length > 0 && (
                  <p className="text-xs text-blue-600 mt-0.5">{compareIds.length} selected for comparison</p>
                )}
              </div>
              {compareIds.length >= 2 && (
                <button
                  onClick={() => setCompareIds([])}
                  className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>

            {!tenant?.savedProperties?.length ? (
              <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
                <Heart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">No saved properties</h3>
                <p className="text-sm text-gray-500">Save properties from your matches to find them here.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400">Select up to 3 properties to compare side-by-side.</p>
                <div className="space-y-3">
                  {tenant.savedProperties.map((propertyId) => {
                    const property = properties.find((p) => p._id === propertyId);
                    if (!property) return null;
                    const isSelected = compareIds.includes(propertyId);
                    const canSelect = isSelected || compareIds.length < 3;
                    const rating = propertyRatings[propertyId];
                    return (
                      <div
                        key={propertyId}
                        className={`bg-white border rounded-xl overflow-hidden flex transition-all ${isSelected ? "border-blue-400 shadow-sm" : "border-gray-100"}`}
                      >
                        <label className="flex items-center px-4 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!canSelect}
                            onChange={() => setCompareIds((prev) =>
                              isSelected ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
                            )}
                            className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                          />
                        </label>
                        <img src={property.images?.[0] || "/placeholder.svg"} alt={property.title} className="w-28 h-24 object-cover shrink-0" />
                        <div className="flex-1 p-4 flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900 text-sm">{property.title}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{property.location?.city}, {property.location?.state}</p>
                            <p className="text-sm font-semibold text-gray-900 mt-1">₦{property.rent?.toLocaleString()}/yr</p>
                            {rating && (
                              <div className="flex items-center gap-1 mt-1">
                                {[1,2,3,4,5].map((s) => <Star key={s} className={`h-3 w-3 ${s <= Math.round(rating.avg) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />)}
                                <span className="text-xs text-gray-400">{rating.avg}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${property.status === "available" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {property.status}
                            </span>
                            <button
                              onClick={() => { setViewingPropertyId(property._id); setShowViewingModal(true); }}
                              className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              Book
                            </button>
                            <button
                              onClick={() => handleSaveProperty(propertyId)}
                              title="Remove from saved"
                              className="text-xs border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1.5 rounded-lg transition-colors"
                            >
                              <Heart className="h-3.5 w-3.5 fill-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Comparison table */}
                {compareIds.length >= 2 && (
                  <div className="bg-white border border-blue-100 rounded-xl overflow-hidden mt-2">
                    <div className="bg-blue-50 px-5 py-3 border-b border-blue-100">
                      <p className="text-sm font-semibold text-blue-900">Side-by-Side Comparison</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 w-28">Attribute</th>
                            {compareIds.map((id) => {
                              const p = properties.find((x) => x._id === id);
                              return (
                                <th key={id} className="px-5 py-3 text-left text-xs font-semibold text-gray-900 truncate max-w-xs">
                                  {p?.title || "Property"}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: "Rent/yr", getValue: (p: any) => p?.rent ? `₦${p.rent.toLocaleString()}` : "-" },
                            { label: "Location", getValue: (p: any) => p?.location ? `${p.location.city}, ${p.location.state}` : "-" },
                            { label: "Bedrooms", getValue: (p: any) => p?.bedrooms ?? "-" },
                            { label: "Bathrooms", getValue: (p: any) => p?.bathrooms ?? "-" },
                            { label: "Size", getValue: (p: any) => p?.size ? `${p.size} sqm` : "-" },
                            { label: "Status", getValue: (p: any) => p?.status ?? "-" },
                            { label: "Rating", getValue: (p: any) => propertyRatings[p?._id]?.avg ? `${propertyRatings[p._id].avg} ★ (${propertyRatings[p._id].total})` : "No reviews" },
                            { label: "Match %", getValue: (p: any) => {
                              const m = matches.find((x) => x.propertyId === p?._id);
                              return m ? `${Math.round(m.matchScore)}%` : "-";
                            }},
                          ].map((row) => (
                            <tr key={row.label} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                              <td className="px-5 py-3 text-xs text-gray-500 font-medium">{row.label}</td>
                              {compareIds.map((id) => {
                                const p = properties.find((x) => x._id === id);
                                return (
                                  <td key={id} className="px-5 py-3 text-xs text-gray-900">{row.getValue(p)}</td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Payments */}
        {activeTab === "payments" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Payment History</h2>
              <button
                onClick={async () => {
                  try {
                    await paymentsApi.exportPaymentHistoryCsv();
                  } catch {
                    toast({ title: "Export failed", description: "Could not download CSV.", variant: "destructive" });
                  }
                }}
                className="flex items-center gap-1.5 text-xs border border-gray-200 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
              >
                <Receipt className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Total Deposits Paid", value: formatAmount(totalPaid, paymentHistory[0]?.currency || 'GBP'), color: "text-blue-600", icon: CreditCard },
                { label: "Total Refunded", value: formatAmount(totalRefunded, paymentHistory[0]?.currency || 'GBP'), color: "text-green-600", icon: RotateCcw },
                { label: "Transactions", value: paymentHistory.length, color: "text-purple-600", icon: Receipt },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {loadingHistory ? (
              <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
            ) : paymentHistory.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
                <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">No payment history yet</h3>
                <p className="text-sm text-gray-500">Your deposit payments and refunds will appear here.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                {paymentHistory.map((item, i) => (
                  <div key={item._id} className={`flex items-center gap-4 p-4 ${i < paymentHistory.length - 1 ? "border-b border-gray-50" : ""}`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${item.type === "refund" ? "bg-green-100" : "bg-blue-100"}`}>
                      {item.type === "refund"
                        ? <RotateCcw className="h-4 w-4 text-green-600" />
                        : <CreditCard className="h-4 w-4 text-blue-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.propertyTitle}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(item.paid_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                        {" · "}
                        <span className="capitalize">{item.provider}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${item.type === "refund" ? "text-green-600" : "text-gray-900"}`}>
                        {item.type === "refund" ? "+" : "-"}{formatAmount(item.amount, item.currency)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${DEPOSIT_STATUS_STYLES[item.status]?.cls || "bg-gray-100 text-gray-500"}`}>
                        {DEPOSIT_STATUS_STYLES[item.status]?.label || item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Activity log */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Activity Log</h3>
              {loadingActivity ? (
                <div className="flex justify-center py-8"><LoadingSpinner size="sm" /></div>
              ) : activityLog.length === 0 ? (
                <p className="text-sm text-gray-400 bg-white border border-gray-100 rounded-xl p-5 text-center">No activity recorded yet.</p>
              ) : (
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                  {activityLog.slice(0, 20).map((entry: any, i: number) => (
                    <div key={entry._id || i} className={`flex items-start gap-3 px-4 py-3 ${i < activityLog.length - 1 ? "border-b border-gray-50" : ""}`}>
                      <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-2" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800">{entry.action?.replace(/\./g, " · ") ?? "Event"}</p>
                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (() => {
                          const summary = formatActivityMeta(entry.action ?? '', entry.metadata);
                          return summary ? <p className="text-xs text-gray-400">{summary}</p> : null;
                        })()}
                      </div>
                      <p className="text-xs text-gray-400 shrink-0">{new Date(entry.createdAt).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preferences */}
        {activeTab === "preferences" && (
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-gray-900">Your Preferences</h2>
              <button
                onClick={() => setShowPreferencesModal(true)}
                className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                {tenant?.preferences ? "Edit" : "Set Preferences"}
              </button>
            </div>
            {tenant?.preferences ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[
                  { label: "Budget", value: `₦${tenant.preferences.budget?.min?.toLocaleString()} – ₦${tenant.preferences.budget?.max?.toLocaleString()}` },
                  { label: "Location", value: tenant.preferences.preferredLocation },
                  { label: "Bedrooms", value: `${tenant.preferences.preferredBedrooms} bed` },
                  { label: "Bathrooms", value: `${tenant.preferences.preferredBathrooms} bath` },
                ].map((p, i) => (
                  <div key={i}>
                    <p className="text-xs text-gray-400 mb-0.5">{p.label}</p>
                    <p className="text-sm font-medium text-gray-900">{p.value || "-"}</p>
                  </div>
                ))}
                {tenant.preferences.requiredAmenities?.length > 0 && (
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-xs text-gray-400 mb-2">Required Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {tenant.preferences.requiredAmenities.map((a, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-4">No preferences set yet.</p>
                <button onClick={() => setShowPreferencesModal(true)} className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg">Set Preferences</button>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {activeTab === "messages" && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {user && (
              <MessageCenter
                userId={user._id}
                userType="tenant"
                contacts={viewings
                  .filter((v: any) => v.landlordId && (typeof v.landlordId === 'object' ? v.landlordId.name : false))
                  .map((v: any) => ({
                    id: typeof v.landlordId === 'object' ? (v.landlordId._id ?? v.landlordId.id ?? String(v.landlordId)) : String(v.landlordId),
                    name: typeof v.landlordId === 'object' ? v.landlordId.name : 'Landlord',
                    email: typeof v.landlordId === 'object' ? v.landlordId.email : undefined,
                  }))
                  // deduplicate by id
                  .filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx)}
              />
            )}
          </div>
        )}

        {/* Analytics */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Analytics</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Total Matches", value: matches.length, color: "text-blue-600" },
                { label: "Best Match Score", value: bestMatch ? `${bestMatch}%` : "-", color: "text-green-600" },
                { label: "Avg. Match Score", value: avgMatch ? `${avgMatch}%` : "-", color: "text-purple-600" },
                { label: "Viewing Requests", value: viewings.length, color: "text-orange-600" },
                { label: "Confirmed Viewings", value: viewings.filter((v) => v.status === "confirmed").length, color: "text-teal-600" },
                { label: "Saved Properties", value: tenant?.savedProperties?.length || 0, color: "text-pink-600" },
              ].map((s, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            {tenantAnalytics ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Viewings", value: tenantAnalytics.viewings.total, color: "text-blue-600" },
                    { label: "Confirmed", value: tenantAnalytics.viewings.confirmed, color: "text-green-600" },
                    { label: "Completed", value: tenantAnalytics.viewings.completed, color: "text-purple-600" },
                    { label: "Cancelled", value: tenantAnalytics.viewings.cancelled, color: "text-red-600" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Viewing Activity (Last 6 Months)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={tenantAnalytics.monthlyViewings} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                      <Bar dataKey="count" name="Viewings" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
                <BarChart3 className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Loading analytics...</p>
              </div>
            )}
          </div>
        )}

        {/* Profile */}
        {activeTab === "profile" && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <ProfileManager />
          </div>
        )}
      </div>
    </div>
  );
}
