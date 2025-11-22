// src/components/Layout.jsx
import React from 'react'
import Sidebar from './Sidebar'
import { useApp } from '../context/AppContext'

const Layout = ({ children }) => {
  const { appSettings, loading } = useApp()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content */}
        <div className="flex-1 lg:ml-0">
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {appSettings?.business_name || 'ANPAC Store'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {appSettings?.app_title || 'ERP & POS System'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {appSettings?.phone && `📞 ${appSettings.phone}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date().toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default Layout