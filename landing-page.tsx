"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Home, Search, CheckCircle, MapPin, ArrowRight, Menu, X,
  ShieldCheck, CalendarCheck, Zap, Star, Users, TrendingUp,
  Building2, Wallet, RefreshCw, MessageSquare, ChevronRight,
} from "lucide-react"
import { propertiesApi } from "@/src/lib/propertiesApi"
import type { IProperty } from "@/src/types"

const TESTIMONIALS = [
  {
    name: "Aisha Bello",
    role: "Tenant · Lekki, Lagos",
    avatar: "AB",
    text: "I was tired of scrolling through random listings. RentMatch showed me 3 apartments that actually matched my budget and commute. Booked a viewing the same day.",
    rating: 5,
  },
  {
    name: "Emeka Okafor",
    role: "Landlord · Victoria Island",
    avatar: "EO",
    text: "My apartment sat empty for 6 weeks. Within 3 days on RentMatch I had 4 qualified tenant matches. Signed a lease within the week.",
    rating: 5,
  },
  {
    name: "Fatima Hassan",
    role: "Tenant · Abuja",
    avatar: "FH",
    text: "The deposit refund worked exactly as promised. Paid, viewed, deposit back in my account. First time renting has felt this clean.",
    rating: 5,
  },
]

const MOCK_PROPERTIES = [
  { id: "1", title: "Modern 2-Bed, Lekki Phase 1", rent: 1_200_000, bedrooms: 2, city: "Lekki", amenities: ["wifi", "parking", "security"] },
  { id: "2", title: "Cosy Studio, Yaba", rent: 480_000, bedrooms: 1, city: "Yaba", amenities: ["wifi"] },
  { id: "3", title: "3-Bed Duplex, Ajah", rent: 1_800_000, bedrooms: 3, city: "Ajah", amenities: ["wifi", "parking", "security", "generator"] },
  { id: "4", title: "2-Bed Flat, Ikeja GRA", rent: 900_000, bedrooms: 2, city: "Ikeja", amenities: ["parking", "security", "generator"] },
  { id: "5", title: "Executive 4-Bed, VI", rent: 4_500_000, bedrooms: 4, city: "Victoria Island", amenities: ["wifi", "parking", "security", "generator"] },
]

function calcMatchScore(pref: { budget: number; bedrooms: number; city: string; amenities: string[] }, prop: typeof MOCK_PROPERTIES[0]) {
  let score = 0
  // Budget: within range = full points, over = 0
  const budgetRatio = pref.budget / prop.rent
  if (budgetRatio >= 1) score += 40
  else if (budgetRatio >= 0.85) score += 25
  else if (budgetRatio >= 0.7) score += 10
  // Bedrooms
  if (prop.bedrooms === pref.bedrooms) score += 25
  else if (Math.abs(prop.bedrooms - pref.bedrooms) === 1) score += 12
  // City
  if (prop.city === pref.city) score += 20
  // Amenities
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
    <section className="py-24 bg-gray-50 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3 block">Try it now</span>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-3">See the algorithm in action</h2>
          <p className="text-gray-500 max-w-xl mx-auto text-sm">Adjust your preferences and watch the match scores update instantly. No sign-up required.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Controls */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-900">Monthly Budget</label>
                <span className="text-sm font-bold text-blue-600">₦{(budget / 12).toLocaleString()}/mo</span>
              </div>
              <input
                type="range"
                min={300_000} max={5_000_000} step={50_000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>₦25k/mo</span><span>₦417k/mo</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-2">Bedrooms</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setBedrooms(n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${bedrooms === n ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-2">Preferred Area</label>
              <div className="flex flex-wrap gap-2">
                {["Lekki", "Yaba", "Ajah", "Ikeja", "Victoria Island"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCity(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${city === c ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-2">Must-have Amenities</label>
              <div className="flex flex-wrap gap-2">
                {[["wifi", "WiFi"], ["parking", "Parking"], ["security", "Security"], ["generator", "Generator"]].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => toggleAmenity(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${amenities.includes(id) ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-3">
            {results.map((p, i) => (
              <div key={p.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-all ${i === 0 ? "border-blue-300 shadow-sm" : "border-gray-100"}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${i === 0 ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                  <p className="text-xs text-gray-400">₦{p.rent.toLocaleString()}/yr · {p.bedrooms} bed</p>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${p.score >= 70 ? "bg-blue-500" : p.score >= 45 ? "bg-amber-400" : "bg-gray-300"}`}
                      style={{ width: `${p.score}%` }}
                    />
                  </div>
                </div>
                <div className={`text-sm font-black shrink-0 ${p.score >= 70 ? "text-blue-600" : p.score >= 45 ? "text-amber-600" : "text-gray-400"}`}>
                  {p.score}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  const [stats, setStats] = useState({ properties: "-", available: "-", accuracy: "-", views: "-" })
  const [featuredProperties, setFeaturedProperties] = useState<IProperty[]>([])
  const [heroProperty, setHeroProperty] = useState<IProperty | null>(null)
  const [loading, setLoading] = useState(true)

  // Scroll-reveal: returns a ref — attach to any element to fade+slide it in on scroll
  const useScrollReveal = () => {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
      const el = ref.current
      if (!el) return
      el.style.opacity = "0"
      el.style.transform = "translateY(28px)"
      el.style.transition = "opacity 0.6s ease, transform 0.6s ease"
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.style.opacity = "1"
            el.style.transform = "translateY(0)"
            observer.disconnect()
          }
        },
        { threshold: 0.12 },
      )
      observer.observe(el)
      return () => observer.disconnect()
    }, [])
    return ref
  }

  // Countup animation for stat numbers
  const useCountup = (target: string, duration = 1200) => {
    const [display, setDisplay] = useState("-")
    const ref = useRef<HTMLSpanElement>(null)
    useEffect(() => {
      if (target === "-") return
      const num = parseInt(target.replace(/\D/g, ""), 10)
      if (isNaN(num)) { setDisplay(target); return }
      const el = ref.current
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return
          observer.disconnect()
          const suffix = target.replace(/[\d,]/g, "")
          const start = Date.now()
          const tick = () => {
            const progress = Math.min((Date.now() - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplay(Math.round(eased * num).toLocaleString() + suffix)
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        },
        { threshold: 0.5 },
      )
      observer.observe(el)
      return () => observer.disconnect()
    }, [target, duration])
    return { ref, display }
  }

  const heroRef = useScrollReveal()
  const featuresRef = useScrollReveal()
  const paymentBannerRef = useScrollReveal()
  const landlordRef = useScrollReveal()
  const howItWorksRef = useScrollReveal()
  const testimonialsRef = useScrollReveal()
  const ctaRef = useScrollReveal()

  const propCountup = useCountup(stats.properties)
  const availCountup = useCountup(stats.available)
  const accCountup = useCountup(stats.accuracy)
  const viewCountup = useCountup(stats.views)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, randomRes] = await Promise.all([
          propertiesApi.getStats(),
          propertiesApi.getRandom(3),
        ])
        if (statsRes.success && statsRes.data) {
          setStats({
            properties: String(statsRes.data.totalProperties ?? "-"),
            available: String(statsRes.data.availableProperties ?? "-"),
            accuracy: statsRes.data.averageMatchScore ? `${String(statsRes.data.averageMatchScore).replace('%', '')}%` : "-",
            views: String(statsRes.data.totalViews ?? "-"),
          })
        }
        if (randomRes.success && Array.isArray(randomRes.data) && randomRes.data.length > 0) {
          setFeaturedProperties(randomRes.data.slice(0, 3))
          setHeroProperty(randomRes.data[0])
        }
      } catch { }
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <Home className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">RentMatch</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How it Works</a>
              <a href="#properties" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Properties</a>
              <a href="#reviews" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Reviews</a>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => router.push("/auth-pages?mode=login")}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push("/auth-pages?mode=signup")}
                className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Get Started Free
              </button>
            </div>
            <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <a href="#features" className="block text-sm text-gray-600 py-2">Features</a>
            <a href="#how-it-works" className="block text-sm text-gray-600 py-2">How it Works</a>
            <a href="#properties" className="block text-sm text-gray-600 py-2">Properties</a>
            <a href="#reviews" className="block text-sm text-gray-600 py-2">Reviews</a>
            <div className="pt-2 space-y-2">
              <button onClick={() => { setIsMenuOpen(false); router.push("/auth-pages?mode=login") }} className="w-full text-sm text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg">Sign In</button>
              <button onClick={() => { setIsMenuOpen(false); router.push("/auth-pages?mode=signup") }} className="w-full text-sm bg-gray-900 text-white px-4 py-2.5 rounded-lg">Get Started Free</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-16 bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-white/10">
                <Zap className="h-3 w-3 text-yellow-400" />
                The smarter way to rent in Nigeria
              </div>
              <h1 className="text-4xl lg:text-6xl font-black leading-[1.05] tracking-tight mb-6">
                Stop scrolling.<br />
                <span className="text-blue-400">Start matching.</span>
              </h1>
              <p className="text-lg text-gray-400 mb-8 leading-relaxed max-w-lg">
                RentMatch uses linear programming to rank every available property against your budget, location, and lifestyle — so you only see homes you'll actually want.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <button
                  onClick={() => router.push("/auth-pages?mode=signup")}
                  className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors"
                >
                  Find My Match
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => router.push("/auth-pages?mode=signup")}
                  className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium px-6 py-3.5 rounded-xl border border-white/10 transition-colors"
                >
                  List Your Property
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-5 text-sm text-gray-500">
                <div className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-400" /> No listing fees</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-400" /> Verified landlords</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-400" /> Secure payments</div>
              </div>
            </div>

            {/* Hero card */}
            <div className="relative">
              <div className="absolute -inset-2 bg-blue-500/15 rounded-3xl blur-2xl" />
              <div className="relative bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
                {loading ? (
                  <div className="h-52 bg-gray-800 animate-pulse" />
                ) : heroProperty?.images?.[0] ? (
                  <img src={heroProperty.images[0]} alt={heroProperty.title} className="w-full h-52 object-cover" />
                ) : (
                  <div className="h-52 bg-gray-800 flex items-center justify-center">
                    <Home className="h-12 w-12 text-gray-700" />
                  </div>
                )}
                {/* Match badge overlay */}
                <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  94% Match
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-white mb-0.5">{heroProperty?.title ?? "Modern 2-Bedroom Apartment"}</p>
                      {heroProperty?.location && (
                        <div className="flex items-center gap-1 text-gray-400 text-sm">
                          <MapPin className="h-3 w-3" />
                          {heroProperty.location.city}, {heroProperty.location.state}
                        </div>
                      )}
                    </div>
                    <div className="bg-green-500/20 text-green-400 text-xs font-medium px-2 py-1 rounded-full border border-green-500/30">
                      Available
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-black text-white">
                      {heroProperty?.rent ? `₦${heroProperty.rent.toLocaleString()}/yr` : "₦1,200,000/yr"}
                    </p>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((s) => <Star key={s} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}
                    </div>
                  </div>
                  {/* Match bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Match score</span>
                      <span className="text-xs font-semibold text-green-400">94%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: "94%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <span ref={propCountup.ref} className="text-3xl font-black text-white">{propCountup.display}</span>
                <div className="text-sm text-gray-500 mt-1">Properties Listed</div>
              </div>
              <div className="text-center">
                <span ref={availCountup.ref} className="text-3xl font-black text-white">{availCountup.display}</span>
                <div className="text-sm text-gray-500 mt-1">Available Now</div>
              </div>
              <div className="text-center">
                <span ref={accCountup.ref} className="text-3xl font-black text-white">{accCountup.display}</span>
                <div className="text-sm text-gray-500 mt-1">Match Accuracy</div>
              </div>
              <div className="text-center">
                <span ref={viewCountup.ref} className="text-3xl font-black text-white">{viewCountup.display}</span>
                <div className="text-sm text-gray-500 mt-1">Total Views</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div ref={featuresRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3 block">What makes us different</span>
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-4">Built for how renting actually works</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Not another listing site. RentMatch is a matching platform — every search is ranked by how well a property fits your life.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Search,
                title: "AI-Powered Matching",
                desc: "Set your criteria once. Our linear programming algorithm scores every property and surfaces the best fits — with reasons why.",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: CalendarCheck,
                title: "Seamless Viewings",
                desc: "Request a viewing directly from your match results. Landlords confirm or reschedule and you get notified instantly.",
                color: "bg-green-50 text-green-600",
              },
              {
                icon: ShieldCheck,
                title: "Secure Deposits",
                desc: "Pay your viewing deposit via Stripe or Paystack. Funds are held safely and refunded automatically after your viewing.",
                color: "bg-purple-50 text-purple-600",
              },
              {
                icon: MessageSquare,
                title: "Direct Messaging",
                desc: "Skip the middleman. Message landlords directly about a property — all conversations in one place.",
                color: "bg-orange-50 text-orange-600",
              },
            ].map((f, i) => (
              <div key={i} className="p-6 border border-gray-100 rounded-2xl hover:shadow-md transition-all group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment methods banner */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div ref={paymentBannerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Pay how you want</h3>
              <p className="text-sm text-gray-500">Viewing deposits accepted via Stripe and Paystack. Refunded after every completed viewing.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3">
                <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
                  <span className="text-white text-[9px] font-black">S</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">Stripe</span>
                <span className="text-xs text-gray-400">Card · Apple Pay</span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3">
                <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
                  <span className="text-white text-[9px] font-black">P</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">Paystack</span>
                <span className="text-xs text-gray-400">Transfer · USSD</span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3">
                <RefreshCw className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Auto Refund</span>
                <span className="text-xs text-gray-400">Guaranteed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div ref={howItWorksRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3 block">Simple process</span>
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-4">From preferences to move-in in 3 steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                icon: Search,
                title: "Set Your Preferences",
                desc: "Budget, location, bedrooms, amenities — tell us what you need once. The more specific, the better your matches.",
                color: "bg-blue-50 text-blue-600",
              },
              {
                step: "02",
                icon: TrendingUp,
                title: "Get Ranked Matches",
                desc: "Every property in our database is scored against your criteria using linear programming. Best fits come first, with match reasons explained.",
                color: "bg-green-50 text-green-600",
              },
              {
                step: "03",
                icon: CalendarCheck,
                title: "Book and Move In",
                desc: "Request a viewing, pay your refundable deposit via Stripe or Paystack, meet the landlord, and sign your lease.",
                color: "bg-purple-50 text-purple-600",
              },
            ].map((s, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute top-6 -right-5 h-5 w-5 text-gray-200 z-10" />
                )}
                <div className="text-6xl font-black text-gray-50 mb-3 leading-none select-none">{s.step}</div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive match demo */}
      <MatchDemo />

      {/* For landlords */}
      <section className="py-24 bg-gray-950 text-white">
        <div ref={landlordRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-4 block">For landlords</span>
              <h2 className="text-3xl lg:text-4xl font-black text-white mb-6">Fill vacancies faster, with better tenants</h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                List once. The algorithm sends you tenants whose budget, lifestyle, and requirements match your property — not just anyone who clicked a link.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  { icon: Users, text: "See matched tenants ranked by compatibility score" },
                  { icon: Building2, text: "Manage all your properties, viewings, and rent in one dashboard" },
                  { icon: TrendingUp, text: "Analytics on views, inquiries, and match quality" },
                  { icon: Wallet, text: "Track rent payments and never lose a receipt" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="h-4 w-4 text-blue-400" />
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
                { label: "Top Match Score", value: "91%", sub: "Tenant: Aisha B. · Lekki" },
                { label: "Rent Collected (Apr)", value: "₦2.4M", sub: "2 of 3 payments received" },
                { label: "Reviews", value: "4.8 ★", sub: "Based on 12 tenant reviews" },
              ].map((s, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{s.label}</p>
                    <p className="text-lg font-black text-white">{s.value}</p>
                  </div>
                  <p className="text-xs text-gray-500 text-right">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section id="properties" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-2 block">Live listings</span>
              <h2 className="text-3xl font-black text-gray-900">Featured Properties</h2>
            </div>
            <button
              onClick={() => router.push("/auth-pages?mode=signup")}
              className="hidden md:flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              See all <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-5 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : featuredProperties.length > 0 ? (
              featuredProperties.map((p, i) => (
                <div key={p._id || i} className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all group cursor-pointer" onClick={() => router.push("/auth-pages?mode=signup")}>
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
                    <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      Available
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-1 truncate">{p.title}</h3>
                    <div className="flex items-center gap-1 text-gray-400 text-sm mb-3">
                      <MapPin className="h-3 w-3" />
                      {p.location?.city}, {p.location?.state}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-gray-900">₦{p.rent?.toLocaleString()}<span className="text-sm font-normal text-gray-400">/yr</span></span>
                      <span className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        View details <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    {p.amenities && p.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {p.amenities.slice(0, 3).map((a, j) => (
                          <span key={j} className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full border border-gray-100">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 text-gray-400">No properties available right now.</div>
            )}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="py-24 bg-gray-50">
        <div ref={testimonialsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3 block">Real stories</span>
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-4">Trusted by tenants and landlords</h2>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[1,2,3,4,5].map((s) => <Star key={s} className="h-5 w-5 fill-yellow-400 text-yellow-400" />)}
            </div>
            <p className="text-gray-500 text-sm">4.9 average across 200+ reviews</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-all">
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= t.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
        <div ref={ctaRef} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
            Your next home is<br />
            <span className="text-blue-400">already waiting for you.</span>
          </h2>
          <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
            Stop filtering through listings that don't match. Get ranked results that actually fit your life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/auth-pages?mode=signup")}
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base"
            >
              Start as Tenant — It's Free <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => router.push("/auth-pages?mode=signup")}
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium px-8 py-4 rounded-xl border border-white/10 transition-colors text-base"
            >
              List Your Property
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
                  <Home className="h-4 w-4 text-white" />
                </div>
                <span className="text-white font-bold">RentMatch</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">Smart property matching for Nigeria's rental market. Built for tenants who want more than a list.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Platform</p>
              <ul className="space-y-2">
                {["Features", "How it Works", "For Landlords", "Pricing"].map((item) => (
                  <li key={item}><a href="#" className="text-sm text-gray-600 hover:text-gray-400 transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Support</p>
              <ul className="space-y-2">
                {["Help Centre", "Contact Us", "Privacy Policy", "Terms of Use"].map((item) => (
                  <li key={item}><a href="#" className="text-sm text-gray-600 hover:text-gray-400 transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">© 2026 RentMatch. All rights reserved.</p>
            <p className="text-xs text-gray-600">Payments powered by Stripe & Paystack</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
