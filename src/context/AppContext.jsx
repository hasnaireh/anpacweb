// src/context/AppContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext()

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export const AppProvider = ({ children }) => {
  const [appSettings, setAppSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAppSettings()
  }, [])

  const fetchAppSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .single()

      if (error) {
        console.error('Error fetching app settings:', error)
        // Set default values if no settings exist
        setAppSettings({
          business_name: 'ANPAC Store',
          app_title: 'ANPAC ERP & POS',
          address: '',
          phone: ''
        })
      } else {
        setAppSettings(data)
      }
    } catch (error) {
      console.error('Error fetching app settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateAppSettings = async (settings) => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .upsert(settings)
        .select()
        .single()

      if (error) {
        throw error
      }

      setAppSettings(data)
      return { success: true, data }
    } catch (error) {
      console.error('Error updating app settings:', error)
      return { success: false, error: error.message }
    }
  }

  const value = {
    appSettings,
    loading,
    updateAppSettings,
    refreshAppSettings: fetchAppSettings,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}