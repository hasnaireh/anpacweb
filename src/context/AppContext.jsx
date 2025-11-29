// src/context/AppContext.jsx
'use client'
import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const AppContext = createContext()

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export const AppProvider = ({ children }) => {
  const [settings, setSettings] = useState(null)
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch app settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .single()

        if (error && error.code !== 'PGRST116') {
          // PGRST116 means no rows returned, which is ok for first time
          console.error('Error fetching settings:', error)
        } else {
          setSettings(data)
          
          // Dynamic Title Logic - Update document title when settings loaded
          if (data?.business_name) {
            document.title = data.business_name
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  // Update document title when settings change
  useEffect(() => {
    if (settings?.business_name) {
      document.title = settings.business_name
    }
  }, [settings])

  // Cart functions
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        return [...prevCart, { ...product, quantity: 1 }]
      }
    })
  }

  const removeFromCart = (productId) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productId)
      
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(item =>
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      } else {
        return prevCart.filter(item => item.id !== productId)
      }
    })
  }

  const clearCart = () => {
    setCart([])
  }

  const updateCartItemQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.id !== productId))
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === productId
            ? { ...item, quantity }
            : item
        )
      )
    }
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.sell_price * item.quantity), 0)
  }

  const getCartItemsCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const updateSettings = async (newSettings) => {
    try {
      // Check if existing settings has an ID, then merge it with newSettings
      const payload = settings?.id ? { ...newSettings, id: settings.id } : newSettings
      
      const { data, error } = await supabase
        .from('app_settings')
        .upsert(payload)
        .select()
        .single()

      if (error) throw error
      
      setSettings(data)
      return { success: true, data }
    } catch (error) {
      console.error('Error updating settings:', error)
      return { success: false, error: error.message }
    }
  }

  const value = {
    settings,
    cart,
    loading,
    addToCart,
    removeFromCart,
    clearCart,
    updateCartItemQuantity,
    getCartTotal,
    getCartItemsCount,
    updateSettings,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}