import type { Metadata } from 'next'
import './globals.css'
import { Inter } from "next/font/google"
import { AuthProvider } from "@/src/context/AuthContext"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { AuthLoader } from "@/components/ui/auth-loader"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: 'RentMatch - Smart Property Matching',
  description: 'Find your perfect rental. RentMatch connects tenants with properties using intelligent matching based on your preferences and budget.',
  keywords: ['rental', 'property', 'tenant', 'landlord', 'property matching', 'Nigeria', 'apartments'],
  authors: [{ name: 'Joseph Olayanju' }],
  creator: 'Joseph Olayanju',
  publisher: 'RentMatch',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'RentMatch - Smart Property Matching',
    description: 'Find your perfect rental. Intelligent matching based on your preferences and budget.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RentMatch - Smart Property Matching',
    description: 'Find your perfect rental. Intelligent matching based on your preferences and budget.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            <AuthLoader>
              {children}
              <Toaster />
            </AuthLoader>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
