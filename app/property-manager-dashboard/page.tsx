"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { MessageCenter } from "@/components/communication/MessageCenter"
import { ProfileManager } from "@/components/profile/ProfileManager"
import { propertiesApi } from "@/src/lib/propertiesApi"
import { useAuth } from "@/src/context/AuthContext"
import { convertBackendToFrontend } from "@/src/utils/typeConversion"
import type { IProperty, IViewing } from "@/src/types"
import {
  Home,
  Plus,
  Eye,
  Edit,
  Trash2,
  Users,
  BarChart3,
  Calendar,
  MapPin,
  Bed,
  Bath,
  Car,
  Wifi,
  Shield,
  Zap,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  CreditCard,
  TrendingUp,
  Crown,
  Receipt,
} from "lucide-react"
import { paymentsApi } from "@/src/lib/paymentsApi"
import type { PropertyReview } from "@/src/lib/paymentsApi"
import { optimizationApi } from "@/src/lib/optimizationApi"
import { communicationApi } from "@/src/lib/communicationApi"

function getUserId(user: { _id?: string; id?: string }): string | undefined {
  return user?._id || (user as any)?.id
}

function isProperty(obj: any): obj is { title: string } {
  return typeof obj === "object" && obj !== null && "title" in obj
}

function hasName(obj: any): obj is { name: string } {
  return typeof obj === "object" && obj !== null && "name" in obj && typeof obj.name === "string"
}

type Toast = { type: "success" | "error"; message: string } | null

const TABS = [
  { id: "properties", label: "Properties" },
  { id: "tenants", label: "Tenants" },
  { id: "analytics", label: "Analytics" },
  { id: "finance", label: "Finance" },
  { id: "communications", label: "Messages" },
  { id: "account", label: "Account" },
]

const AMENITIES = [
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "parking", label: "Parking", icon: Car },
  { id: "security", label: "Security", icon: Shield },
  { id: "generator", label: "Generator", icon: Zap },
]

const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700",
  occupied: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
  pending_review: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-purple-100 text-purple-700",
}

function statusBadge(status: string) {
  const cls = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${cls}`}>
      {status.replace("_", " ")}
    </span>
  )
}

export default function PropertyManagerDashboard() {
  const [activeTab, setActiveTab] = useState("properties")
  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<IProperty | null>(null)
  const [properties, setProperties] = useState<IProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast>(null)

  const { user, isLoading } = useAuth()
  const searchParams = useSearchParams()

  const [tenantMatches, setTenantMatches] = useState<any[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)

  const [viewingRequests, setViewingRequests] = useState<IViewing[]>([])
  const [loadingViewings, setLoadingViewings] = useState(false)

  const [marketStats, setMarketStats] = useState<any>(null)
  const [marketStatsLoading, setMarketStatsLoading] = useState(true)
  const [marketStatsError, setMarketStatsError] = useState<string | null>(null)

  // Reviews
  const [allReviews, setAllReviews] = useState<PropertyReview[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)

  // Sub-navigation within merged tabs
  const [tenantsSubTab, setTenantsSubTab] = useState<"matches" | "viewings">("matches")
  const [financeSubTab, setFinanceSubTab] = useState<"rent-payments" | "reviews">("rent-payments")
  const [accountSubTab, setAccountSubTab] = useState<"subscription" | "profile">("subscription")
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)

  // Rent payment tracking
  const [rentPayments, setRentPayments] = useState<any[]>([])
  const [showRentForm, setShowRentForm] = useState(false)
  const [rentFormData, setRentFormData] = useState({ propertyId: "", tenantName: "", amount: "", month: "", notes: "", status: "paid" as "paid" | "pending" | "late" })

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    rent: "",
    location: { address: "", city: "", state: "Lagos" },
    bedrooms: "",
    bathrooms: "",
    size: "",
    amenities: [] as string[],
    features: { furnished: false, petFriendly: false, parking: false, balcony: false },
    utilities: { electricity: true, water: true, internet: false, gas: false },
  })
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [imagesToKeep, setImagesToKeep] = useState<string[]>([])
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // Load reviews whenever properties are loaded
  useEffect(() => {
    if (!properties.length) return
    setLoadingReviews(true)
    Promise.allSettled(properties.map((p) => paymentsApi.getPropertyReviews(p._id.toString())))
      .then((results) => {
        const combined: PropertyReview[] = []
        results.forEach((r) => {
          if (r.status === "fulfilled" && r.value.success && r.value.data) {
            combined.push(...r.value.data)
          }
        })
        setAllReviews(combined)
      })
      .finally(() => setLoadingReviews(false))
  }, [properties.length])

  // Load rent payments from localStorage (local tracking — no backend endpoint required)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("rentmatch_rent_payments")
      if (stored) setRentPayments(JSON.parse(stored))
    } catch { }
  }, [])

  function saveRentPayments(updated: any[]) {
    setRentPayments(updated)
    localStorage.setItem("rentmatch_rent_payments", JSON.stringify(updated))
  }

  function handleAddRentPayment() {
    if (!rentFormData.propertyId || !rentFormData.tenantName || !rentFormData.amount || !rentFormData.month) {
      showToast("error", "Fill all required fields.")
      return
    }
    const entry = { ...rentFormData, _id: Date.now().toString(), createdAt: new Date().toISOString() }
    saveRentPayments([entry, ...rentPayments])
    setRentFormData({ propertyId: "", tenantName: "", amount: "", month: "", notes: "", status: "paid" })
    setShowRentForm(false)
    showToast("success", "Rent payment recorded.")
  }

  function handleDeleteRentPayment(id: string) {
    saveRentPayments(rentPayments.filter((r) => r._id !== id))
  }

  async function handleUpgrade(plan: "pro" | "enterprise") {
    setUpgradingPlan(plan)
    try {
      const res = await paymentsApi.createSubscriptionCheckout(plan)
      if (res.success && res.data?.checkout_url) {
        window.location.href = res.data.checkout_url
      } else {
        showToast("error", res.message || "Could not start checkout. Ensure STRIPE_PRO_PRICE_ID / STRIPE_ENTERPRISE_PRICE_ID are set.")
      }
    } catch {
      showToast("error", "Failed to start subscription checkout.")
    } finally {
      setUpgradingPlan(null)
    }
  }

  useEffect(() => {
    const tabParam = searchParams?.get("tab")
    if (!tabParam) return
    // Direct tab ID
    if (TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam)
    } else if (tabParam === "matches" || tabParam === "viewings") {
      setActiveTab("tenants")
      setTenantsSubTab(tabParam as any)
    } else if (tabParam === "rent-payments" || tabParam === "reviews") {
      setActiveTab("finance")
      setFinanceSubTab(tabParam as any)
    } else if (tabParam === "subscription" || tabParam === "profile") {
      setActiveTab("account")
      setAccountSubTab(tabParam as any)
    }
  }, [searchParams])

  useEffect(() => {
    const landlordId = getUserId(user || {})
    if (landlordId && user?.userType === "landlord") {
      setLoadingMatches(true)
      optimizationApi
        .findTenantMatchesForLandlord(landlordId)
        .then((res) => {
          let data = res.success && res.data ? (Array.isArray(res.data) ? res.data : [res.data]) : []
          setTenantMatches(data)
        })
        .catch(() => setTenantMatches([]))
        .finally(() => setLoadingMatches(false))
    }
  }, [user?._id, user?.userType])

  useEffect(() => {
    if (!user || user.userType !== "landlord") return
    setLoadingViewings(true)
    communicationApi
      .getViewings(undefined, undefined, undefined, "landlord")
      .then((res) => {
        setViewingRequests(res.success ? (res.data ?? []).map((v: any) => convertBackendToFrontend.viewing(v)) : [])
      })
      .catch(() => setViewingRequests([]))
      .finally(() => setLoadingViewings(false))
  }, [user])

  useEffect(() => {
    setMarketStatsLoading(true)
    propertiesApi
      .getStats()
      .then((res) => {
        if (res.success) setMarketStats(res.data)
        else setMarketStatsError(res.message || "Failed to load stats")
      })
      .catch((err) => setMarketStatsError(err?.message || "Failed to load stats"))
      .finally(() => setMarketStatsLoading(false))
  }, [])

  useEffect(() => {
    if (!user || isLoading || user.userType !== "landlord") return
    const id = getUserId(user)
    if (id) fetchProperties(id)
  }, [user, isLoading])

  async function fetchProperties(landlordIdParam?: string) {
    const landlordId = landlordIdParam || getUserId(user || {})
    if (!user || user.userType !== "landlord" || !landlordId) return
    try {
      setLoading(true)
      const res = await propertiesApi.getByLandlord(landlordId.toString())
      if (res.success && res.data) {
        const arr = Array.isArray(res.data) ? res.data : [res.data]
        setProperties(arr.map((p: any) => convertBackendToFrontend.property(p)))
      } else {
        setProperties([])
      }
    } catch {
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      title: "",
      description: "",
      rent: "",
      location: { address: "", city: "", state: "Lagos" },
      bedrooms: "",
      bathrooms: "",
      size: "",
      amenities: [],
      features: { furnished: false, petFriendly: false, parking: false, balcony: false },
      utilities: { electricity: true, water: true, internet: false, gas: false },
    })
    setSelectedImages([])
    setImagePreviewUrls([])
    setImagesToKeep([])
    setImagesToDelete([])
    setEditingProperty(null)
  }

  function openAddForm() {
    resetForm()
    setShowForm(true)
  }

  function openEditForm(property: IProperty) {
    setEditingProperty(property)
    setFormData({
      title: property.title,
      description: property.description,
      rent: property.rent.toString(),
      location: { address: property.location.address, city: property.location.city, state: property.location.state },
      bedrooms: property.bedrooms.toString(),
      bathrooms: property.bathrooms.toString(),
      size: property.size?.toString() || "",
      amenities: property.amenities,
      features: property.features,
      utilities: property.utilities,
    })
    setImagesToKeep(property.images || [])
    setImagesToDelete([])
    setSelectedImages([])
    setImagePreviewUrls([])
    setShowForm(true)
  }

  function buildFormData() {
    const fd = new FormData()
    fd.append("title", formData.title)
    fd.append("description", formData.description)
    fd.append("rent", formData.rent)
    fd.append("bedrooms", formData.bedrooms)
    fd.append("bathrooms", formData.bathrooms)
    fd.append("size", formData.size)
    fd.append("location[address]", formData.location.address)
    fd.append("location[city]", formData.location.city)
    fd.append("location[state]", formData.location.state)
    formData.amenities.forEach((a) => fd.append("amenities", a))
    Object.entries(formData.features).forEach(([k, v]) => fd.append(`features[${k}]`, v.toString()))
    Object.entries(formData.utilities).forEach(([k, v]) => fd.append(`utilities[${k}]`, v.toString()))
    return fd
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return
    if (!formData.title || !formData.description || !formData.rent || !formData.bedrooms || !formData.bathrooms) {
      showToast("error", "Please fill in all required fields.")
      return
    }
    if (formData.description.length < 20) {
      showToast("error", "Description must be at least 20 characters.")
      return
    }
    if (formData.amenities.length === 0) {
      showToast("error", "Select at least one amenity.")
      return
    }
    try {
      setIsSubmitting(true)
      const fd = buildFormData()
      if (editingProperty) {
        imagesToKeep.forEach((url) => fd.append("imagesToKeep", url))
        imagesToDelete.forEach((url) => fd.append("imagesToDelete", url))
        selectedImages.forEach((f) => fd.append("images", f))
        const res = await propertiesApi.update(editingProperty._id.toString(), fd)
        if (res.success) {
          showToast("success", "Property updated successfully.")
          setShowForm(false)
          resetForm()
          fetchProperties()
        } else {
          showToast("error", res.message || "Failed to update property.")
        }
      } else {
        selectedImages.forEach((f) => fd.append("images", f))
        const res = await propertiesApi.create(fd)
        if (res.success) {
          showToast("success", "Property listed successfully.")
          setShowForm(false)
          resetForm()
          fetchProperties()
        } else {
          showToast("error", res.message || "Failed to create property.")
        }
      }
    } catch (err: any) {
      showToast("error", err?.response?.data?.message || err?.message || "Something went wrong.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this property?")) return
    const res = await propertiesApi.delete(id)
    if (res.success) {
      showToast("success", "Property deleted.")
      fetchProperties()
    } else {
      showToast("error", res.message || "Failed to delete.")
    }
  }

  async function handleMarkOccupied(property: IProperty) {
    try {
      const fd = new FormData()
      fd.append("title", property.title)
      fd.append("description", property.description)
      fd.append("rent", property.rent.toString())
      fd.append("bedrooms", property.bedrooms.toString())
      fd.append("bathrooms", property.bathrooms.toString())
      fd.append("size", property.size?.toString() || "")
      fd.append("location[address]", property.location.address)
      fd.append("location[city]", property.location.city)
      fd.append("location[state]", property.location.state)
      property.amenities.forEach((a) => fd.append("amenities", a))
      Object.entries(property.features).forEach(([k, v]) => fd.append(`features[${k}]`, v.toString()))
      Object.entries(property.utilities).forEach(([k, v]) => fd.append(`utilities[${k}]`, v.toString()))
      ;(property.images || []).forEach((url) => fd.append("imagesToKeep", url))
      fd.append("status", "occupied")
      const res = await propertiesApi.update(property._id.toString(), fd)
      if (res.success) {
        showToast("success", "Property marked as occupied.")
        fetchProperties()
      } else {
        showToast("error", res.message || "Failed to update status.")
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update status.")
    }
  }

  async function handleDeleteImage(propertyId: string, index: number) {
    if (!confirm("Remove this image?")) return
    const res = await propertiesApi.deleteImage(propertyId, index)
    if (res.success) {
      showToast("success", "Image removed.")
      fetchProperties()
    } else {
      showToast("error", "Failed to remove image.")
    }
  }

  async function handleViewingAction(id: string, status: "confirmed" | "cancelled" | "completed") {
    const res = await communicationApi.updateViewingStatus(id, status)
    if (res.success) {
      setViewingRequests((prev) => prev.map((v) => (v._id === id ? { ...v, status } : v)))
      showToast("success", `Viewing ${status}.`)
    } else {
      showToast("error", res.message || "Failed to update viewing.")
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setSelectedImages((prev) => [...prev, ...files])
    setImagePreviewUrls((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
  }

  function removeNewImage(index: number) {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  // Computed stats
  const totalProperties = properties.length
  const vacantProperties = properties.filter((p) => p.status === "available").length
  const pendingProperties = properties.filter((p) => p.status === "pending").length
  const totalInquiries = properties.reduce((s, p) => s + (p.inquiries || 0), 0)

  const propertyMatchScores: Record<string, number> = {}
  tenantMatches.forEach((mg: any) => {
    const pid = mg.property._id?.toString()
    if (pid && Array.isArray(mg.matches) && mg.matches.length > 0) {
      propertyMatchScores[pid] = Math.max(...mg.matches.map((m: any) => m.matchScore))
    }
  })

  // Guards
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-900 font-semibold mb-1">Not signed in</p>
          <p className="text-gray-500 text-sm">Please log in as a landlord to continue.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  // Property form (add / edit)
  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Nav */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
                <Home className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 text-sm">RentMatch</span>
            </div>
            <button
              onClick={() => { setShowForm(false); resetForm() }}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              ← Back
            </button>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">
            {editingProperty ? "Edit Property" : "List a New Property"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic info */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Basic Info</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Property Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Modern 2-Bedroom Apartment"
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Annual Rent (₦) *</label>
                  <input
                    type="number"
                    required
                    placeholder="850000"
                    value={formData.rent}
                    onChange={(e) => setFormData((p) => ({ ...p, rent: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Description * (min 20 chars)</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your property..."
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
                />
                <p className={`text-xs mt-1 ${formData.description.length < 20 ? "text-red-500" : "text-gray-400"}`}>
                  {formData.description.length}/2000
                  {formData.description.length < 20 && ` — ${20 - formData.description.length} more needed`}
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Location</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="14 Admiralty Way"
                    value={formData.location.address}
                    onChange={(e) => setFormData((p) => ({ ...p, location: { ...p.location, address: e.target.value } }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="Lagos"
                    value={formData.location.state}
                    onChange={(e) => setFormData((p) => ({ ...p, location: { ...p.location, state: e.target.value } }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">City *</label>
                <select
                  value={formData.location.city}
                  onChange={(e) => setFormData((p) => ({ ...p, location: { ...p.location, city: e.target.value } }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                >
                  <option value="">Select city</option>
                  {["Victoria Island", "Lekki", "Ikeja", "Surulere", "Yaba", "Ikorodu", "Ajah", "Magodo"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Property Details</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Bedrooms *</label>
                  <select
                    value={formData.bedrooms}
                    onChange={(e) => setFormData((p) => ({ ...p, bedrooms: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                  >
                    <option value="">Select</option>
                    {["1", "2", "3", "4", "5"].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Bathrooms *</label>
                  <select
                    value={formData.bathrooms}
                    onChange={(e) => setFormData((p) => ({ ...p, bathrooms: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                  >
                    <option value="">Select</option>
                    {["1", "2", "3", "4"].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Size (sqm)</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={formData.size}
                    onChange={(e) => setFormData((p) => ({ ...p, size: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Amenities *</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {AMENITIES.map((a) => {
                  const checked = formData.amenities.includes(a.id)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        setFormData((p) => ({
                          ...p,
                          amenities: checked ? p.amenities.filter((x) => x !== a.id) : [...p.amenities, a.id],
                        }))
                      }
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                        checked
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <a.icon className="h-4 w-4" />
                      {a.label}
                    </button>
                  )
                })}
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Features</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["furnished", "petFriendly", "parking", "balcony"] as const).map((f) => (
                    <label key={f} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.features[f]}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, features: { ...p.features, [f]: e.target.checked } }))
                        }
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 capitalize">{f === "petFriendly" ? "Pet Friendly" : f}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Utilities Included</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["electricity", "water", "internet", "gas"] as const).map((u) => (
                    <label key={u} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.utilities[u]}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, utilities: { ...p.utilities, [u]: e.target.checked } }))
                        }
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 capitalize">{u}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Photos</h2>

              {editingProperty && imagesToKeep.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Existing photos</p>
                  <div className="grid grid-cols-4 gap-2">
                    {imagesToKeep.map((url, i) => (
                      <div key={url} className="relative group">
                        <img src={url} alt={`img-${i}`} className="w-full h-20 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => {
                            setImagesToKeep((p) => p.filter((u) => u !== url))
                            setImagesToDelete((p) => [...p, url])
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                <input type="file" multiple accept="image/*" onChange={handleImageSelect} className="hidden" id="img-upload" />
                <label
                  htmlFor="img-upload"
                  className="cursor-pointer inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Plus className="h-4 w-4" /> Add photos
                </label>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB each</p>
              </div>

              {imagePreviewUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {imagePreviewUrls.map((url, i) => (
                    <div key={url} className="relative group">
                      <img src={url} alt={`new-${i}`} className="w-full h-20 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removeNewImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {isSubmitting ? "Saving..." : editingProperty ? "Update Property" : "List Property"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm() }}
                className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-gray-900 text-white" : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
              <Home className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">RentMatch</span>
            <span className="hidden sm:inline text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              Landlord
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openAddForm}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Property
            </button>
            <button className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
              <Bell className="h-4 w-4 text-gray-500" />
            </button>
            <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-semibold">
              {user?.name?.[0]?.toUpperCase() ?? "L"}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Properties", value: totalProperties, color: "text-gray-900" },
            { label: "Available", value: vacantProperties, color: "text-emerald-600" },
            { label: "Pending", value: pendingProperties, color: "text-amber-600" },
            { label: "Total Inquiries", value: totalInquiries, color: "text-blue-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-6 bg-white border border-gray-100 rounded-xl p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Properties tab */}
        {activeTab === "properties" && (
          <div>
            {properties.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <Home className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-900 font-semibold mb-1">No properties yet</p>
                <p className="text-gray-500 text-sm mb-4">Add your first property to start attracting tenants.</p>
                <button
                  onClick={openAddForm}
                  className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Property
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {properties.map((property) => {
                  const score = propertyMatchScores[property._id.toString()]
                  return (
                    <div key={property._id.toString()} className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col sm:flex-row">
                      {/* Image */}
                      <div className="sm:w-48 h-40 sm:h-auto shrink-0">
                        <img
                          src={property.images?.[0] || "/placeholder.svg"}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Content */}
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">{property.title}</h3>
                              {statusBadge(property.status)}
                            </div>
                            <div className="flex items-center gap-1 text-gray-500 text-xs">
                              <MapPin className="h-3 w-3" />
                              {property.location.address}, {property.location.city}
                            </div>
                          </div>
                          <p className="text-lg font-bold text-gray-900 shrink-0">
                            ₦{property.rent.toLocaleString()}<span className="text-xs font-normal text-gray-400">/yr</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                          <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{property.bedrooms} bed</span>
                          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{property.bathrooms} bath</span>
                          {property.size && <span>{property.size} sqm</span>}
                          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{property.views} views</span>
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{property.inquiries} inquiries</span>
                        </div>

                        {score !== undefined && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-gray-500">Best match</span>
                            <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-400"}`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{score}%</span>
                          </div>
                        )}

                        {/* Image thumbnails */}
                        {property.images && property.images.length > 1 && (
                          <div className="flex gap-1.5 mb-3">
                            {property.images.slice(1, 5).map((img, i) => (
                              <div key={i} className="relative group">
                                <img src={img} alt="" className="w-14 h-10 object-cover rounded" />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteImage(property._id.toString(), i + 1)}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >×</button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEditForm(property)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(property._id.toString())}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                          {property.status === "available" && (
                            <button
                              onClick={() => handleMarkOccupied(property)}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Mark Occupied
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tenants tab — Matches + Viewings */}
        {activeTab === "tenants" && (
          <div className="space-y-4">
            {/* Sub-nav */}
            <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit">
              {(["matches", "viewings"] as const).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setTenantsSubTab(sub)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    tenantsSubTab === sub ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {sub === "matches" ? "Tenant Matches" : "Viewing Requests"}
                </button>
              ))}
            </div>

            {/* Matches sub-panel */}
            {tenantsSubTab === "matches" && (
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-1">Top Tenant Matches</h2>
                <p className="text-xs text-gray-500 mb-4">Tenants whose preferences align with your listings.</p>
                {loadingMatches ? (
                  <div className="flex justify-center h-32 items-center">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                  </div>
                ) : tenantMatches.length === 0 ? (
                  <p className="text-sm text-gray-400">No matches found yet.</p>
                ) : (
                  <div className="space-y-6">
                    {tenantMatches.map((mg: any) => (
                      <div key={mg.property._id}>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">{mg.property.title}</h3>
                        <div className="space-y-2">
                          {mg.matches.map((m: any) => (
                            <div key={m.tenant._id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{m.tenant.name}</p>
                                <p className="text-xs text-gray-500">{m.preferencesSummary}</p>
                              </div>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                m.matchScore >= 75 ? "bg-emerald-100 text-emerald-700" :
                                m.matchScore >= 50 ? "bg-amber-100 text-amber-700" :
                                "bg-gray-100 text-gray-600"
                              }`}>
                                {m.matchScore}% match
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Viewings sub-panel */}
            {tenantsSubTab === "viewings" && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Viewing Requests</h2>
            <p className="text-xs text-gray-500 mb-4">All viewing requests for your properties.</p>
            {loadingViewings ? (
              <div className="flex justify-center h-32 items-center">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
              </div>
            ) : viewingRequests.length === 0 ? (
              <p className="text-sm text-gray-400">No viewing requests yet.</p>
            ) : (
              <div className="space-y-3">
                {viewingRequests.map((v) => (
                  <div key={v._id} className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {statusBadge(v.status)}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {isProperty(v.propertyId) ? v.propertyId.title : "Property"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Tenant: {hasName(v.tenantId) ? v.tenantId.name : "Unknown"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {v.requestedDate?.slice(0, 10)} at {v.requestedTime}
                      </p>
                      {v.notes && <p className="text-xs text-gray-400 mt-1">{v.notes}</p>}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {v.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleViewingAction(v._id, "confirmed")}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Confirm
                          </button>
                          <button
                            onClick={() => handleViewingAction(v._id, "cancelled")}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Cancel
                          </button>
                        </>
                      )}
                      {v.status === "confirmed" && (
                        <button
                          onClick={() => handleViewingAction(v._id, "completed")}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:border-gray-300 transition-colors"
                        >
                          <Clock className="h-3.5 w-3.5" /> Mark Done
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </div>
        )}

        {/* Analytics tab */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            {/* Market stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: BarChart3,
                  label: "Rent Insights",
                  sub: "Market averages",
                  color: "text-blue-600",
                  content: marketStatsLoading ? "Loading..." : marketStatsError ? marketStatsError : marketStats ? (
                    `Avg ₦${marketStats.avgRent?.toLocaleString() || "-"} · Min ₦${marketStats.minRent?.toLocaleString() || "-"} · Max ₦${marketStats.maxRent?.toLocaleString() || "-"}`
                  ) : null,
                },
                {
                  icon: MapPin,
                  label: "Top City",
                  sub: "Most active by listings",
                  color: "text-cyan-600",
                  content: marketStatsLoading ? "Loading..." : marketStatsError ? marketStatsError : marketStats ? (
                    `${marketStats.topCities?.[0]?.["_id"] || "-"} — ${marketStats.topCities?.[0]?.count || 0} properties`
                  ) : null,
                },
                {
                  icon: Plus,
                  label: "Recent Listings",
                  sub: "New in last 30 days",
                  color: "text-emerald-600",
                  content: marketStatsLoading ? "Loading..." : marketStatsError ? marketStatsError : marketStats ? (
                    `${marketStats.recentProperties ?? 0} new properties`
                  ) : null,
                },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{card.label}</p>
                      <p className="text-xs text-gray-400">{card.sub}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{card.content}</p>
                </div>
              ))}
            </div>

            {/* Occupancy */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Occupancy Breakdown</h3>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-gray-500 w-16">Occupied</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${totalProperties > 0 ? (properties.filter((p) => p.status === "occupied").length / totalProperties) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700">{properties.filter((p) => p.status === "occupied").length}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16">Available</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${totalProperties > 0 ? (vacantProperties / totalProperties) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700">{vacantProperties}</span>
              </div>
            </div>

            {/* Top properties */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Properties by Inquiries</h3>
              {properties.length === 0 ? (
                <p className="text-sm text-gray-400">No properties yet.</p>
              ) : (
                <div className="space-y-2">
                  {[...properties]
                    .sort((a, b) => (b.inquiries || 0) - (a.inquiries || 0))
                    .slice(0, 3)
                    .map((p, i) => (
                      <div key={p._id.toString()} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-gray-400 w-4">{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.title}</p>
                            <p className="text-xs text-gray-400">{p.location.city}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-blue-600 font-semibold">{p.inquiries} inq</span>
                          <span className="text-gray-400">{p.views} views</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Finance tab — Rent Payments + Reviews */}
        {activeTab === "finance" && (
          <div className="space-y-4">
            {/* Sub-nav */}
            <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit">
              {(["rent-payments", "reviews"] as const).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setFinanceSubTab(sub)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    financeSubTab === sub ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {sub === "rent-payments" ? "Rent Payments" : "Reviews"}
                </button>
              ))}
            </div>

            {financeSubTab === "rent-payments" && (
            <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Rent Payment Tracker</h2>
                <p className="text-xs text-gray-500 mt-0.5">Log and track monthly rent from tenants across your properties.</p>
              </div>
              <button
                onClick={() => setShowRentForm((v) => !v)}
                className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Log Payment
              </button>
            </div>

            {showRentForm && (
              <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Record Rent Payment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1.5">Property *</label>
                    <select
                      value={rentFormData.propertyId}
                      onChange={(e) => setRentFormData((p) => ({ ...p, propertyId: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      <option value="">Select property</option>
                      {properties.map((p) => (
                        <option key={p._id.toString()} value={p._id.toString()}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1.5">Tenant Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Aisha Bello"
                      value={rentFormData.tenantName}
                      onChange={(e) => setRentFormData((p) => ({ ...p, tenantName: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1.5">Amount (₦) *</label>
                    <input
                      type="number"
                      placeholder="850000"
                      value={rentFormData.amount}
                      onChange={(e) => setRentFormData((p) => ({ ...p, amount: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1.5">Month *</label>
                    <input
                      type="month"
                      value={rentFormData.month}
                      onChange={(e) => setRentFormData((p) => ({ ...p, month: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1.5">Status</label>
                    <select
                      value={rentFormData.status}
                      onChange={(e) => setRentFormData((p) => ({ ...p, status: e.target.value as any }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="late">Late</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1.5">Notes</label>
                    <input
                      type="text"
                      placeholder="e.g., Paid via transfer"
                      value={rentFormData.notes}
                      onChange={(e) => setRentFormData((p) => ({ ...p, notes: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleAddRentPayment}
                    className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Save Record
                  </button>
                  <button
                    onClick={() => setShowRentForm(false)}
                    className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Collected", value: `₦${rentPayments.filter((r) => r.status === "paid").reduce((s: number, r: any) => s + Number(r.amount), 0).toLocaleString()}`, color: "text-green-600" },
                { label: "Pending", value: rentPayments.filter((r) => r.status === "pending").length, color: "text-yellow-600" },
                { label: "Late", value: rentPayments.filter((r) => r.status === "late").length, color: "text-red-600" },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {rentPayments.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
                <Receipt className="h-9 w-9 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-1">No rent payments logged yet</p>
                <p className="text-xs text-gray-400">Click "Log Payment" to start tracking rent.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {rentPayments.map((r: any, i: number) => {
                  const property = properties.find((p) => p._id.toString() === r.propertyId)
                  const statusCls = r.status === "paid" ? "bg-green-100 text-green-700" : r.status === "late" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"
                  return (
                    <div key={r._id} className={`flex items-center gap-4 p-4 ${i < rentPayments.length - 1 ? "border-b border-gray-50" : ""}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${r.status === "paid" ? "bg-green-100" : "bg-yellow-100"}`}>
                        <CreditCard className={`h-4 w-4 ${r.status === "paid" ? "text-green-600" : "text-yellow-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.tenantName}</p>
                        <p className="text-xs text-gray-400">{property?.title || "Unknown Property"} · {r.month}</p>
                        {r.notes && <p className="text-xs text-gray-400 italic">{r.notes}</p>}
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">₦{Number(r.amount).toLocaleString()}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>{r.status}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteRentPayment(r._id)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            </div>
            )}

            {financeSubTab === "reviews" && (
            <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Tenant Reviews</h2>
            {loadingReviews ? (
              <div className="flex justify-center py-12">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
              </div>
            ) : allReviews.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
                <Star className="h-9 w-9 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-1">No reviews yet</p>
                <p className="text-xs text-gray-400">Reviews appear here after tenants complete viewings.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allReviews.map((review) => {
                  const property = properties.find((p) => p._id.toString() === review.propertyId)
                  return (
                    <div key={review._id} className="bg-white rounded-xl border border-gray-100 p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{review.tenantName || "Anonymous Tenant"}</p>
                          <p className="text-xs text-gray-400">{property?.title || "Property"}</p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-4 w-4 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(review.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  )
                })}
                {/* Average rating */}
                {allReviews.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
                    <div className="text-4xl font-black text-gray-900">
                      {(allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s <= Math.round(allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">Based on {allReviews.length} review{allReviews.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
            )}
          </div>
        )}

        {/* Account tab — Subscription + Profile */}
        {activeTab === "account" && (
          <div className="space-y-4">
            {/* Sub-nav */}
            <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit">
              {(["subscription", "profile"] as const).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setAccountSubTab(sub)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    accountSubTab === sub ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {sub === "subscription" ? "Subscription" : "Profile"}
                </button>
              ))}
            </div>

            {accountSubTab === "subscription" && (
            <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Subscription Plan</h2>
              <p className="text-xs text-gray-500 mt-0.5">Choose a plan to unlock more listings and features.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  name: "Starter",
                  planKey: null as null | "pro" | "enterprise",
                  price: "Free",
                  color: "border-gray-200",
                  badge: null as string | null,
                  features: ["Up to 3 listings", "Basic matching", "Email support", "Tenant messaging"],
                },
                {
                  name: "Pro",
                  planKey: "pro" as "pro" | "enterprise",
                  price: "₦15,000/mo",
                  color: "border-blue-500",
                  badge: "Most Popular",
                  features: ["Up to 20 listings", "Priority matching", "Featured listings", "Analytics dashboard", "Priority support"],
                },
                {
                  name: "Enterprise",
                  planKey: "enterprise" as "pro" | "enterprise",
                  price: "₦45,000/mo",
                  color: "border-purple-500",
                  badge: "Best Value",
                  features: ["Unlimited listings", "AI-powered matching", "Custom subdomain", "Dedicated account manager", "API access", "White-label options"],
                },
              ].map((plan) => (
                <div key={plan.name} className={`bg-white rounded-xl border-2 ${plan.color} p-6 relative`}>
                  {plan.badge && (
                    <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full ${plan.name === "Pro" ? "bg-blue-600 text-white" : "bg-purple-600 text-white"}`}>
                      {plan.badge}
                    </span>
                  )}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className={`h-4 w-4 ${plan.name === "Enterprise" ? "text-purple-500" : plan.name === "Pro" ? "text-blue-500" : "text-gray-400"}`} />
                      <h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{plan.price}</p>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan.planKey ? (
                    <button
                      onClick={() => handleUpgrade(plan.planKey!)}
                      disabled={upgradingPlan === plan.planKey}
                      className={`w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 ${
                        plan.name === "Enterprise"
                          ? "bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                          : "bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      }`}
                    >
                      {upgradingPlan === plan.planKey
                        ? "Redirecting to Stripe..."
                        : plan.name === "Enterprise" ? "Contact Sales" : "Upgrade to Pro"}
                    </button>
                  ) : (
                    <button disabled className="w-full py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-500 cursor-default">
                      Current Plan
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Why upgrade?</p>
                <p className="text-sm text-blue-700">Pro landlords get 3× more tenant matches and their listings appear first in search results. Most landlords on Pro fill vacancies in under 2 weeks.</p>
              </div>
            </div>
            </div>
            )}

            {accountSubTab === "profile" && <ProfileManager />}
          </div>
        )}

        {/* Messages tab */}
        {activeTab === "communications" && (
          <MessageCenter userId={getUserId(user || {}) || ""} userType="landlord" />
        )}
      </div>
    </div>
  )
}
