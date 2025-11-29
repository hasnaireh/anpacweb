'use client'
import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/context/AuthContext'
import { AppProvider } from '@/context/AppContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import { Toaster } from "@/components/ui/toaster"
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppProvider>
            {isLoginPage ? (
              <>
                {children}
                <Toaster />
              </>
            ) : (
              <ProtectedRoute>
                <Layout>
                  {children}
                  <Toaster />
                </Layout>
              </ProtectedRoute>
            )}
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
