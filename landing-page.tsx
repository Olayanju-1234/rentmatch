"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Home, MapPin, ArrowRight, Menu, X,
  ShieldCheck, CalendarCheck, MessageSquare,
  Building2, Wallet, Users, TrendingUp, ChevronRight,
} from "lucide-react"
import { propertiesApi } from "@/src/lib/propertiesApi"
import type { IProperty } from "@/src/types"

// ─── Match demo data ──────────────────────────────────────────────────────────

const MOCK_PROPERTIES = [
  { id: "1", title: "Modern 2-Bed, Lekki Phase 1", rent: 1_200_000, bedrooms: 2, city: "Lekki", amenities: ["wifi", "parking", "security"] },
  { id: "2", title: "Cosy Studio, Yaba", rent: 480_000, bedrooms: 1, city: "Yaba", amenities: ["wifi"] },
  { id: "3", title: "3-Bed Duplex, Ajah", rent: 1_800_000, bedrooms: 3, city: "Ajah", amenities: ["wifi", "parking", "security", "generator"] },
  { id: "4", title: "2-Bed Flat, Ikeja GRA", rent: 900_000, bedrooms: 2, city: "Ikeja", amenities: ["parking", "security", "generator"] },
  { id: "5", title: "Executive 4-Bed, VI", rent: 4_500_000, bedrooms: 4, city: "Victoria Island", amenities: ["wifi", "parking", "security", "generator"] },
]

function calcMatchScore(pref: { budget: number; bedrooms: number; city: string; amenities: string[] }, prop: typeof MOCK_PROPERTIES[0]) {
  let score = 0
  const budgetRatio = pref.budget / prop.rent
  if (budgetRatio >= 1) score += 40
  else if (budgetRatio >= 0.85) score += 25
  else if (budgetRatio >= 0.7) score += 10
  if (prop.bedrooms === pref.bedrooms) score += 25
  else if (Math.abs(prop.bedrooms - pref.bedrooms) === 1) score += 12
  if (prop.city === pref.city) score += 20
  const matched = pref.amenities.filter((a) => prop.amenities.includes(a)).length
  score += Math.round((matched / Math.max(pref.amenities.length, 1)) * 15)
  return Math.min(score, 100)
}

function MatchDemo() {
  const [budget, setBudget] = useState(1_200_000)
  const [bedrooms, setBedrooms] = useState(2)
  const [city, setCity] = useState("Lekki")
  const [amenities, setAmenities] = useState<string[]>(["wifi", "parking"])

  const results = MOCK_PROPERTIES
    .map((p) => ({ ...p, score: calcMatchScore({ budget, bedrooms, city, amenities }, p) }))
    .sort((a, b) => b.score - a.score)

  const toggleAmenity = (a: string) =>
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])

  return (
    <section className="py-28 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-14">
          <p className="text-amber-600 text-sm font-semibold mb-3">No sign-up required</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight max-w-xl">
            Try the algorithm.<br />Right now.
          </h2>
          <p className="text-gray-500 mt-4 max-w-md">
            Adjust your preferences and watch the match scores update in real time. This is exactly what happens when you sign up.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Controls */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-900">Yearly Budget</label>
                <span className="text-sm font-bold text-amber-600 tabular-nums">
                  ₦{budget.toLocaleString()}
                  <span className="text-gray-400 font-normal"> /yr</span>
                </span>
              </div>
              <input
                type="range"
                min={300_000} max={5_000_000} step={50_000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>₦300k</span><span>₦5M</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-3">Bedrooms</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setBedrooms(n)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${bedrooms === n ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-3">Area</label>
              <div className="flex flex-wrap gap-2">
                {["Lekki", "Yaba", "Ajah", "Ikeja", "Victoria Island"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCity(c)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${city === c ? "bg-amber-500 text-white border-amber-500" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-3">Must-haves</label>
              <div className="flex flex-wrap gap-2">
                {[["wifi", "WiFi"], ["parking", "Parking"], ["security", "Security"], ["generator", "Generator"]].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => toggleAmenity(id)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${amenities.includes(id) ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-2">
            {results.map((p, i) => {
              const color = p.score >= 70 ? "bg-amber-500" : p.score >= 45 ? "bg-gray-400" : "bg-gray-200"
              const textColor = p.score >= 70 ? "text-amber-600" : p.score >= 45 ? "text-gray-500" : "text-gray-400"
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${i === 0 ? "border-amber-200 bg-amber-50/50" : "border-gray-100 bg-white"}`}
                >
                  <span className={`text-xs font-bold w-5 shrink-0 ${i === 0 ? "text-amber-600" : "text-gray-300"}`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">₦{p.rent.toLocaleString()}/yr · {p.bedrooms} bed</p>
                    <div className="mt-2.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${color}`}
                        style={{ width: `${p.score}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-sm font-bold shrink-0 tabular-nums ${textColor}`}>
                    {p.score}%
                  </span>
                </div>
              )
            })}
            <p className="text-xs text-gray-400 pt-2 text-center">
              Scores update as you adjust preferences above
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const [featuredProperties, setFeaturedProperties] = useState<IProperty[]>([])
  const [heroProperty, setHeroProperty] = useState<IProperty | null>(null)
  const [loading, setLoading] = useState(true)

  const useScrollReveal = () => {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
      const el = ref.current
      if (!el) return
      el.style.opacity = "0"
      el.style.transform = "translateY(24px)"
      el.style.transition = "opacity 0.55s ease, transform 0.55s ease"
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.style.opacity = "1"
            el.style.transform = "translateY(0)"
            observer.disconnect()
          }
        },
        { threshold: 0.1 },
      )
      observer.observe(el)
      return () => observer.disconnect()
    }, [])
    return ref
  }

  const featuresRef = useScrollReveal()
  const landlordRef = useScrollReveal()
  const ctaRef = useScrollReveal()

  useEffect(() => {
    propertiesApi.getRandom(3).then((res) => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setFeaturedProperties(res.data.slice(0, 3))
        setHeroProperty(res.data[0])
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <Home className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">RentMatch</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How it Works</a>
              <a href="#properties" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Properties</a>
              <a href="#landlords" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Landlords</a>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => router.push("/auth-pages?mode=login")}
                className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push("/auth-pages?mode=signup")}
                className="text-sm font-semibold bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Get Started
              </button>
            </div>
            <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="block text-sm text-gray-600 py-2">How it Works</a>
            <a href="#properties" onClick={() => setIsMenuOpen(false)} className="block text-sm text-gray-600 py-2">Properties</a>
            <a href="#landlords" onClick={() => setIsMenuOpen(false)} className="block text-sm text-gray-600 py-2">Landlords</a>
            <div className="pt-2 space-y-2">
              <button onClick={() => { setIsMenuOpen(false); router.push("/auth-pages?mode=login") }} className="w-full text-sm text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg">Sign In</button>
              <button onClick={() => { setIsMenuOpen(false); router.push("/auth-pages?mode=signup") }} className="w-full text-sm font-semibold bg-gray-900 text-white px-4 py-2.5 rounded-lg">Get Started</button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-16 bg-gray-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-amber-500 text-sm font-semibold mb-5 tracking-wide">
                Smart matching for Nigeria's rental market
              </p>
              <h1 className="text-5xl lg:text-7xl font-bold leading-[1.02] tracking-tight mb-7">
                Stop scrolling.<br />
                Start<br />
                <span className="text-amber-400">matching.</span>
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-md">
                Set your preferences once. Every property in our database is scored and ranked against your budget, location, and lifestyle — you only see homes worth your time.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <button
                  onClick={() => router.push("/auth-pages?mode=signup")}
                  className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors"
                >
                  Find My Match <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => router.push("/auth-pages?mode=signup")}
                  className="flex items-center justify-center gap-2 bg-white/8 hover:bg-white/12 text-white font-medium px-6 py-3.5 rounded-xl border border-white/10 transition-colors"
                >
                  List Your Property
                </button>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                <span>✓ No listing fees</span>
                <span>✓ Verified landlords</span>
                <span>✓ Secure payments</span>
              </div>
            </div>

            {/* Hero property card */}
            <div className="relative">
              <div className="absolute -inset-4 bg-amber-500/10 rounded-3xl blur-3xl" />
              <div className="relative bg-gray-900 border border-white/8 rounded-2xl overflow-hidden">
                {loading ? (
                  <div className="h-52 bg-gray-800 animate-pulse" />
                ) : heroProperty?.images?.[0] ? (
                  <img src={heroProperty.images[0]} alt={heroProperty.title} className="w-full h-52 object-cover" />
                ) : (
                  <div className="h-52 bg-gray-800 flex items-center justify-center">
                    <Home className="h-16 w-16 text-gray-700" />
                  </div>
                )}
                <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  94% Match
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-white mb-1">{heroProperty?.title ?? "Modern 2-Bedroom Apartment"}</p>
                      {heroProperty?.location ? (
                        <div className="flex items-center gap-1 text-gray-400 text-sm">
                          <MapPin className="h-3 w-3" />
                          {heroProperty.location.city}, {heroProperty.location.state}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400 text-sm">
                          <MapPin className="h-3 w-3" />
                          Lekki Phase 1, Lagos
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-green-400 border border-green-400/30 bg-green-400/10 px-2 py-1 rounded-full">
                      Available
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mb-3">
                    {heroProperty?.rent ? `₦${heroProperty.rent.toLocaleString()}/yr` : "₦1,200,000/yr"}
                  </p>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500">Match score</span>
                      <span className="text-xs font-bold text-amber-400">94%</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: "94%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
                From preferences<br />to move-in.
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-12">
                No 200-result scrollfest. No calling landlords who've already let the property. Just ranked matches — highest score first.
              </p>
              <div className="space-y-10">
                {[
                  {
                    n: "01",
                    title: "Set your preferences",
                    desc: "Budget, area, bedrooms, amenities. The more specific you are, the sharper your matches.",
                  },
                  {
                    n: "02",
                    title: "Get your ranked matches",
                    desc: "Every property is scored against your criteria using the Meridian optimisation engine. Best fits surface first.",
                  },
                  {
                    n: "03",
                    title: "Book, view, move in",
                    desc: "Request a viewing, pay your refundable deposit via Stripe or Paystack, sign your lease.",
                  },
                ].map((s) => (
                  <div key={s.n} className="flex gap-6">
                    <span className="text-4xl font-black text-gray-100 leading-none shrink-0 select-none w-12">{s.n}</span>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1.5">{s.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div ref={featuresRef} className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: CalendarCheck,
                  title: "Viewing Booking",
                  desc: "Request viewings directly from your match results. Landlords confirm in-app.",
                },
                {
                  icon: ShieldCheck,
                  title: "Secure Deposits",
                  desc: "Funds held safely and refunded automatically after your viewing.",
                },
                {
                  icon: MessageSquare,
                  title: "Direct Messaging",
                  desc: "Message landlords about a property without an agent in the middle.",
                },
                {
                  icon: TrendingUp,
                  title: "Match Reasons",
                  desc: "See exactly why a property scored the way it did against your criteria.",
                },
              ].map((f, i) => (
                <div key={i} className="p-5 border border-gray-100 rounded-2xl hover:border-gray-200 transition-colors">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-gray-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive demo ──────────────────────────────────────────────── */}
      <MatchDemo />

      {/* ── Featured Properties ───────────────────────────────────────────── */}
      <section id="properties" className="py-28 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-amber-600 text-sm font-semibold mb-2">Live listings</p>
              <h2 className="text-3xl font-bold text-gray-900">Properties on the platform</h2>
            </div>
            <button
              onClick={() => router.push("/auth-pages?mode=signup")}
              className="hidden md:flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              See all <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : featuredProperties.length > 0 ? (
              featuredProperties.map((p, i) => (
                <div
                  key={p._id || i}
                  onClick={() => router.push("/auth-pages?mode=signup")}
                  className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group border border-gray-100"
                >
                  <div className="relative overflow-hidden h-48">
                    <img
                      src={p.images?.[0] || "/placeholder.svg"}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <div className="absolute top-3 left-3 bg-white text-gray-800 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                      {p.bedrooms}bd · {p.bathrooms}ba
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{p.title}</h3>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mb-3">
                      <MapPin className="h-3 w-3" />
                      {p.location?.city}, {p.location?.state}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">
                        ₦{p.rent?.toLocaleString()}
                        <span className="text-xs font-normal text-gray-400">/yr</span>
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-0.5">
                        View <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                    {p.amenities && p.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {p.amenities.slice(0, 3).map((a, j) => (
                          <span key={j} className="text-[11px] bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-16 text-gray-400 text-sm">No listings available right now.</div>
            )}
          </div>
        </div>
      </section>

      {/* ── For Landlords ─────────────────────────────────────────────────── */}
      <section id="landlords" className="py-28 bg-gray-950 text-white">
        <div ref={landlordRef} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-amber-500 text-sm font-semibold mb-5">For landlords</p>
              <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
                Fill vacancies faster.<br />With better tenants.
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-10">
                List once. Meridian sends you tenants whose budget, lifestyle, and requirements genuinely match your property — not just anyone who clicked a link.
              </p>
              <ul className="space-y-5 mb-10">
                {[
                  { icon: Users, text: "Tenants ranked by compatibility score before they even contact you" },
                  { icon: Building2, text: "Manage properties, viewings, and rent in one dashboard" },
                  { icon: TrendingUp, text: "Analytics on views, match quality, and inquiry rates" },
                  { icon: Wallet, text: "Track rent payments and never lose a receipt" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white/8 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="h-4 w-4 text-amber-400" />
                    </div>
                    <span className="text-gray-300 text-sm leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push("/auth-pages?mode=signup")}
                className="flex items-center gap-2 bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
              >
                List Your Property Free <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: "Properties Listed", value: "3", sub: "2 available · 1 occupied" },
                { label: "Top Match Score", value: "91%", sub: "Tenant matched · Lekki" },
                { label: "Rent Collected (Apr)", value: "₦2.4M", sub: "2 of 3 payments received" },
                { label: "Avg. Days to Let", value: "4", sub: "Down from 41 days before listing" },
              ].map((s, i) => (
                <div key={i} className="bg-white/5 border border-white/8 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className="text-xl font-bold text-white">{s.value}</p>
                  </div>
                  <p className="text-xs text-gray-500 text-right max-w-[140px]">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-28 bg-white border-t border-gray-100">
        <div ref={ctaRef} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Your next home<br />is already on here.
          </h2>
          <p className="text-gray-500 text-lg mb-10 max-w-lg mx-auto">
            Stop filtering through listings that don't fit. Get ranked results that actually match your life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/auth-pages?mode=signup")}
              className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors"
            >
              Start as Tenant — Free <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => router.push("/auth-pages?mode=signup")}
              className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-medium px-8 py-4 rounded-xl hover:border-gray-400 transition-colors"
            >
              List Your Property
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-gray-950 border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
                  <Home className="h-4 w-4 text-white" />
                </div>
                <span className="text-white font-bold">RentMatch</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">Algorithmic property matching for Nigeria's rental market.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Platform</p>
              <ul className="space-y-2.5">
                {["How it Works", "For Landlords", "Features"].map((item) => (
                  <li key={item}><a href="#" className="text-sm text-gray-600 hover:text-gray-400 transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Support</p>
              <ul className="space-y-2.5">
                {["Contact Us", "Privacy Policy", "Terms of Use"].map((item) => (
                  <li key={item}><a href="#" className="text-sm text-gray-600 hover:text-gray-400 transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-600">© 2026 RentMatch. All rights reserved.</p>
            <p className="text-xs text-gray-600">Payments via Stripe & Paystack</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
