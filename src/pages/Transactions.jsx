// src/pages/Transactions.jsx
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  Calendar,
  DollarSign,
  CreditCard,
  AlertCircle,
  X,
  Check,
  Clock
} from 'lucide-react'

const Transactions = () => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items (
            id,
            quantity,
            price,
            products (name, sku)
          )
        `)
        .order('date', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDate = !selectedDate || 
      new Date(transaction.date).toDateString() === new Date(selectedDate).toDateString()
    
    return matchesSearch && matchesDate
  })

  const updateTransactionStatus = async (transactionId, newStatus) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', transactionId)

      if (error) throw error
      
      fetchTransactions()
      alert('Transaction status updated successfully!')
    } catch (error) {
      console.error('Error updating transaction:', error)
      alert('Error updating transaction status')
    }
  }

  const deleteTransaction = async (transaction) => {
    if (!confirm('Are you sure you want to void this transaction? This will restore stock quantities.')) {
      return
    }

    try {
      // The trigger will automatically restore stock when transaction_items are deleted
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id)

      if (error) throw error
      
      fetchTransactions()
      alert('Transaction voided successfully! Stock has been restored.')
    } catch (error) {
      console.error('Error voiding transaction:', error)
      alert('Error voiding transaction')
    }
  }

  const viewTransactionDetail = (transaction) => {
    setSelectedTransaction(transaction)
    setShowDetailModal(true)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const styles = {
      PAID: 'bg-green-100 text-green-800',
      DEBT: 'bg-yellow-100 text-yellow-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status === 'PAID' ? (
          <>
            <Check className="h-3 w-3 mr-1" />
            Paid
          </>
        ) : (
          <>
            <Clock className="h-3 w-3 mr-1" />
            Debt
          </>
        )}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
        <p className="text-gray-600">View and manage all your transactions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by customer name or transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading transactions...</p>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.customer_name || 'Umum'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(transaction.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => viewTransactionDetail(transaction)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {transaction.status === 'DEBT' && (
                          <button
                            onClick={() => updateTransactionStatus(transaction.id, 'PAID')}
                            className="text-green-600 hover:text-green-900"
                            title="Mark as Paid"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteTransaction(transaction)}
                          className="text-red-600 hover:text-red-900"
                          title="Void Transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {showDetailModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Transaction Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Transaction Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Transaction ID</p>
                      <p className="font-medium">{selectedTransaction.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">{formatDate(selectedTransaction.date)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customer</p>
                      <p className="font-medium">{selectedTransaction.customer_name || 'Umum'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <div>{getStatusBadge(selectedTransaction.status)}</div>
                    </div>
                  </div>
                </div>

                {/* Transaction Items */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Items</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Product
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            SKU
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Quantity
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedTransaction.transaction_items?.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {item.products?.name || 'Unknown Product'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {item.products?.sku || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatCurrency(item.price)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {formatCurrency(item.price * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(selectedTransaction.total_amount)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {selectedTransaction.status === 'DEBT' && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        updateTransactionStatus(selectedTransaction.id, 'PAID')
                        setShowDetailModal(false)
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Check className="h-4 w-4" />
                      <span>Mark as Paid</span>
                    </button>
                    <button
                      onClick={() => {
                        deleteTransaction(selectedTransaction)
                        setShowDetailModal(false)
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Void Transaction</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Transactions