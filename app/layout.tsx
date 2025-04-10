import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PetRank - AI-Powered Pet Ranking Tool',
  description: 'Upload and rank your pets in this Instagram-like platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Add preconnect for Supabase image hosting */}
        <link rel="preconnect" href="https://cblsslcreohsrhnurfev.supabase.co" />
        <link rel="dns-prefetch" href="https://cblsslcreohsrhnurfev.supabase.co" />
      </head>
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-100">
          {children}
        </main>
      </body>
    </html>
  )
} 