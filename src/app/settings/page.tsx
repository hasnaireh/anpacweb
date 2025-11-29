// src/app/settings/page.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { 
  Settings, 
  Store, 
  Phone, 
  MapPin, 
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

export default function SettingsPage() {
  const { settings, updateSettings } = useApp()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    business_name: '',
    address: '',
    phone: ''
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        business_name: settings.business_name || '',
        address: settings.address || '',
        phone: settings.phone || ''
      })
    }
  }, [settings])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
    setSuccess(false)
  }

  const handleSave = async () => {
    if (!formData.business_name.trim()) {
      setError('Business name is required')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const result = await updateSettings(formData)
      
      if (result.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || 'Failed to save settings')
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    if (settings) {
      setFormData({
        business_name: settings.business_name || '',
        address: settings.address || '',
        phone: settings.phone || ''
      })
    }
    setError('')
    setSuccess(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your business information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Store className="h-5 w-5 mr-2" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Settings saved successfully! The business name has been updated across the application.
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => handleInputChange('business_name', e.target.value)}
                    placeholder="Enter your business name"
                    className="text-base"
                  />
                  <p className="text-sm text-gray-500">
                    This name will appear on receipts, reports, and in the browser title
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter your business address"
                    rows={3}
                  />
                  <p className="text-sm text-gray-500">
                    This address will appear on receipts
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Enter your phone number"
                  />
                  <p className="text-sm text-gray-500">
                    This phone number will appear on receipts
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1"
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
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={loading}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-4 border rounded-lg bg-gray-50">
                  <h3 className="font-bold text-lg mb-2">
                    {formData.business_name || 'Your Business Name'}
                  </h3>
                  {formData.address && (
                    <div className="flex items-start justify-center mb-2">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 text-gray-500" />
                      <span className="text-sm text-gray-600">{formData.address}</span>
                    </div>
                  )}
                  {formData.phone && (
                    <div className="flex items-center justify-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-600">{formData.phone}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 border rounded-lg bg-blue-50">
                  <h4 className="font-medium text-sm mb-2">Browser Title Preview:</h4>
                  <div className="bg-white p-2 rounded border text-sm font-mono">
                    {formData.business_name || 'Your Business Name'} - POS System
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-green-50">
                  <h4 className="font-medium text-sm mb-2">Receipt Header Preview:</h4>
                  <div className="bg-white p-3 rounded border text-center">
                    <div className="font-bold">{formData.business_name || 'Your Business Name'}</div>
                    {formData.address && (
                      <div className="text-xs text-gray-600 mt-1">{formData.address}</div>
                    )}
                    {formData.phone && (
                      <div className="text-xs text-gray-600">Tel: {formData.phone}</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Settings Info */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Dynamic Branding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <strong>Browser Title:</strong> Updates automatically when business name changes
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <strong>Header Logo:</strong> Business name appears in the app header
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <strong>Receipts:</strong> Business info is included on all receipts
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <strong>WhatsApp:</strong> Business name is included in WhatsApp messages
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}