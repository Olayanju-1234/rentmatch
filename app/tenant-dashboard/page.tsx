"use client";

import { useState, useEffect } from "react";
import {
  MapPin, Home, Heart, Search, Star, Bath, Bed, MessageSquare,
  Calendar, BarChart3, Settings, Bell, CreditCard, ChevronRight,
  RefreshCw, CheckCircle, Clock, XCircle, LogOut, User, Filter,
} from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { tenantsApi } from "@/src/lib/tenantsApi";
import { optimizationApi } from "@/src/lib/optimizationApi";
import { propertiesApi } from "@/src/lib/propertiesApi";
import { communicationApi } from "@/src/lib/communicationApi";
import { paymentsApi } from "@/src/lib/paymentsApi";
import { PreferencesModal } from "@/components/tenant/PreferencesModal";
import { MessageCenter } from "@/components/communication/MessageCenter";
import { ProfileManager } from "@/components/profile/ProfileManager";
import { RequestViewingModal } from "@/components/common/RequestViewingModal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { convertBackendToFrontend } from "@/src/utils/typeConversion";
import type { ITenant, PropertyMatch, IProperty } from "@/src/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

type Tab = "matches" | "viewings" | "saved" | "preferences" | "messages" | "analytics" | "profile";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  confirmed: "bg-green-50 text-green-700 border border-green-200",
  cancelled: "bg-red-50 text-red-700 border border-red-200",
  completed: "bg-gray-50 text-gray-600 border border-gray-200",
};

export default function TenantDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [tenant, setTenant] = useState<ITenant | null>(null);
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [properties, setProperties] = useState<IProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMatches, setFetchingMatches] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("matches");
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [viewingPropertyId, setViewingPropertyId] = useState<string | null>(null);
  const [viewings, setViewings] = useState<any[]>([]);
  const [loadingViewings, setLoadingViewings] = useState(false);
  const [depositStatuses, setDepositStatuses] = useState<Record<string, string>>({});

  const fetchViewings = async () => {
    if (!user) return;
    setLoadingViewings(true);
    try {
      const response = await communicationApi.getViewings(undefined, undefined, undefined, "tenant");
      if (response.success) {
        const converted = (response.data ?? []).map((v: any) => convertBackendToFrontend.viewing(v));
        setViewings(converted);
        const confirmed = converted.filter((v: any) => v.status === "confirmed");
        const statuses: Record<string, string> = {};
        await Promise.all(confirmed.map(async (v: any) => {
          try {
            const res = await paymentsApi.getDepositStatus(v._id);
            if (res.success && res.data) statuses[v._id] = res.data.status;
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
  };

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
    try {
      const tenantId = user.tenantId || user._id;
      await tenantsApi.addSavedProperty(tenantId, propertyId);
      const res = await tenantsApi.getProfile(tenantId);
      if (res.success && res.data) setTenant(convertBackendToFrontend.tenant(res.data));
      toast({ title: "Saved", description: "Property added to your saved list." });
    } catch {
      toast({ title: "Error", description: "Failed to save property.", variant: "destructive" });
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

  const handlePayDeposit = async (viewingId: string) => {
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
  };

  const bestMatch = matches.length > 0 ? Math.round(Math.max(...matches.map((m) => m.matchScore))) : null;
  const avgMatch = matches.length > 0 ? Math.round(matches.reduce((s, m) => s + m.matchScore, 0) / matches.length) : null;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
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
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-blue-700">
                {user.name?.charAt(0).toUpperCase()}
              </span>
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

            {matches.map((match) => {
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

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveProperty(match.propertyId)}
                          className="flex items-center gap-1.5 text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600"
                        >
                          <Heart className="h-3.5 w-3.5" /> Save
                        </button>
                        <button
                          onClick={() => { if (property) { setViewingPropertyId(property._id); setShowViewingModal(true); } }}
                          className="flex items-center gap-1.5 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700"
                        >
                          <Calendar className="h-3.5 w-3.5" /> Request Viewing
                        </button>
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
            <h2 className="text-base font-semibold text-gray-900">Viewing Requests</h2>
            {loadingViewings ? (
              <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
            ) : viewings.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
                <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">No viewing requests</h3>
                <p className="text-sm text-gray-500">Request a viewing from your matched properties.</p>
              </div>
            ) : (
              viewings.map((viewing) => (
                <div key={viewing._id} className="bg-white border border-gray-100 rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[viewing.status] || "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                          {viewing.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-0.5 truncate">
                        {viewing.propertyId?.title || "Unknown Property"}
                      </h3>
                      {viewing.propertyId?.location && (
                        <p className="text-xs text-gray-400 mb-2">
                          {viewing.propertyId.location.address}, {viewing.propertyId.location.city}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{viewing.landlordId?.name || "Landlord"}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{viewing.requestedDate?.slice(0, 10)}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{viewing.requestedTime}</span>
                      </div>
                      {viewing.notes && <p className="text-xs text-gray-400 mt-1">Notes: {viewing.notes}</p>}
                    </div>

                    {viewing.status === "confirmed" && (
                      <div className="ml-4 shrink-0 text-right">
                        {depositStatuses[viewing._id] === "paid" ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                              <CheckCircle className="h-3.5 w-3.5" /> Deposit Paid
                            </span>
                            <p className="text-xs text-gray-400 mt-1">Refunded after viewing</p>
                          </div>
                        ) : (
                          <div>
                            <button
                              onClick={() => handlePayDeposit(viewing._id)}
                              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                            >
                              <CreditCard className="h-3.5 w-3.5" /> Pay £50 Deposit
                            </button>
                            <p className="text-xs text-gray-400 mt-1">Refunded after viewing</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Saved */}
        {activeTab === "saved" && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Saved Properties</h2>
            {!tenant?.savedProperties?.length ? (
              <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
                <Heart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">No saved properties</h3>
                <p className="text-sm text-gray-500">Save properties from your matches to find them here.</p>
              </div>
            ) : (
              tenant.savedProperties.map((propertyId) => {
                const property = properties.find((p) => p._id === propertyId);
                if (!property) return null;
                return (
                  <div key={propertyId} className="bg-white border border-gray-100 rounded-xl overflow-hidden flex">
                    <img src={property.images?.[0] || "/placeholder.svg"} alt={property.title} className="w-32 h-24 object-cover shrink-0" />
                    <div className="flex-1 p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 text-sm">{property.title}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{property.location?.city}, {property.location?.state}</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">₦{property.rent?.toLocaleString()}/yr</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${property.status === "available" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {property.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
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
            {user && <MessageCenter userId={user._id} userType="tenant" />}
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
            <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
              <BarChart3 className="h-8 w-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Activity charts coming soon</p>
            </div>
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
