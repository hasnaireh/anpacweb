// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { Save, Building2, Phone, MapPin, Type } from 'lucide-react'

const Settings = () => {
  const { appSettings, updateAppSettings, loading: appLoading } = useApp()
  const [formData, setFormData] = useState({
    business_name: '',
    app_title: '',
    address: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (appSettings) {
      setFormData({
        business_name: appSettings.business_name || '',
        app_title: appSettings.app_title || '',
        address: appSettings.address || '',
        phone: appSettings.phone || ''
      })
    }
  }, [appSettings])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const result = await updateAppSettings(formData)
      if (result.success) {
        setMessage('Settings updated successfully!')
      } else {
        setMessage('Error updating settings: ' + result.error)
      }
    } catch (error) {
      setMessage('Error updating settings')
    } finally {
      setLoading(false)
    }
  }

  if (appLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your business information and application settings</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('Error') 
            ? 'bg-red-50 border border-red-200 text-red-600' 
            : 'bg-green-50 border border-green-200 text-green-600'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Business Information</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="inline h-4 w-4 mr-2" />
                Business Name
              </label>
              <input
                type="text"
                id="business_name"
                name="business_name"
                value={formData.business_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your business name"
                required
              />
            </div>

            <div>
              <label htmlFor="app_title" className="block text-sm font-medium text-gray-700 mb-2">
                <Type className="inline h-4 w-4 mr-2" />
                Application Title
              </label>
              <input
                type="text"
                id="app_title"
                name="app_title"
                value={formData.app_title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter application title"
                required
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline h-4 w-4 mr-2" />
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your business address"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline h-4 w-4 mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your phone number"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Additional Settings Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">System Information</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">Application</span>
              <span className="font-medium">ANPAC ERP & POS</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">Database</span>
              <span className="font-medium">Supabase</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600">Last Updated</span>
              <span className="font-medium">
                {appSettings?.updated_at 
                  ? new Date(appSettings.updated_at).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Never'
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings