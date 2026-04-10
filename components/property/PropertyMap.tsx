"use client"

import { useEffect, useRef } from "react"

interface MapProperty {
  _id: string
  title: string
  rent?: number
  status?: string
  matchScore?: number
  location?: {
    address?: string
    city?: string
    coordinates?: { latitude: number; longitude: number }
  }
}

interface PropertyMapProps {
  properties: MapProperty[]
  onPropertyClick?: (propertyId: string) => void
  height?: string
}

// Geocode cache to avoid re-fetching
const geocodeCache: Record<string, { lat: number; lng: number } | null> = {}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (address in geocodeCache) return geocodeCache[address]
  try {
    const q = encodeURIComponent(address)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    )
    const data = await res.json()
    if (data?.length) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      geocodeCache[address] = result
      return result
    }
    geocodeCache[address] = null
    return null
  } catch {
    return null
  }
}

export function PropertyMap({ properties, onPropertyClick, height = "400px" }: PropertyMapProps) {
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return

    let mounted = true

    const init = async () => {
      // Dynamic import to avoid SSR issues
      const L = (await import("leaflet")).default
      await import("leaflet/dist/leaflet.css")

      // Fix default icon paths (Webpack/Next.js issue)
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      if (!mounted || !containerRef.current) return

      // Destroy existing map instance before re-init
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const map = L.map(containerRef.current, { zoomControl: true })
      mapRef.current = map

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Initial fallback view — UK
      map.setView([51.5, -0.12], 10)

      const bounds: [number, number][] = []

      // Create markers for all properties
      for (const prop of properties) {
        if (!mounted) break

        let lat: number | undefined
        let lng: number | undefined

        // Use stored coordinates first
        if (prop.location?.coordinates?.latitude && prop.location?.coordinates?.longitude) {
          lat = prop.location.coordinates.latitude
          lng = prop.location.coordinates.longitude
        } else {
          // Geocode from address
          const addr = [prop.location?.address, prop.location?.city].filter(Boolean).join(", ")
          if (addr) {
            const coords = await geocodeAddress(addr)
            if (coords) { lat = coords.lat; lng = coords.lng }
          }
        }

        if (lat == null || lng == null) continue

        const score = prop.matchScore
        const color = score != null
          ? score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#6b7280"
          : "#3b82f6"

        // Custom colored marker via SVG DivIcon
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:32px;height:32px;border-radius:50% 50% 50% 0;
            background:${color};border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,.25);
            transform:rotate(-45deg);
            display:flex;align-items:center;justify-content:center;
          ">
            <span style="transform:rotate(45deg);font-size:9px;font-weight:700;color:white;line-height:1;">
              ${score != null ? Math.round(score) : ""}
            </span>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -36],
        })

        const marker = L.marker([lat, lng], { icon }).addTo(map)

        const rentStr = prop.rent != null ? `£${prop.rent.toLocaleString()}/yr` : ""
        const scoreStr = score != null ? `<span style="background:${color};color:white;padding:1px 6px;border-radius:999px;font-weight:700;font-size:10px;">${Math.round(score)}% match</span>` : ""

        marker.bindPopup(`
          <div style="min-width:160px;font-family:sans-serif;">
            <p style="font-weight:600;font-size:13px;margin:0 0 4px">${prop.title}</p>
            ${prop.location?.city ? `<p style="font-size:11px;color:#6b7280;margin:0 0 4px">${prop.location.city}</p>` : ""}
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;">
              ${rentStr ? `<span style="font-size:12px;font-weight:600;">${rentStr}</span>` : ""}
              ${scoreStr}
            </div>
            ${onPropertyClick ? `<button onclick="window.__mapPropertyClick('${prop._id}')" style="margin-top:8px;width:100%;background:#111;color:white;border:none;border-radius:8px;padding:5px 0;font-size:11px;cursor:pointer;font-weight:600;">View Details</button>` : ""}
          </div>
        `)

        markersRef.current.push(marker)
        bounds.push([lat, lng])
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
      }

      // Wire popup button click to parent callback
      if (onPropertyClick) {
        ;(window as any).__mapPropertyClick = onPropertyClick
      }
    }

    init()

    return () => {
      mounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markersRef.current = []
      delete (window as any).__mapPropertyClick
    }
  }, [properties])

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%", borderRadius: "12px", overflow: "hidden", zIndex: 0 }}
      className="border border-gray-100"
    />
  )
}
