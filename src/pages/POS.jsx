// src/pages/POS.jsx
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  CreditCard,
  DollarSign,
  X,
  Package,
  AlertCircle
} from 'lucide-react'

const POS = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [customerName, setCustomerName] = useState('Umum')
  const [paymentType, setPaymentType] = useState('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [loading, setLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    setProductsLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (name)
        `)
        .gt('stock', 0)
        .order('name')

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      setError('Gagal memuat produk. Silakan cek koneksi database.')
    } finally {
      setProductsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching categories:', error)
        // Don't throw error for categories, just log it
        return
      }
      
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          alert('Stok tidak mencukupi!')
          return prevCart
        }
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prevCart, { ...product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId, change) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === productId) {
          const newQuantity = item.quantity + change
          if (newQuantity <= 0) {
            return null
          }
          if (newQuantity > item.stock) {
            alert('Stok tidak mencukupi!')
            return item
          }
          return { ...item, quantity: newQuantity }
        }
        return item
      }).filter(Boolean)
    })
  }

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId))
  }

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.sell_price * item.quantity), 0)
  }

  const getChange = () => {
    const total = getTotalAmount()
    const cash = parseFloat(cashReceived) || 0
    return cash - total
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Keranjang belanja kosong!')
      return
    }

    if (paymentType === 'cash' && (!cashReceived || parseFloat(cashReceived) < getTotalAmount())) {
      alert('Uang tunai tidak mencukupi!')
      return
    }

    setLoading(true)
    try {
      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          type: 'OUT',
          total_amount: getTotalAmount(),
          status: paymentType === 'cash' ? 'PAID' : 'DEBT',
          customer_name: customerName === 'Umum' ? null : customerName,
          date: new Date().toISOString()
        })
        .select()
        .single()

      if (transactionError) throw transactionError

      // Create transaction items
      const transactionItems = cart.map(item => ({
        transaction_id: transaction.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.sell_price
      }))

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems)

      if (itemsError) throw itemsError

      // Clear cart and close modal
      setCart([])
      setShowCheckoutModal(false)
      setCustomerName('Umum')
      setCashReceived('')
      setPaymentType('cash')

      alert('Transaksi berhasil!')
      
      // Refresh products to update stock
      fetchProducts()
    } catch (error) {
      console.error('Error during checkout:', error)
      alert('Terjadi kesalahan saat melakukan transaksi!')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Package className="h-4 w-4" />
          <span>{cart.length} items in cart</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[600px] pr-2">
            {productsLoading ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading products...</p>
                </div>
              </div>
            ) : error ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                  <p className="text-red-600">{error}</p>
                  <button
                    onClick={fetchProducts}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <div className="text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No products found</p>
                  <p className="text-sm text-gray-400">Try adjusting your search or filter</p>
                </div>
              </div>
            ) : (
              filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => addToCart(product)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Stock: {product.stock}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">SKU: {product.sku}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(product.sell_price)}
                    </span>
                    <button className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Shopping Cart</h2>
            <ShoppingCart className="h-5 w-5 text-gray-600" />
          </div>

          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Your cart is empty</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">{formatCurrency(item.sell_price)} x {item.quantity}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(getTotalAmount())}
                  </span>
                </div>
                <button
                  onClick={() => setShowCheckoutModal(true)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Checkout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Checkout</h2>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter customer name"
                />
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentType('cash')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      paymentType === 'cash'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <DollarSign className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm">Cash</span>
                  </button>
                  <button
                    onClick={() => setPaymentType('debt')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      paymentType === 'debt'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm">Debt</span>
                  </button>
                </div>
              </div>

              {/* Cash Amount (for cash payment) */}
              {paymentType === 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cash Received
                  </label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter cash amount"
                  />
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-semibold">{formatCurrency(getTotalAmount())}</span>
                </div>
                {paymentType === 'cash' && cashReceived && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash Received:</span>
                      <span className="font-semibold">{formatCurrency(parseFloat(cashReceived) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Change:</span>
                      <span className={getChange() >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(getChange())}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Warning for insufficient cash */}
              {paymentType === 'cash' && cashReceived && getChange() < 0 && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">Insufficient cash amount!</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={loading || (paymentType === 'cash' && getChange() < 0)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                  ) : (
                    'Complete Transaction'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default POS