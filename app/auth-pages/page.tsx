"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Home, Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft, CheckCircle, Circle } from "lucide-react"
import { useAuth } from "@/src/context/AuthContext"

export default function AuthPages() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const modeParam = searchParams?.get("mode")

  const [authMode, setAuthMode] = useState<"login" | "register">(modeParam === "signup" ? "register" : "login")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [userType, setUserType] = useState<"tenant" | "landlord">("tenant")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [passwordTouched, setPasswordTouched] = useState(false)

  const { login, register } = useAuth()

  const validations = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
  const passwordValid = Object.values(validations).every(Boolean)

  useEffect(() => {
    if (modeParam === "signup") setAuthMode("register")
    else if (modeParam === "login") setAuthMode("login")
  }, [modeParam])

  function switchMode(mode: "login" | "register") {
    setAuthMode(mode)
    setError(null)
    setName(""); setEmail(""); setPassword(""); setConfirmPassword(""); setPhone("")
    setPasswordTouched(false)
    router.push(`/auth-pages?mode=${mode === "register" ? "signup" : "login"}`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (authMode === "register") {
      if (password !== confirmPassword) { setError("Passwords do not match."); return }
      if (!passwordValid) { setError("Password does not meet requirements."); return }
    }
    setIsLoading(true)
    try {
      if (authMode === "login") {
        await login({ email, password })
      } else {
        await register({ name, email, password, phone, userType })
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-950 flex-col justify-between p-12">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <Home className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">RentMatch</span>
        </button>

        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            The smarter way<br />to find a home.
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-sm">
            Set your preferences once. Get matched to properties that actually fit your budget, location, and lifestyle.
          </p>
          <div className="mt-10 space-y-4">
            {[
              "Smart matching based on your preferences",
              "Book viewings and pay deposits securely",
              "Connect directly with verified landlords",
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-3 text-gray-400">
                <CheckCircle className="h-5 w-5 text-blue-400 shrink-0" />
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-600 text-sm">Smart property matching for Nigeria's rental market</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
            <Home className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">RentMatch</span>
        </div>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {authMode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-gray-500 text-sm">
              {authMode === "login"
                ? "Sign in to your RentMatch account"
                : "Join thousands finding homes smarter"}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => switchMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${authMode === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode("register")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${authMode === "register" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Joseph Olayanju"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordTouched(true) }}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {authMode === "register" && passwordTouched && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {[
                    { key: "minLength", label: "8+ characters" },
                    { key: "uppercase", label: "Uppercase letter" },
                    { key: "number", label: "Number" },
                    { key: "special", label: "Special character" },
                  ].map(v => (
                    <div key={v.key} className={`flex items-center gap-1.5 text-xs ${validations[v.key as keyof typeof validations] ? "text-green-600" : "text-gray-400"}`}>
                      {validations[v.key as keyof typeof validations]
                        ? <CheckCircle className="h-3 w-3" />
                        : <Circle className="h-3 w-3" />}
                      {v.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {authMode === "register" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 ${confirmPassword && confirmPassword !== password ? "border-red-300" : "border-gray-200"}`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      required
                      placeholder="+234 810 000 0000"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">I am a</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["tenant", "landlord"] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setUserType(type)}
                        className={`py-2.5 px-4 rounded-lg border text-sm font-medium capitalize transition-all ${userType === type ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                      >
                        {type === "tenant" ? "Tenant" : "Landlord / Agent"}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (authMode === "register" && (!passwordValid || password !== confirmPassword))}
              className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {isLoading
                ? "Please wait..."
                : authMode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => switchMode(authMode === "login" ? "register" : "login")}
              className="text-blue-600 font-medium hover:underline"
            >
              {authMode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            By continuing you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
