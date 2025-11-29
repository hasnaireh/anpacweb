// src/app/pos/page.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetClose } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApp } from '@/context/AppContext'
import { formatCurrency } from '@/lib/helpers'
import { supabase } from '@/lib/supabase'
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Search,
  Package,
  DollarSign,
  User,
  Phone,
  ChevronDown
} from 'lucide-react'
import ReceiptModal from '@/components/ReceiptModal'

export default function POS() {
  const { cart, addToCart, removeFromCart, clearCart, getCartTotal, getCartItemsCount, updateCartItemQuantity } = useApp()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastTransaction, setLastTransaction] = useState(null)
  const [lastTransactionItems, setLastTransactionItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  
  // Customer info
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('PAID')
  
  // Payment calculator
  const [receivedAmount, setReceivedAmount] = useState('')
  
  // Calculate change
  const calculateChange = () => {
    const total = getCartTotal()
    const received = parseFloat(receivedAmount) || 0
    return received - total
  }
  
  const change = calculateChange()

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            name
          )
        `)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleCheckout = async () => {
    if (cart.length === 0) return

    setProcessing(true)
    try {
      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          type: 'OUT',
          total_amount: getCartTotal(),
          status: paymentStatus,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          date: new Date().toISOString().split('T')[0]
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

      // Prepare receipt data
      const receiptItems = cart.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.sell_price
      }))

      setLastTransaction(transaction)
      setLastTransactionItems(receiptItems)
      
      // Clear cart and close checkout
      clearCart()
      setShowCheckout(false)
      setShowReceipt(true)
      
      // Reset customer info
      setCustomerName('')
      setCustomerPhone('')
      setPaymentStatus('PAID')

    } catch (error) {
      console.error('Error processing transaction:', error)
      alert('Error processing transaction: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const removeItemFromCart = (productId) => {
    const newCart = cart.filter(item => item.id !== productId)
    // Update cart by clearing and re-adding remaining items
    clearCart()
    newCart.forEach(item => {
      for(let i = 0; i < item.quantity; i++) {
        addToCart(item)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-gray-600">Process sales and manage inventory</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            <ShoppingCart className="h-3 w-3 mr-1" />
            {getCartItemsCount()} items
          </Badge>
          <Badge variant="outline">
            <DollarSign className="h-3 w-3 mr-1" />
            {formatCurrency(getCartTotal())}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No products found
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <Card 
                      key={product.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        cart.find(item => item.id === product.id) ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                            <p className="text-xs text-gray-500">{product.sku}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {product.categories?.name}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">{formatCurrency(product.sell_price)}</p>
                            <Badge 
                              variant={product.stock > 5 ? "default" : "destructive"}
                              className="text-xs"
                            >
                              Stock: {product.stock}
                            </Badge>
                          </div>
                        </div>
                        {cart.find(item => item.id === product.id) && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-blue-600">
                              In cart: {cart.find(item => item.id === product.id).quantity}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shopping Cart</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Your cart is empty</p>
                  <p className="text-sm">Click on products to add them</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cart Items */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <p className="text-xs text-gray-500">{formatCurrency(item.sell_price)}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToCart(item)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItemFromCart(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cart Total */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-medium">Total:</span>
                      <span className="text-xl font-bold">{formatCurrency(getCartTotal())}</span>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => setShowCheckout(true)}
                      disabled={cart.length === 0}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Checkout
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-h-[90vh] w-[95%] max-w-md flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Checkout</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name (Optional)</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone Number (Optional)</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="DEBT">Debt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Calculator - Only show if PAID */}
            {paymentStatus === 'PAID' && (
              <div className="space-y-2">
                <Label htmlFor="receivedAmount">Uang Diterima</Label>
                <Input
                  id="receivedAmount"
                  type="number"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  placeholder="Masukkan jumlah uang yang diterima"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Tagihan:</span>
                <span className="text-xl font-bold">{formatCurrency(getCartTotal())}</span>
              </div>

              {/* Change Display - Only show if PAID and has valid input */}
              {paymentStatus === 'PAID' && receivedAmount && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Kembalian:</span>
                  <span className={`text-xl font-bold ${
                    change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(change)}
                  </span>
                </div>
              )}

              <div className="flex space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCheckout(false)
                    // Reset payment calculator
                    setReceivedAmount('')
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCheckout}
                  disabled={
                    processing || 
                    cart.length === 0 || 
                    (paymentStatus === 'PAID' && (!receivedAmount || parseFloat(receivedAmount) < getCartTotal()))
                  }
                  className="flex-1"
                >
                  {processing ? 'Processing...' : 'Complete Sale'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        transaction={lastTransaction}
        items={lastTransactionItems}
      />

      {/* Floating Action Button (FAB) */}
      {cart.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-all hover:scale-110"
        >
          <ShoppingCart className="h-6 w-6" />
          {getCartItemsCount() > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {getCartItemsCount()}
            </span>
          )}
        </button>
      )}

      {/* Cart Drawer */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Keranjang Belanja</SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto px-4">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Keranjang belanja kosong</p>
                <p className="text-sm">Tambah produk untuk memulai</p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                {cart.map((item) => (
                  <div key={item.id} className="bg-white border rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-xs text-gray-500">{formatCurrency(item.sell_price)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFromCart(item.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addToCart(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItemFromCart(item.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SheetFooter>
            <div className="w-full space-y-3">
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(getCartTotal())}</span>
              </div>
              <Button
                onClick={() => {
                  setIsCartOpen(false)
                  setShowCheckout(true)
                }}
                disabled={cart.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                size="lg"
              >
                <DollarSign className="h-5 w-5 mr-2" />
                Lanjut ke Pembayaran
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}