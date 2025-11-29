// src/lib/helpers.js
import { format } from 'date-fns'

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatDate = (date, formatString = 'dd MMMM yyyy') => {
  return format(new Date(date), formatString)
}

export const formatDateTime = (date) => {
  return format(new Date(date), 'dd MMMM yyyy HH:mm')
}

export const generateWhatsAppMessage = (transaction, items, businessName) => {
  const message = `
📋 *STRUK PEMBAYARAN*
🏪 *${businessName}*

📅 Tanggal: ${formatDate(transaction.date)}
👤 Pelanggan: ${transaction.customer_name || 'Cash'}
📞 Telepon: ${transaction.customer_phone || '-'}
💰 Total: ${formatCurrency(transaction.total_amount)}
💳 Status: ${transaction.status === 'PAID' ? 'Lunas' : 'Hutang'}

📦 *Detail Barang:*
${items.map(item => 
  `• ${item.name} (${item.quantity}x) = ${formatCurrency(item.price * item.quantity)}`
).join('\n')}

---
*Terima kasih atas kunjungan Anda!*
  `.trim()
  
  return encodeURIComponent(message)
}

export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return ''
  
  // Remove all non-digit characters
  let cleanPhone = phoneNumber.replace(/\D/g, '')
  
  // Handle Indonesian phone number formats
  if (cleanPhone.startsWith('0')) {
    // Format: 0812-3456-7890 or 62812-3456-7890
    if (cleanPhone.startsWith('08')) {
      // Convert 0812 to 62812
      cleanPhone = '628' + cleanPhone.substring(2)
    } else if (cleanPhone.startsWith('62')) {
      // Keep as is (already in correct format)
      cleanPhone = '62' + cleanPhone.substring(2)
    }
  } else {
    // For numbers starting with 8 (without 0), add 62 prefix
    if (cleanPhone.startsWith('8')) {
      cleanPhone = '62' + cleanPhone
    }
  }
  
  return cleanPhone
}

export const generateWhatsAppLink = (phoneNumber, message) => {
  const formattedPhone = formatPhoneNumber(phoneNumber)
  
  if (!formattedPhone) {
    // If no phone number, open WhatsApp with message only
    return `https://wa.me/?text=${message}`
  }
  
  return `https://wa.me/${formattedPhone}?text=${message}`
}

export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export const calculateSubtotal = (items) => {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0)
}

export const validateForm = (formData, rules) => {
  const errors = {}
  
  for (const field in rules) {
    const value = formData[field]
    const fieldRules = rules[field]
    
    if (fieldRules.required && (!value || value.toString().trim() === '')) {
      errors[field] = `${field} is required`
    }
    
    if (fieldRules.min && value && value.length < fieldRules.min) {
      errors[field] = `${field} must be at least ${fieldRules.min} characters`
    }
    
    if (fieldRules.max && value && value.length > fieldRules.max) {
      errors[field] = `${field} must not exceed ${fieldRules.max} characters`
    }
    
    if (fieldRules.pattern && value && !fieldRules.pattern.test(value)) {
      errors[field] = `${field} format is invalid`
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}