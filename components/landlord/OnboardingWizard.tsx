"use client"

import { useState } from "react"
import { CheckCircle, ChevronRight, ChevronLeft, Home, Calendar, Rocket, X, Upload, MapPin, Bed, Bath } from "lucide-react"
import { propertiesApi } from "@/src/lib/propertiesApi"

interface OnboardingWizardProps {
  onComplete: () => void
  onClose: () => void
}

type Step = "property" | "schedule" | "live"

const STEPS: { id: Step; label: string; icon: typeof Home }[] = [
  { id: "property", label: "Add Property", icon: Home },
  { id: "schedule", label: "Set Schedule", icon: Calendar },
  { id: "live", label: "Go Live", icon: Rocket },
]

const AMENITIES = ["WiFi", "Parking", "Security", "Generator", "Gym", "Swimming Pool", "Elevator", "CCTV"]
const VIEWING_SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
]

export function OnboardingWizard({ onComplete, onClose }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>("property")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  // Step 1 — property details
  const [propertyData, setPropertyData] = useState({
    title: "",
    description: "",
    address: "",
    city: "",
    state: "",
    rent: "",
    bedrooms: "1",
    bathrooms: "1",
    size: "",
    amenities: [] as string[],
    furnished: false,
    petFriendly: false,
    parking: false,
    electricity: false,
    water: false,
    internet: false,
  })
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  // Step 2 — availability schedule
  const [availableDays, setAvailableDays] = useState<string[]>(["Monday", "Wednesday", "Saturday"])
  const [availableSlots, setAvailableSlots] = useState<string[]>(["10:00 AM", "02:00 PM"])
  const [advanceNotice, setAdvanceNotice] = useState("24")

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const newFiles = [...images, ...files].slice(0, 6)
    setImages(newFiles)
    const urls = newFiles.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
  }

  const removeImage = (i: number) => {
    const newFiles = images.filter((_, idx) => idx !== i)
    const newUrls = previews.filter((_, idx) => idx !== i)
    setImages(newFiles)
    setPreviews(newUrls)
  }

  const toggleAmenity = (a: string) => {
    setPropertyData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }))
  }

  const toggleDay = (d: string) => {
    setAvailableDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  const toggleSlot = (s: string) => {
    setAvailableSlots((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  const validateStep1 = (): string => {
    if (!propertyData.title.trim()) return "Property title is required"
    if (!propertyData.address.trim()) return "Address is required"
    if (!propertyData.city.trim()) return "City is required"
    if (!propertyData.rent || Number(propertyData.rent) <= 0) return "Valid rent amount is required"
    return ""
  }

  const handleNext = () => {
    if (currentStep === "property") {
      const err = validateStep1()
      if (err) { setError(err); return }
    }
    setError("")
    if (currentStep === "property") setCurrentStep("schedule")
    else if (currentStep === "schedule") setCurrentStep("live")
  }

  const handleBack = () => {
    setError("")
    if (currentStep === "schedule") setCurrentStep("property")
    else if (currentStep === "live") setCurrentStep("schedule")
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("title", propertyData.title)
      formData.append("description", propertyData.description || `${propertyData.bedrooms}-bed property in ${propertyData.city}`)
      formData.append("location[address]", propertyData.address)
      formData.append("location[city]", propertyData.city)
      formData.append("location[state]", propertyData.state)
      formData.append("rent", propertyData.rent)
      formData.append("bedrooms", propertyData.bedrooms)
      formData.append("bathrooms", propertyData.bathrooms)
      if (propertyData.size) formData.append("size", propertyData.size)
      formData.append("status", "available")
      propertyData.amenities.forEach((a) => formData.append("amenities[]", a))
      formData.append("features[furnished]", String(propertyData.furnished))
      formData.append("features[petFriendly]", String(propertyData.petFriendly))
      formData.append("features[parking]", String(propertyData.parking))
      formData.append("features[balcony]", "false")
      formData.append("utilities[electricity]", String(propertyData.electricity))
      formData.append("utilities[water]", String(propertyData.water))
      formData.append("utilities[internet]", String(propertyData.internet))
      formData.append("utilities[gas]", "false")
      formData.append("availableDays", availableDays.join(","))
      formData.append("availableSlots", availableSlots.join(","))
      formData.append("advanceNotice", advanceNotice)
      images.forEach((img) => formData.append("images", img))

      const res = await propertiesApi.create(formData)
      if (res.success) {
        setDone(true)
      } else {
        setError(res.message || "Failed to create property")
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">You're live!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your property is now listed and visible to tenants. Meridian will start matching the right tenants to it.
          </p>
          <button
            onClick={onComplete}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">List Your Property</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center px-6 py-4 gap-0">
          {STEPS.map((step, i) => {
            const isActive = step.id === currentStep
            const isDone = stepIndex > i
            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${isDone ? "bg-green-500 text-white" : isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"}`}>
                    {isDone ? <CheckCircle className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${isActive ? "text-gray-900" : isDone ? "text-green-600" : "text-gray-400"}`}>{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-3 transition-colors ${isDone ? "bg-green-300" : "bg-gray-200"}`} />
                )}
              </div>
            )
          })}
        </div>

        <div className="px-6 pb-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          {/* Step 1 — Property Details */}
          {currentStep === "property" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Property Title *</label>
                <input
                  value={propertyData.title}
                  onChange={(e) => setPropertyData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Cosy 2-bed flat in Victoria Island"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Address *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
                    <input
                      value={propertyData.address}
                      onChange={(e) => setPropertyData((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Street address"
                      className="w-full pl-9 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">City *</label>
                  <input
                    value={propertyData.city}
                    onChange={(e) => setPropertyData((p) => ({ ...p, city: e.target.value }))}
                    placeholder="e.g. Lagos"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-medium text-gray-500 block mb-1">Rent (per year) *</label>
                  <input
                    type="number"
                    value={propertyData.rent}
                    onChange={(e) => setPropertyData((p) => ({ ...p, rent: e.target.value }))}
                    placeholder="e.g. 1200000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Bedrooms</label>
                  <div className="relative">
                    <Bed className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
                    <select
                      value={propertyData.bedrooms}
                      onChange={(e) => setPropertyData((p) => ({ ...p, bedrooms: e.target.value }))}
                      className="w-full pl-9 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Bathrooms</label>
                  <div className="relative">
                    <Bath className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
                    <select
                      value={propertyData.bathrooms}
                      onChange={(e) => setPropertyData((p) => ({ ...p, bathrooms: e.target.value }))}
                      className="w-full pl-9 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Size (sqm)</label>
                  <input
                    type="number"
                    value={propertyData.size}
                    onChange={(e) => setPropertyData((p) => ({ ...p, size: e.target.value }))}
                    placeholder="e.g. 80"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
                <textarea
                  value={propertyData.description}
                  onChange={(e) => setPropertyData((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Describe your property..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
              </div>

              {/* Amenities */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-2">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${propertyData.amenities.includes(a) ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-2">Features & Utilities</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: "furnished", label: "Furnished" },
                    { key: "petFriendly", label: "Pet Friendly" },
                    { key: "parking", label: "Parking" },
                    { key: "electricity", label: "Electricity included" },
                    { key: "water", label: "Water included" },
                    { key: "internet", label: "Internet included" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(propertyData as any)[key]}
                        onChange={(e) => setPropertyData((p) => ({ ...p, [key]: e.target.checked }))}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <span className="text-xs text-gray-600">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-2">Photos (up to 6)</label>
                <div className="flex flex-wrap gap-2">
                  {previews.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {previews.length < 6 && (
                    <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                      <Upload className="h-4 w-4 text-gray-300 mb-1" />
                      <span className="text-[10px] text-gray-400">Add photo</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Availability Schedule */}
          {currentStep === "schedule" && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-2">Available Days for Viewings</label>
                <div className="flex flex-wrap gap-2">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`text-xs px-3 py-2 rounded-xl border transition-colors font-medium ${availableDays.includes(day) ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-2">Available Time Slots</label>
                <div className="flex flex-wrap gap-2">
                  {VIEWING_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => toggleSlot(slot)}
                      className={`text-xs px-3 py-2 rounded-xl border transition-colors font-medium ${availableSlots.includes(slot) ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Advance Notice Required</label>
                <select
                  value={advanceNotice}
                  onChange={(e) => setAdvanceNotice(e.target.value)}
                  className="w-full sm:w-48 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="12">12 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="72">72 hours</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-800 mb-1">How viewings work</p>
                <p className="text-xs text-blue-600">Tenants request viewings within your available slots. You receive a notification and can confirm or decline each request within 24 hours.</p>
              </div>
            </div>
          )}

          {/* Step 3 — Review & Go Live */}
          {currentStep === "live" && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Property Summary</p>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-gray-500">Title</span>
                  <span className="font-medium text-gray-900 truncate">{propertyData.title}</span>
                  <span className="text-gray-500">Location</span>
                  <span className="font-medium text-gray-900">{propertyData.city}</span>
                  <span className="text-gray-500">Rent</span>
                  <span className="font-medium text-gray-900">₦{Number(propertyData.rent || 0).toLocaleString()}/yr</span>
                  <span className="text-gray-500">Rooms</span>
                  <span className="font-medium text-gray-900">{propertyData.bedrooms} bed · {propertyData.bathrooms} bath</span>
                  <span className="text-gray-500">Amenities</span>
                  <span className="font-medium text-gray-900">{propertyData.amenities.join(", ") || "None selected"}</span>
                  <span className="text-gray-500">Photos</span>
                  <span className="font-medium text-gray-900">{images.length} uploaded</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Schedule</p>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-gray-500">Available days</span>
                  <span className="font-medium text-gray-900">{availableDays.join(", ") || "Not set"}</span>
                  <span className="text-gray-500">Time slots</span>
                  <span className="font-medium text-gray-900">{availableSlots.join(", ") || "Not set"}</span>
                  <span className="text-gray-500">Notice required</span>
                  <span className="font-medium text-gray-900">{advanceNotice} hours</span>
                </div>
              </div>

              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-violet-800 mb-1">Meridian will get to work</p>
                <p className="text-xs text-violet-600">
                  Once live, Meridian — RentMatch's market-clearing engine — will start finding the optimal tenants for your property across all active searchers in your area.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={currentStep === "property" ? onClose : handleBack}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              {currentStep === "property" ? "Cancel" : "Back"}
            </button>

            {currentStep !== "live" ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 text-sm bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors font-medium"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 text-sm bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors font-medium disabled:opacity-60"
              >
                <Rocket className="h-4 w-4" />
                {submitting ? "Publishing..." : "Go Live"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
