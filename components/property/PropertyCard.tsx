"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, MapPin, Bed, Bath, Heart, Calendar, Bell, Star, CheckCircle } from "lucide-react"

interface PropertyCardProps {
  propertyId: string
  title: string
  location?: { address?: string; city?: string; state?: string }
  rent?: number
  bedrooms?: number
  bathrooms?: number
  size?: number
  status?: string
  images?: string[]
  matchScore?: number
  rating?: { avg: number; total: number }
  isSaved?: boolean
  isWaitlisted?: boolean
  joiningWaitlist?: boolean
  explanation?: string[]
  onSave: () => void
  onBook?: () => void
  onWaitlist?: () => void
}

export function PropertyCard({
  propertyId,
  title,
  location,
  rent,
  bedrooms,
  bathrooms,
  size,
  status,
  images = [],
  matchScore,
  rating,
  isSaved,
  isWaitlisted,
  joiningWaitlist,
  explanation = [],
  onSave,
  onBook,
  onWaitlist,
}: PropertyCardProps) {
  const [imgIndex, setImgIndex] = useState(0)
  const hasImages = images.length > 0
  const displayImages = hasImages ? images : ["/placeholder.svg"]

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIndex((i) => (i === 0 ? displayImages.length - 1 : i - 1))
  }
  const next = (e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIndex((i) => (i === displayImages.length - 1 ? 0 : i + 1))
  }

  const scoreColor = matchScore != null
    ? matchScore >= 70 ? "bg-green-500" : matchScore >= 50 ? "bg-amber-500" : "bg-gray-400"
    : ""

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all group">
      <div className="md:flex">
        {/* Image carousel */}
        <div className="relative md:w-64 shrink-0 overflow-hidden">
          <img
            src={displayImages[imgIndex]}
            alt={title}
            className="w-full h-52 md:h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
          />

          {/* Carousel controls */}
          {displayImages.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {/* Dots */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {displayImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setImgIndex(i) }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? "bg-white w-3" : "bg-white/60"}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Status badge */}
          <div className="absolute top-3 left-3">
            <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${status === "available" ? "bg-green-500 text-white" : "bg-gray-700 text-white"}`}>
              {status === "available" ? "Available" : status ?? "Unknown"}
            </span>
          </div>

          {/* Match score badge */}
          {matchScore != null && (
            <div className={`absolute top-3 right-3 ${scoreColor} text-white text-[11px] font-bold px-2 py-1 rounded-full`}>
              {Math.round(matchScore)}% Match
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-1 truncate">{title}</h3>
                {location && (
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{[location.address, location.city].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>
              {rent != null && (
                <div className="shrink-0 text-right">
                  <p className="text-xl font-bold text-gray-900">£{rent.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">per year</p>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              {bedrooms != null && <span className="flex items-center gap-1"><Bed className="h-4 w-4" />{bedrooms} bed</span>}
              {bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{bathrooms} bath</span>}
              {size != null && <span>{size} sqm</span>}
              {rating && (
                <span className="flex items-center gap-1 ml-auto">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`h-3 w-3 ${s <= Math.round(rating.avg) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                  ))}
                  <span className="text-xs text-gray-400">{rating.avg} ({rating.total})</span>
                </span>
              )}
            </div>

            {/* Match explanation */}
            {explanation.length > 0 && (
              <ul className="space-y-0.5 mb-3">
                {explanation.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap mt-2">
            <button
              onClick={onSave}
              className={`flex items-center gap-1.5 text-xs border px-3 py-2 rounded-xl transition-colors font-medium ${isSaved ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100" : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}
            >
              <Heart className={`h-3.5 w-3.5 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
              {isSaved ? "Saved" : "Save"}
            </button>

            {status === "available" && onBook ? (
              <button
                onClick={onBook}
                className="flex items-center gap-1.5 text-xs bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-700 transition-colors font-medium"
              >
                <Calendar className="h-3.5 w-3.5" /> Request Viewing
              </button>
            ) : onWaitlist ? (
              <button
                onClick={onWaitlist}
                disabled={isWaitlisted || joiningWaitlist}
                className="flex items-center gap-1.5 text-xs border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60 px-4 py-2 rounded-xl transition-colors font-medium"
              >
                <Bell className="h-3.5 w-3.5" />
                {isWaitlisted ? "On Waitlist" : joiningWaitlist ? "Joining..." : "Join Waitlist"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
