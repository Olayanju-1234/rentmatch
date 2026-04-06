"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Home,
  Search,
  CheckCircle,
  MapPin,
  ArrowRight,
  Menu,
  X,
  ShieldCheck,
  CalendarCheck,
  Zap,
  Star,
} from "lucide-react"
import { propertiesApi } from "@/src/lib/propertiesApi"
import type { IProperty } from "@/src/types"

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  const [stats, setStats] = useState({
    properties: "-",
    available: "-",
    accuracy: "-",
    views: "-",
  })
  const [featuredProperties, setFeaturedProperties] = useState<IProperty[]>([])
  const [heroProperty, setHeroProperty] = useState<IProperty | null>(null)
  const [loading, setLoading] = useState(true)

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
            accuracy: statsRes.data.averageMatchScore ? `${statsRes.data.averageMatchScore}%` : "-",
            views: String(statsRes.data.totalViews ?? "-"),
          })
        }
        if (randomRes.success && Array.isArray(randomRes.data) && randomRes.data.length > 0) {
          setFeaturedProperties(randomRes.data.slice(0, 3))
          setHeroProperty(randomRes.data[0])
        }
      } catch {
        // fail silently — UI handles empty state
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
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
            <a href="#features" className="block text-sm text-gray-600 py-2">Features</a>
            <a href="#how-it-works" className="block text-sm text-gray-600 py-2">How it Works</a>
            <a href="#properties" className="block text-sm text-gray-600 py-2">Properties</a>
            <div className="pt-2 space-y-2">
              <button onClick={() => { setIsMenuOpen(false); router.push("/auth-pages?mode=login") }} className="w-full text-sm text-gray-700 border border-gray-200 px-4 py-2 rounded-lg">Sign In</button>
              <button onClick={() => { setIsMenuOpen(false); router.push("/auth-pages?mode=signup") }} className="w-full text-sm bg-gray-900 text-white px-4 py-2 rounded-lg">Get Started</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-16 bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-white/10">
                <Zap className="h-3 w-3 text-yellow-400" />
                Smart property matching for Nigeria
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6">
                Find the right home,
                <span className="text-blue-400 block">not just any home.</span>
              </h1>
              <p className="text-lg text-gray-400 mb-10 leading-relaxed max-w-lg">
                RentMatch connects tenants with properties that actually fit their budget, location, and lifestyle — not just what's available.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-12">
                <button
                  onClick={() => router.push("/auth-pages?mode=signup")}
                  className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                >
                  Start Finding Homes
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => router.push("/auth-pages?mode=signup")}
                  className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium px-6 py-3 rounded-lg border border-white/10 transition-colors"
                >
                  List Your Property
                </button>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-400" /> Verified listings</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-400" /> Instant matches</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-400" /> Secure payments</div>
              </div>
            </div>

            {/* Hero property card */}
            <div className="relative">
              <div className="absolute -inset-1 bg-blue-500/20 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
                {loading ? (
                  <div className="h-56 bg-gray-800 animate-pulse" />
                ) : heroProperty?.images?.[0] ? (
                  <img src={heroProperty.images[0]} alt={heroProperty.title} className="w-full h-56 object-cover" />
                ) : (
                  <div className="h-56 bg-gray-800 flex items-center justify-center">
                    <Home className="h-12 w-12 text-gray-600" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-white">{heroProperty?.title ?? "Loading..."}</p>
                      {heroProperty?.location && (
                        <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
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
                    <p className="text-2xl font-bold text-white">
                      {heroProperty?.rent ? `₦${heroProperty.rent.toLocaleString()}/yr` : "-"}
                    </p>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-medium text-gray-300">Top Match</span>
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
              {[
                { value: stats.properties, label: "Properties Listed" },
                { value: stats.available, label: "Available Now" },
                { value: stats.accuracy, label: "Match Accuracy" },
                { value: stats.views, label: "Total Views" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold text-white">{s.value}</div>
                  <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Built for how renting actually works</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Not another property listing site. RentMatch is built around matching, not browsing.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Search,
                title: "Smart Matching",
                desc: "Set your budget, location, and preferences once. Our algorithm scores every available property and surfaces the ones that actually fit.",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: CalendarCheck,
                title: "Viewing Management",
                desc: "Request viewings directly from matches. Landlords confirm or reschedule, and you get notified instantly.",
                color: "bg-green-50 text-green-600",
              },
              {
                icon: ShieldCheck,
                title: "Secure Deposits",
                desc: "Pay your viewing deposit securely via Stripe. Funds are held safely and refunded automatically if the viewing does not proceed.",
                color: "bg-purple-50 text-purple-600",
              },
              {
                icon: Zap,
                title: "Instant Results",
                desc: "Matches are computed on demand so you always see the freshest available properties ranked against your preferences.",
                color: "bg-orange-50 text-orange-600",
              },
            ].map((f, i) => (
              <div key={i} className="p-6 border border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-sm transition-all">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">How RentMatch Works</h2>
            <p className="text-lg text-gray-500">Three steps from preferences to a confirmed viewing</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Set Your Preferences", desc: "Tell us your budget, location, and must-haves. The more specific, the better your matches." },
              { step: "02", title: "Get Ranked Matches", desc: "Every property in our database is scored against your criteria. You see the best fits first, with reasons why." },
              { step: "03", title: "Book and Move In", desc: "Request viewings, pay deposits securely, and connect directly with verified landlords." },
            ].map((s, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gray-200 z-0" style={{ width: "calc(100% - 3rem)", left: "calc(100% - 1rem)" }} />
                )}
                <div className="relative z-10">
                  <div className="text-5xl font-black text-gray-100 mb-4 leading-none">{s.step}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section id="properties" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Properties</h2>
              <p className="text-gray-500">A sample of what is currently available</p>
            </div>
            <button
              onClick={() => router.push("/auth-pages?mode=signup")}
              className="hidden md:flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              See all properties <ArrowRight className="h-4 w-4" />
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
                <div key={p._id || i} className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="relative overflow-hidden h-48">
                    <img
                      src={p.images?.[0] || "/placeholder.svg"}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 bg-white text-gray-800 text-xs font-bold px-2 py-1 rounded-full">
                      {p.bedrooms}bd · {p.bathrooms}ba
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{p.title}</h3>
                    <div className="flex items-center gap-1 text-gray-400 text-sm mb-3">
                      <MapPin className="h-3 w-3" />
                      {p.location?.city}, {p.location?.state}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">₦{p.rent?.toLocaleString()}<span className="text-sm font-normal text-gray-400">/yr</span></span>
                      <button
                        onClick={() => router.push("/auth-pages?mode=signup")}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        View details
                      </button>
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

      {/* CTA */}
      <section className="py-24 bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Ready to find your next home?</h2>
          <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
            Join tenants who are skipping the scroll and getting matched to properties that actually fit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/auth-pages?mode=signup")}
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-medium px-8 py-3.5 rounded-lg transition-colors"
            >
              Start as Tenant <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => router.push("/auth-pages?mode=signup")}
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium px-8 py-3.5 rounded-lg border border-white/10 transition-colors"
            >
              List Your Property
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
                <Home className="h-4 w-4 text-white" />
              </div>
              <span className="text-white font-semibold">RentMatch</span>
            </div>
            <p className="text-gray-600 text-sm">Smart property matching for Nigeria's rental market</p>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <a href="#features" className="hover:text-gray-400 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-gray-400 transition-colors">How it Works</a>
              <button onClick={() => router.push("/auth-pages?mode=signup")} className="hover:text-gray-400 transition-colors">Get Started</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
