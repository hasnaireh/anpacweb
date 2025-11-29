// src/components/ReceiptModal.jsx
'use client'
import React, { useRef, useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApp } from '@/context/AppContext'
import { formatCurrency, formatDate, generateWhatsAppLink, generateWhatsAppMessage, formatPhoneNumber } from '@/lib/helpers'
import { Printer, MessageCircle, X } from 'lucide-react'

const ReceiptModal = ({ isOpen, onClose, transaction, items }) => {
  const receiptRef = useRef(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const { settings } = useApp()

  // Auto-fill phone number from transaction data
  useEffect(() => {
    if (transaction?.customer_phone) {
      setPhoneNumber(transaction.customer_phone)
    } else {
      setPhoneNumber('')
    }
  }, [transaction])

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank')
      const receiptContent = receiptRef.current.innerHTML
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${settings?.business_name || 'POS'}</title>
            <style>
              body { 
                font-family: monospace; 
                margin: 0; 
                padding: 20px; 
                max-width: 400px; 
                margin: 0 auto;
              }
              .receipt { 
                border: 1px solid #ddd; 
                padding: 20px; 
                background: white;
              }
              .header { text-align: center; margin-bottom: 20px; }
              .header h2 { margin: 0; }
              .item { display: flex; justify-content: space-between; margin: 5px 0; }
              .total { border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="receipt">
              ${receiptContent}
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleWhatsApp = () => {
    if (!transaction || !items) return

    const message = generateWhatsAppMessage(transaction, items, settings?.business_name || 'POS')
    const formattedPhone = formatPhoneNumber(phoneNumber)
    
    if (formattedPhone) {
      window.open(generateWhatsAppLink(formattedPhone, message), '_blank')
    } else {
      // Open WhatsApp with message but no specific number
      window.open(`https://wa.me/?text=${message}`, '_blank')
    }
  }

  if (!transaction || !items) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] w-[95%] max-w-md flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Transaction Receipt</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Receipt Content */}
          <div 
            ref={receiptRef}
            className="bg-white p-6 border rounded-lg font-mono text-sm flex-shrink-0"
            style={{ backgroundColor: '#ffffff', color: '#000000' }}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <h2 style={{ color: '#000000' }}>
                {settings?.business_name || 'Toko Sparepart'}
              </h2>
              {settings?.address && (
                <p style={{ color: '#000000' }}>{settings.address}</p>
              )}
              {settings?.phone && (
                <p style={{ color: '#000000' }}>Tel: {settings.phone}</p>
              )}
              <div className="border-t border-b border-dashed my-3 py-2">
                <p style={{ color: '#000000' }}>INVOICE</p>
              </div>
            </div>

            {/* Transaction Info */}
            <div className="mb-4 space-y-1">
              <div className="flex justify-between">
                <span style={{ color: '#000000' }}>Date:</span>
                <span style={{ color: '#000000' }}>{formatDate(transaction.date)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#000000' }}>Invoice:</span>
                <span style={{ color: '#000000' }}>#{transaction.id?.slice(0, 8) || 'NEW'}</span>
              </div>
              {transaction.customer_name && (
                <div className="flex justify-between">
                  <span style={{ color: '#000000' }}>Customer:</span>
                  <span style={{ color: '#000000' }}>{transaction.customer_name}</span>
                </div>
              )}
              {transaction.customer_phone && (
                <div className="flex justify-between">
                  <span style={{ color: '#000000' }}>Phone:</span>
                  <span style={{ color: '#000000' }}>{transaction.customer_phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ color: '#000000' }}>Status:</span>
                <span className={`font-semibold ${
                  transaction.status === 'PAID' ? 'text-green-600' : 'text-orange-600'
                }`} style={{ color: transaction.status === 'PAID' ? '#16a34a' : '#ea580c' }}>
                  {transaction.status === 'PAID' ? 'PAID' : 'DEBT'}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="border-t border-b border-dashed py-3 mb-4">
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <div className="flex-1">
                      <div style={{ color: '#000000' }} className="font-medium">{item.name}</div>
                      <div style={{ color: '#666666' }} className="text-xs">
                        {item.quantity} x {formatCurrency(item.price)}
                      </div>
                    </div>
                    <div className="text-right" style={{ color: '#000000' }}>
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="space-y-1">
              <div className="flex justify-between font-bold text-lg" style={{ color: '#000000' }}>
                <span>TOTAL:</span>
                <span>{formatCurrency(transaction.total_amount)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 pt-4 border-t" style={{ borderTopColor: '#e5e7eb' }}>
              <p style={{ color: '#000000' }} className="text-xs text-gray-600">Thank you for your purchase!</p>
              <p style={{ color: '#000000' }} className="text-xs text-gray-600">Please come again</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 flex-shrink-0">
            {/* WhatsApp Input */}
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0812-3456-7890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="w-full"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
              
              <Button
                onClick={handleWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Send via WhatsApp
              </Button>
            </div>
          </div>

          {/* Close Button */}
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full flex-shrink-0"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ReceiptModal