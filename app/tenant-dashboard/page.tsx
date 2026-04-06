"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Home,
  Car,
  Wifi,
  Zap,
  Droplets,
  Shield,
  Heart,
  Eye,
  Filter,
  Settings,
  Bell,
  Search,
  Star,
  Bath,
  Bed,
  MessageSquare,
  Calendar,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { tenantsApi } from "@/src/lib/tenantsApi";
import { optimizationApi } from "@/src/lib/optimizationApi";
import { propertiesApi } from "@/src/lib/propertiesApi";
import { PreferencesModal } from "@/components/tenant/PreferencesModal";
import { Header } from "@/components/layout/Header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MessageCenter } from "@/components/communication/MessageCenter";
import { ProfileManager } from "@/components/profile/ProfileManager";
import { convertBackendToFrontend } from "@/src/utils/typeConversion";
import type { ITenant, PropertyMatch, IProperty } from "@/src/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { communicationApi } from "@/src/lib/communicationApi";
import { RequestViewingModal } from "@/components/common/RequestViewingModal";
import { paymentsApi } from "@/src/lib/paymentsApi";
import { CreditCard } from "lucide-react";

export default function TenantDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<ITenant | null>(null);
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [properties, setProperties] = useState<IProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [fetchingMatches, setFetchingMatches] = useState(false);
  const [updatingPreferences, setUpdatingPreferences] = useState(false);
  const [activeTab, setActiveTab] = useState("matches");
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [viewingPropertyId, setViewingPropertyId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [viewings, setViewings] = useState<any[]>([]);
  const [loadingViewings, setLoadingViewings] = useState(false);

  // Add a function to fetch viewing requests (reuse logic from useEffect)
  const fetchViewings = async () => {
    if (!user) return;
    setLoadingViewings(true);
    try {
      const response = await communicationApi.getViewings(undefined, undefined, undefined, 'tenant');
      if (response.success) {
        setViewings((response.data ?? []).map((v: any) => convertBackendToFrontend.viewing(v)));
      } else {
        setViewings([]);
      }
    } catch {
      setViewings([]);
    } finally {
      setLoadingViewings(false);
    }
  };

  // Fetch tenant profile and preferences
  useEffect(() => {
    if (!user || authLoading || user.userType !== "tenant") return;

    const fetchTenantData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        // Use tenantId from user object if available, otherwise use user._id
        const tenantId = user.tenantId || user._id;
        console.log("Fetching tenant data with ID:", tenantId);

        const res = await tenantsApi.getProfile(tenantId);

        if (res.success && res.data) {
          const convertedTenant = convertBackendToFrontend.tenant(res.data);
          setTenant(convertedTenant);
          // If no preferences, show modal
          if (
            !res.data.preferences ||
            !res.data.preferences.preferredLocation
          ) {
            setShowPreferencesModal(true);
          } else {
            await fetchMatches(convertedTenant);
          }
        } else {
          console.error("Failed to fetch tenant profile:", res.message);
          // If tenant profile doesn't exist, show preferences modal
          setShowPreferencesModal(true);
        }
      } catch (error) {
        setFetchError("Failed to load tenant data.");
        toast({
          title: "Error loading tenant data",
          description: "Could not fetch tenant profile. Please try again.",
          variant: "destructive",
        });
        setShowPreferencesModal(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantData();
  }, [user, authLoading, toast]);

  useEffect(() => {
    if (!user) return;
    fetchViewings();
  }, [user]);

  // Fetch property matches from optimization API
  const fetchMatches = async (tenantData: ITenant) => {
    if (!tenantData._id) {
      console.error("No tenant ID available for fetching matches");
      return;
    }

    setFetchingMatches(true);
    try {
      const res = await optimizationApi.findMatches(tenantData._id);
      if (res.success && res.data && res.data.matches) {
        const convertedMatches = res.data.matches.map((match) =>
          convertBackendToFrontend.propertyMatch(match)
        );
        setMatches(convertedMatches);

        // Fetch property details for each match
        const propertyIds = convertedMatches.map((match) => match.propertyId);
        await fetchPropertyDetails(propertyIds);
      } else {
        setMatches([]);
        console.log("No matches found or API error:", res.message);
      }
    } catch (error) {
      console.error("Error fetching matches:", error);
      setMatches([]);
      toast({
        title: "Error",
        description: "Failed to fetch property matches. Please try again.",
        variant: "destructive",
      });
    } finally {
      setFetchingMatches(false);
    }
  };

  // Fetch property details for matches
  const fetchPropertyDetails = async (propertyIds: string[]) => {
    try {
      const propertyPromises = propertyIds.map((id) =>
        propertiesApi.getById(id)
      );
      const propertyResults = await Promise.allSettled(propertyPromises);

      const validProperties = propertyResults
        .filter(
          (result): result is PromiseFulfilledResult<any> =>
            result.status === "fulfilled"
        )
        .map((result) => convertBackendToFrontend.property(result.value.data))
        .filter(Boolean);

      setProperties(validProperties);
    } catch (error) {
      console.error("Error fetching property details:", error);
    }
  };

  // Handler for when preferences are saved in modal
  const handlePreferencesSaved = async () => {
    if (!user) return;
    setShowPreferencesModal(false);
    setLoading(true);

    try {
      const tenantId = user.tenantId || user._id;
      const res = await tenantsApi.getProfile(tenantId);
      if (res.success && res.data) {
        setTenant(convertBackendToFrontend.tenant(res.data));
        await fetchMatches(convertBackendToFrontend.tenant(res.data));
        toast({
          title: "Preferences Saved!",
          description:
            "Your preferences have been updated and we're finding new matches for you.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error after saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler for updating preferences from preferences tab
  const handleUpdatePreferences = async (
    preferences: ITenant["preferences"]
  ) => {
    if (!user) return;
    setUpdatingPreferences(true);

    try {
      const tenantId = user.tenantId || user._id;
      const res = await tenantsApi.updatePreferences(tenantId, { preferences });

      if (res.success) {
        // Refetch tenant data and matches
        const tenantRes = await tenantsApi.getProfile(tenantId);
        if (tenantRes.success && tenantRes.data) {
          setTenant(convertBackendToFrontend.tenant(tenantRes.data));
          await fetchMatches(convertBackendToFrontend.tenant(tenantRes.data));
          toast({
            title: "Preferences Updated!",
            description:
              "Your preferences have been updated and we're finding new matches for you.",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Error",
          description: res.message || "Failed to update preferences",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingPreferences(false);
    }
  };

  // Handle saving/unsaving properties
  const handleSaveProperty = async (propertyId: string) => {
    if (!user) return;

    try {
      const tenantId = user.tenantId || user._id;
      const res = await tenantsApi.addSavedProperty(tenantId, propertyId);

      if (res.success) {
        toast({
          title: "Property Saved!",
          description: "Property has been added to your saved list.",
          variant: "default",
        });
        // Refresh tenant data to update saved properties
        const tenantRes = await tenantsApi.getProfile(tenantId);
        if (tenantRes.success && tenantRes.data) {
          setTenant(convertBackendToFrontend.tenant(tenantRes.data));
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save property. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle requesting viewing
  const handleRequestViewing = async (propertyId: string) => {
    if (!user) return;

    // Find the property and landlordId
    const property = properties.find((p) => p._id === propertyId);
    let landlordId = property?.landlordId;
    if (typeof landlordId === 'object' && landlordId !== null) {
      const lid: any = landlordId;
      landlordId = lid._id || lid.id || '';
    }
    landlordId = landlordId?.toString() || '';

    // Collect requestedDate and requestedTime from user input (use prompt for now)
    const requestedDate = prompt("Enter requested date (YYYY-MM-DD):");
    const requestedTime = prompt("Enter requested time (HH:mm):");
    const message = prompt("Optional message to landlord:");

    if (!landlordId || !requestedDate || !requestedTime) {
      toast({
        title: "Error",
        description: "Please provide all required details.",
        variant: "destructive",
      });
      return;
    }

    try {
      const tenantId = user.tenantId || user._id;
      const res = await tenantsApi.requestViewing(tenantId, {
        propertyId,
        landlordId,
        requestedDate: requestedDate ?? undefined,
        requestedTime: requestedTime ?? undefined,
        message: message ?? undefined,
      });

      if (res.success) {
        toast({
          title: "Viewing Requested!",
          description:
            "Your viewing request has been sent to the property manager.",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request viewing. Please try again.",
        variant: "destructive",
      });
    }
  };

  // New handler for submitting viewing request
  const handleSubmitViewing = async ({ propertyId, requestedDate, requestedTime, notes }: { propertyId: string, requestedDate: string, requestedTime: string, notes?: string }) => {
    if (!user) return;
    const property = properties.find((p) => p._id === propertyId);
    let landlordId = property?.landlordId;
    if (typeof landlordId === 'object' && landlordId !== null) {
      const lid: any = landlordId;
      landlordId = lid._id || lid.id || '';
    }
    landlordId = landlordId?.toString() || '';
    if (!landlordId || !requestedDate || !requestedTime) {
      toast({
        title: "Error",
        description: "Please provide all required details.",
        variant: "destructive",
      });
      return;
    }
    try {
      const tenantId = user.tenantId || user._id;
      const res = await tenantsApi.requestViewing(tenantId, {
        propertyId,
        landlordId,
        requestedDate,
        requestedTime,
        message: notes,
      });
      if (res.success) {
        toast({
          title: "Viewing Requested!",
          description: "Your viewing request has been sent to the property manager.",
          variant: "default",
        });
        setShowViewingModal(false);
        await fetchViewings();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request viewing. Please try again.",
        variant: "destructive",
      });
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

  // Replace openViewingModal to set propertyId for modal
  const openViewingModal = (property: IProperty) => {
    setViewingPropertyId(property._id);
    setShowViewingModal(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Only allow tenants
  if (!user || user.userType !== "tenant") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">
            You must be logged in as a tenant to view this dashboard.
          </h2>
          <p className="text-gray-500">
            Please log in with a tenant account and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userType="tenant" userName={user.name} />

      <PreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        onPreferencesSaved={handlePreferencesSaved}
        preferences={tenant?.preferences}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name}!
          </h2>
          <p className="text-gray-600">
            {fetchingMatches ? (
              <span className="flex items-center">
                <LoadingSpinner size="sm" className="mr-2" />
                Finding your best matches...
              </span>
            ) : (
              <>
                We found {matches.length} properties that match your preferences
              </>
            )}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-8">
            <span className="text-red-500 mb-2">{fetchError}</span>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <div className="flex justify-start mb-6">
              <TabsList className="flex gap-4 bg-muted rounded-md p-1">
                <TabsTrigger value="matches">My Matches</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="saved">Saved Properties</TabsTrigger>
                <TabsTrigger value="viewing-requests">Viewing Requests{viewings.length > 0 ? ` (${viewings.length})` : ''}</TabsTrigger>
                <TabsTrigger value="communications">Messages</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="matches" className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Total Matches
                        </p>
                        <p className="text-3xl font-bold text-blue-600">
                          {matches.length}
                        </p>
                      </div>
                      <Search className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Best Match
                        </p>
                        <p className="text-3xl font-bold text-green-600">
                          {matches.length > 0
                            ? `${Math.round(
                                Math.max(...matches.map((m) => m.matchScore))
                              )}%`
                            : "-"}
                        </p>
                      </div>
                      <Star className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Avg. Compatibility
                        </p>
                        <p className="text-3xl font-bold text-purple-600">
                          {matches.length > 0
                            ? `${Math.round(
                                matches.reduce(
                                  (sum, m) => sum + m.matchScore,
                                  0
                                ) / matches.length
                              )}%`
                            : "-"}
                        </p>
                      </div>
                      <Heart className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Property Matches */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Your Top Matches
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={fetchingMatches}
                    onClick={() => tenant && fetchMatches(tenant)}
                  >
                    {fetchingMatches ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Filter className="h-4 w-4 mr-2" />
                    )}
                    Refresh Results
                  </Button>
                </div>

                {matches.length === 0 && !fetchingMatches && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Matches Yet
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {tenant?.preferences
                          ? "We couldn't find properties matching your current preferences. Try adjusting your criteria."
                          : "Set up your preferences to get personalized property recommendations."}
                      </p>
                      <Button onClick={() => setShowPreferencesModal(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        {tenant?.preferences
                          ? "Update Preferences"
                          : "Set Preferences"}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {fetchingMatches && (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" />
                  </div>
                )}

                {matches.map((match) => {
                  const property = properties.find(
                    (p) => p._id === match.propertyId
                  );

                  return (
                    <Card
                      key={match.propertyId}
                      className="overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="md:flex">
                        <div className="md:w-1/3">
                          <img
                            src={property?.images?.[0] || "/placeholder.svg"}
                            alt={property?.title || "Property"}
                            className="w-full h-48 md:h-full object-cover"
                          />
                        </div>
                        <div className="md:w-2/3 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                                {property?.title ||
                                  `Property ${match.propertyId}`}
                              </h4>
                              <div className="flex items-center text-gray-600 mb-2">
                                <MapPin className="h-4 w-4 mr-1" />
                                <span className="text-sm">
                                  {property?.location
                                    ? `${property.location.address}, ${property.location.city}`
                                    : "Location not available"}
                                </span>
                              </div>
                              {property?.rent && (
                                <p className="text-2xl font-bold text-blue-600">
                                  ₦{property.rent.toLocaleString()}/year
                                </p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <Badge variant="secondary" className="text-sm mb-2">
                                {Math.round(match.matchScore)}% Match
                              </Badge>
                              <Progress
                                value={match.matchScore}
                                className="w-24"
                              />
                            </div>
                          </div>

                          {property && (
                            <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Bed className="h-4 w-4 mr-1" />
                                <span>{property.bedrooms} bed</span>
                              </div>
                              <div className="flex items-center">
                                <Bath className="h-4 w-4 mr-1" />
                                <span>{property.bathrooms} bath</span>
                              </div>
                              {property.size && (
                                <div className="flex items-center">
                                  <span>{property.size} sqm</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">
                              Why this matches:
                            </h5>
                            <ul className="text-sm text-green-700 space-y-1">
                              {match.explanation.map((reason, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="text-green-500 mr-2">•</span>
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSaveProperty(match.propertyId)}
                            >
                              <Heart className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                property && openViewingModal(property)
                              }
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Request Viewing
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Your Preferences
                  </CardTitle>
                  <CardDescription>
                    Adjust your preferences to get better property matches
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {tenant?.preferences ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">
                            Budget Range
                          </Label>
                          <p className="text-sm text-gray-600">
                            ₦{tenant.preferences.budget?.min?.toLocaleString()} -
                            ₦{tenant.preferences.budget?.max?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">
                            Preferred Location
                          </Label>
                          <p className="text-sm text-gray-600">
                            {tenant.preferences.preferredLocation}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Bedrooms</Label>
                          <p className="text-sm text-gray-600">
                            {tenant.preferences.preferredBedrooms}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Bathrooms</Label>
                          <p className="text-sm text-gray-600">
                            {tenant.preferences.preferredBathrooms}
                          </p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">
                          Required Amenities
                        </Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {tenant.preferences.requiredAmenities?.map(
                            (amenity, index) => (
                              <Badge key={index} variant="outline">
                                {amenity}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                      {/* Preferred Features */}
                      {tenant?.preferences?.features && (
                        <div>
                          <div className="font-medium mt-4">
                            Preferred Features
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {Object.entries(tenant.preferences.features)
                              .filter(([_, v]) => v)
                              .map(([feature]) => (
                                <span
                                  key={feature}
                                  className="px-2 py-1 bg-gray-100 rounded text-sm"
                                >
                                  {feature}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Preferred Utilities */}
                      {tenant?.preferences?.utilities && (
                        <div>
                          <div className="font-medium mt-4">
                            Preferred Utilities
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {Object.entries(tenant.preferences.utilities)
                              .filter(([_, v]) => v)
                              .map(([utility]) => (
                                <span
                                  key={utility}
                                  className="px-2 py-1 bg-gray-100 rounded text-sm"
                                >
                                  {utility}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Preferences Set
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Set your preferences to get personalized property
                        recommendations.
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={() => setShowPreferencesModal(true)}
                    disabled={updatingPreferences}
                  >
                    {updatingPreferences ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Settings className="h-4 w-4 mr-2" />
                    )}
                    {tenant?.preferences ? "Edit Preferences" : "Set Preferences"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="saved" className="space-y-6">
              {tenant?.savedProperties && tenant.savedProperties.length > 0 ? (
                <div className="space-y-6">
                  {tenant.savedProperties.map((propertyId) => {
                    const property = properties.find((p) => p._id === propertyId);
                    return property ? (
                      <Card key={propertyId} className="overflow-hidden">
                        <div className="md:flex">
                          <div className="md:w-1/3">
                            <img
                              src={property.images?.[0] || "/placeholder.svg"}
                              alt={property.title}
                              className="w-full h-48 md:h-full object-cover"
                            />
                          </div>
                          <div className="md:w-2/3 p-6">
                            <h4 className="text-xl font-semibold text-gray-900 mb-2">
                              {property.title}
                            </h4>
                            <div className="flex items-center text-gray-600 mb-2">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span className="text-sm">
                                {property.location.address},{" "}
                                {property.location.city}
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-blue-600 mb-4">
                              ₦{property.rent.toLocaleString()}/year
                            </p>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Heart className="h-4 w-4 mr-2" />
                                Save
                              </Button>
                              <Button variant="outline" size="sm">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Contact
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ) : null;
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Saved Properties Yet
                    </h3>
                    <p className="text-gray-600">
                      Properties you save will appear here for easy access later.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="viewing-requests" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Viewing Requests</CardTitle>
                  <CardDescription>Your property viewing requests and their status.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingViewings ? (
                    <div className="flex justify-center items-center h-40">
                      <LoadingSpinner />
                    </div>
                  ) : viewings.length === 0 ? (
                    <p>No viewing requests found.</p>
                  ) : (
                    <div className="space-y-3">
                      {viewings.map((viewing) => (
                        <Card key={viewing._id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge>{viewing.status}</Badge>
                                </div>
                                <h4 className="font-semibold">
                                  Property: {viewing.propertyId?.title || 'Unknown Property'}
                                  {viewing.propertyId?.location && (
                                    <span className="block text-xs text-gray-500">
                                      {viewing.propertyId.location.address}, {viewing.propertyId.location.city}
                                    </span>
                                  )}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Landlord: {viewing.landlordId?.name || 'Unknown User'}
                                  {viewing.landlordId?.email && (
                                    <span className="block text-xs text-gray-500">{viewing.landlordId.email}</span>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Date: {viewing.requestedDate?.slice(0, 10)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Time: {viewing.requestedTime}
                                </p>
                                {viewing.notes && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Notes: {viewing.notes}
                                  </p>
                                )}
                              </div>
                              {viewing.status === "confirmed" && (
                                <div className="flex flex-col items-end gap-2 ml-4">
                                  <Button
                                    size="sm"
                                    onClick={() => handlePayDeposit(viewing._id)}
                                    className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
                                  >
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Pay £50 Deposit
                                  </Button>
                                  <p className="text-xs text-muted-foreground text-right">Refunded after viewing</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="communications" className="space-y-6">
              {user && <MessageCenter userId={user._id} userType="tenant" />}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Matches</p>
                        <p className="text-3xl font-bold text-blue-600">{matches.length}</p>
                      </div>
                      <Search className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Viewing Requests</p>
                        <p className="text-3xl font-bold text-green-600">{viewings.length}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Saved Properties</p>
                        <p className="text-3xl font-bold text-purple-600">{tenant?.savedProperties?.length || 0}</p>
                      </div>
                      <Heart className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Best Match Score</p>
                        <p className="text-3xl font-bold text-orange-600">{matches.length > 0 ? `${Math.round(Math.max(...matches.map((m) => m.matchScore)))}%` : '-'}</p>
                      </div>
                      <Star className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Average Match Score</p>
                        <p className="text-3xl font-bold text-cyan-600">{matches.length > 0 ? `${Math.round(matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length)}%` : '-'}</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-cyan-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Your Activity Over Time</CardTitle>
                  <CardDescription>Coming soon: Visualize your property search and engagement trends.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-32 flex items-center justify-center text-gray-400 bg-gray-50 rounded-md border border-dashed border-gray-200">
                    <span>Analytics chart coming soon!</span>
                  </div>
                </CardContent>
              </Card>
              {/* List all saved properties and their status */}
              <Card>
                <CardHeader>
                  <CardTitle>Saved Properties Status</CardTitle>
                  <CardDescription>See the current status of all properties you have saved.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(tenant?.savedProperties || []).map((propertyId) => {
                      const property = properties.find((p) => p._id === propertyId);
                      return (
                        <div key={propertyId} className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-2 last:border-b-0 last:pb-0">
                          <div>
                            <span className="font-semibold">{property?.title || 'Unknown Property'}</span>
                            {property?.location && (
                              <span className="ml-2 text-xs text-gray-500">{property.location.address}, {property.location.city}</span>
                            )}
                            {property?.rent && (
                              <span className="ml-2 text-xs text-blue-600">₦{property.rent.toLocaleString()}/year</span>
                            )}
                          </div>
                          <div>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${property ? (property.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700') : 'bg-red-100 text-red-700'}`}>
                              {property ? property.status : 'Deleted/Unavailable'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {(!tenant?.savedProperties || tenant.savedProperties.length === 0) && (
                      <div className="text-gray-500">You have no saved properties.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <ProfileManager />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <RequestViewingModal
        open={showViewingModal}
        onOpenChange={setShowViewingModal}
        initialPropertyId={viewingPropertyId || undefined}
        onSubmit={handleSubmitViewing}
      />
    </div>
  );
}
