// src/components/Layout.jsx - MASTER APP SHELL
'use client'
import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useApp } from '@/context/AppContext'
import { 
  Menu, 
  X, 
  ShoppingCart, 
  Package, 
  Receipt, 
  Settings, 
  Home, 
  LogOut,
  Store,
  TrendingUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const { settings, getCartItemsCount } = useApp()
  const router = useRouter()
  const pathname = usePathname()

  // DETECT POS PAGE for scroll logic
  const isPosPage = pathname === '/pos'

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const menuItems = [
    { href: '/', icon: Home, label: 'Dashboard' },
    { href: '/pos', icon: ShoppingCart, label: 'POS', badge: getCartItemsCount() },
    { href: '/inventory', icon: Package, label: 'Inventory' },
    { href: '/transactions', icon: Receipt, label: 'Transactions' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  const isActive = (href) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    // ROOT CONTAINER - Kunci mati scroll body browser
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR - Fixed width, full height */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
            <div className="flex items-center space-x-3">
              <Store className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {settings?.business_name || 'POS System'}
                </h1>
                <p className="text-xs text-gray-500">Sparepart Motor</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN WRAPPER - Flex untuk mengisi sisa ruang */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        
        {/* HEADER - Fixed height */}
        <header className="h-16 flex-shrink-0 border-b bg-white shadow-sm">
          <div className="flex items-center justify-between h-full px-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {settings?.business_name || 'POS System'}
                </h2>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Sistem Kasir Toko Sparepart Motor
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="hidden sm:inline-flex">
                <TrendingUp className="h-3 w-3 mr-1" />
                Online
              </Badge>
            </div>
          </div>
        </header>

        {/* CONTENT CONTAINER - Logic scroll POS vs Non-POS */}
        <main className={`
          flex-1 overflow-hidden
          ${isPosPage ? 'overflow-hidden' : 'overflow-y-auto'}
        `}>
          <div className="p-4 lg:p-6 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout