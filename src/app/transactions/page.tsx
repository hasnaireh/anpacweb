// src/app/transactions/page.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { supabase } from '@/lib/supabase'
import { 
  Receipt, 
  Search, 
  Calendar,
  Filter,
  Eye,
  Trash2,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  Table
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear, 
  endOfYear,
  format,
  isWithinInterval
} from 'date-fns'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [transactionItems, setTransactionItems] = useState([])
  
  // Export states
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportRange, setExportRange] = useState('thisMonth')
  const [exportFormat, setExportFormat] = useState('excel')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items (
            id,
            quantity,
            price,
            products (
              name,
              sku
            )
          )
        `)
        .eq('type', 'OUT')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactionItems = async (transactionId) => {
    try {
      const { data, error } = await supabase
        .from('transaction_items')
        .select(`
          *,
          products (
            name,
            sku
          )
        `)
        .eq('transaction_id', transactionId)

      if (error) throw error
      setTransactionItems(data || [])
    } catch (error) {
      console.error('Error fetching transaction items:', error)
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer_phone?.includes(searchTerm) ||
      transaction.id?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter
    const matchesDate = !dateFilter || transaction.date === dateFilter

    return matchesSearch && matchesStatus && matchesDate
  })

  const handleViewDetail = async (transaction) => {
    setSelectedTransaction(transaction)
    await fetchTransactionItems(transaction.id)
    setShowDetailDialog(true)
  }

  const handleVoidTransaction = async (transactionId) => {
    if (!confirm('Are you sure you want to void this transaction? This will restore the stock and cannot be undone.')) {
      return
    }

    try {
      // Delete transaction items (this will trigger stock restoration)
      const { error: itemsError } = await supabase
        .from('transaction_items')
        .delete()
        .eq('transaction_id', transactionId)

      if (itemsError) throw itemsError

      // Delete transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)

      if (transactionError) throw transactionError

      alert('Transaction voided successfully. Stock has been restored.')
      fetchTransactions()
    } catch (error) {
      console.error('Error voiding transaction:', error)
      alert('Error voiding transaction: ' + error.message)
    }
  }

  const handlePayDebt = async (transactionId) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'PAID' })
        .eq('id', transactionId)

      if (error) throw error

      alert('Debt marked as paid.')
      fetchTransactions()
    } catch (error) {
      console.error('Error paying debt:', error)
      alert('Error paying debt: ' + error.message)
    }
  }

  // Export functions
  const getDateRange = (range) => {
    const now = new Date()
    
    switch (range) {
      case 'thisMonth':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        }
      case 'last3Months':
        return {
          start: startOfMonth(subMonths(now, 2)),
          end: endOfMonth(now)
        }
      case 'last6Months':
        return {
          start: startOfMonth(subMonths(now, 5)),
          end: endOfMonth(now)
        }
      case 'thisYear':
        return {
          start: startOfYear(now),
          end: endOfYear(now)
        }
      case 'allTime':
        return {
          start: new Date(2020, 0, 1), // Arbitrary start date
          end: now
        }
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        }
    }
  }

  const fetchExportData = async (startDate, endDate) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items (
            id,
            quantity,
            price,
            products (
              name,
              sku
            )
          )
        `)
        .eq('type', 'OUT')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching export data:', error)
      throw error
    }
  }

  const exportToExcel = (data, dateRange) => {
    const worksheetData = []
    
    // Header
    worksheetData.push([
      'LAPORAN PENJUALAN',
      '',
      '',
      '',
      '',
      '',
      ''
    ])
    worksheetData.push([
      `Periode: ${format(dateRange.start, 'dd MMM yyyy')} - ${format(dateRange.end, 'dd MMM yyyy')}`,
      '',
      '',
      '',
      '',
      '',
      ''
    ])
    worksheetData.push([
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ])
    
    // Column headers
    worksheetData.push([
      'Tanggal',
      'Invoice',
      'Customer',
      'Item Product',
      'Qty',
      'Harga Satuan',
      'Total Baris',
      'Status'
    ])
    
    // Data rows
    data.forEach(transaction => {
      if (transaction.transaction_items && transaction.transaction_items.length > 0) {
        transaction.transaction_items.forEach((item, index) => {
          worksheetData.push([
            index === 0 ? formatDate(transaction.date) : '',
            index === 0 ? `#${transaction.id?.slice(0, 8)}` : '',
            index === 0 ? (transaction.customer_name || 'Cash Customer') : '',
            item.products?.name || 'Unknown Product',
            item.quantity || 0,
            item.price || 0,
            (item.quantity || 0) * (item.price || 0),
            index === 0 ? transaction.status : ''
          ])
        })
      } else {
        worksheetData.push([
          formatDate(transaction.date),
          `#${transaction.id?.slice(0, 8)}`,
          transaction.customer_name || 'Cash Customer',
          'No items',
          0,
          0,
          transaction.total_amount || 0,
          transaction.status
        ])
      }
    })
    
    // Total
    worksheetData.push([
      '',
      '',
      '',
      '',
      '',
      'GRAND TOTAL:',
      data.reduce((sum, t) => sum + (t.total_amount || 0), 0),
      ''
    ])
    
    const ws = XLSX.utils.aoa_to_sheet(worksheetData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Penjualan')
    
    // Generate filename
    const filename = `Laporan_Penjualan_${format(dateRange.start, 'yyyy-MM-dd')}_to_${format(dateRange.end, 'yyyy-MM-dd')}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  const exportToCSV = (data, dateRange) => {
    const csvData = []
    
    // Header
    csvData.push('LAPORAN PENJUALAN')
    csvData.push(`Periode: ${format(dateRange.start, 'dd MMM yyyy')} - ${format(dateRange.end, 'dd MMM yyyy')}`)
    csvData.push('')
    
    // Column headers
    csvData.push('Tanggal,Invoice,Customer,Item Product,Qty,Harga Satuan,Total Baris,Status')
    
    // Data rows
    data.forEach(transaction => {
      if (transaction.transaction_items && transaction.transaction_items.length > 0) {
        transaction.transaction_items.forEach((item, index) => {
          csvData.push([
            index === 0 ? formatDate(transaction.date) : '',
            index === 0 ? `#${transaction.id?.slice(0, 8)}` : '',
            index === 0 ? (transaction.customer_name || 'Cash Customer') : '',
            `"${item.products?.name || 'Unknown Product'}"`,
            item.quantity || 0,
            item.price || 0,
            (item.quantity || 0) * (item.price || 0),
            index === 0 ? transaction.status : ''
          ].join(','))
        })
      } else {
        csvData.push([
          formatDate(transaction.date),
          `#${transaction.id?.slice(0, 8)}`,
          transaction.customer_name || 'Cash Customer',
          'No items',
          0,
          0,
          transaction.total_amount || 0,
          transaction.status
        ].join(','))
      }
    })
    
    // Total
    csvData.push(`,,,,,GRAND TOTAL:,${data.reduce((sum, t) => sum + (t.total_amount || 0), 0)},`)
    
    const csvString = csvData.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `Laporan_Penjualan_${format(dateRange.start, 'yyyy-MM-dd')}_to_${format(dateRange.end, 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = (data, dateRange) => {
    const doc = new jsPDF()
    
    // Add custom font for better Unicode support
    doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf', 'Roboto', 'normal')
    doc.setFont('helvetica')
    
    // Title
    doc.setFontSize(16)
    doc.text('LAPORAN PENJUALAN', 105, 20, { align: 'center' })
    
    // Period
    doc.setFontSize(10)
    doc.text(
      `Periode: ${format(dateRange.start, 'dd MMM yyyy')} - ${format(dateRange.end, 'dd MMM yyyy')}`,
      105,
      30,
      { align: 'center' }
    )
    
    // Prepare table data
    const tableData = []
    data.forEach(transaction => {
      if (transaction.transaction_items && transaction.transaction_items.length > 0) {
        transaction.transaction_items.forEach((item, index) => {
          tableData.push([
            index === 0 ? formatDate(transaction.date) : '',
            index === 0 ? `#${transaction.id?.slice(0, 8)}` : '',
            index === 0 ? (transaction.customer_name || 'Cash Customer') : '',
            item.products?.name || 'Unknown Product',
            item.quantity?.toString() || '0',
            formatCurrency(item.price || 0),
            formatCurrency((item.quantity || 0) * (item.price || 0)),
            index === 0 ? transaction.status : ''
          ])
        })
      } else {
        tableData.push([
          formatDate(transaction.date),
          `#${transaction.id?.slice(0, 8)}`,
          transaction.customer_name || 'Cash Customer',
          'No items',
          '0',
          formatCurrency(0),
          formatCurrency(transaction.total_amount || 0),
          transaction.status
        ])
      }
    })
    
    // Add table using imported autoTable function
    autoTable(doc, {
      head: [['Tanggal', 'Invoice', 'Customer', 'Item Product', 'Qty', 'Harga Satuan', 'Total Baris', 'Status']],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Tanggal
        1: { cellWidth: 25 }, // Invoice
        2: { cellWidth: 30 }, // Customer
        3: { cellWidth: 40 }, // Item Product
        4: { cellWidth: 15 }, // Qty
        5: { cellWidth: 30 }, // Harga Satuan
        6: { cellWidth: 30 }, // Total Baris
        7: { cellWidth: 20 }  // Status
      }
    })
    
    // Add grand total
    const grandTotal = data.reduce((sum, t) => sum + (t.total_amount || 0), 0)
    const finalY = (doc as any).lastAutoTable?.finalY || 40
    doc.setFontSize(10)
    doc.text(`Grand Total: ${formatCurrency(grandTotal)}`, 170, finalY + 10, { align: 'right' })
    
    // Save the PDF
    doc.save(`Laporan_Penjualan_${format(dateRange.start, 'yyyy-MM-dd')}_to_${format(dateRange.end, 'yyyy-MM-dd')}.pdf`)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const dateRange = getDateRange(exportRange)
      const exportData = await fetchExportData(dateRange.start, dateRange.end)
      
      if (exportData.length === 0) {
        alert('No data found for the selected period.')
        return
      }
      
      switch (exportFormat) {
        case 'excel':
          exportToExcel(exportData, dateRange)
          break
        case 'csv':
          exportToCSV(exportData, dateRange)
          break
        case 'pdf':
          exportToPDF(exportData, dateRange)
          break
        default:
          exportToExcel(exportData, dateRange)
      }
      
      setShowExportDialog(false)
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Error exporting data: ' + error.message)
    } finally {
      setIsExporting(false)
    }
  }

  const totalSales = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0)
  const paidTransactions = transactions.filter(t => t.status === 'PAID')
  const debtTransactions = transactions.filter(t => t.status === 'DEBT')
  const totalDebt = debtTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">Manage sales transactions and debts</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              {transactions.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidTransactions.length}</div>
            <p className="text-xs text-muted-foreground">
              Completed transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Debt</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{debtTransactions.length}</div>
            <p className="text-xs text-muted-foreground">
              Unpaid transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDebt)}</div>
            <p className="text-xs text-muted-foreground">
              Outstanding amount
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="DEBT">Debt</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Filter by date"
            />

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setDateFilter('')
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowExportDialog(true)}
              className="bg-green-50 hover:bg-green-100 border-green-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <table className="w-full">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b">
                    <th className="text-left p-3 whitespace-nowrap">Date</th>
                    <th className="text-left p-3 whitespace-nowrap">Invoice</th>
                    <th className="text-left p-3 whitespace-nowrap">Customer</th>
                    <th className="text-left p-3 whitespace-nowrap">Phone</th>
                    <th className="text-right p-3 whitespace-nowrap">Total</th>
                    <th className="text-center p-3 whitespace-nowrap">Status</th>
                    <th className="text-center p-3 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 whitespace-nowrap">{formatDate(transaction.date)}</td>
                        <td className="p-3 font-mono text-sm whitespace-nowrap">
                          #{transaction.id?.slice(0, 8)}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {transaction.customer_name || 'Cash Customer'}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {transaction.customer_phone || '-'}
                        </td>
                        <td className="p-3 text-right font-medium whitespace-nowrap">
                          {formatCurrency(transaction.total_amount)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <Badge variant={transaction.status === 'PAID' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex justify-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetail(transaction)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {transaction.status === 'DEBT' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePayDebt(transaction.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CreditCard className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVoidTransaction(transaction.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Invoice</Label>
                  <p className="font-mono text-sm">#{selectedTransaction.id?.slice(0, 8)}</p>
                </div>
                <div>
                  <Label>Date</Label>
                  <p>{formatDate(selectedTransaction.date)}</p>
                </div>
                <div>
                  <Label>Customer</Label>
                  <p>{selectedTransaction.customer_name || 'Cash Customer'}</p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <p>{selectedTransaction.customer_phone || '-'}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant={selectedTransaction.status === 'PAID' ? 'default' : 'secondary'}>
                    {selectedTransaction.status}
                  </Badge>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <p className="font-bold text-lg">{formatCurrency(selectedTransaction.total_amount)}</p>
                </div>
              </div>

              <div>
                <Label>Items</Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {transactionItems.map((item, index) => (
                    <div key={index} className="flex justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{item.products?.name}</p>
                        <p className="text-sm text-gray-500">{item.products?.sku}</p>
                      </div>
                      <div className="text-right">
                        <p>{item.quantity} x {formatCurrency(item.price)}</p>
                        <p className="font-medium">{formatCurrency(item.quantity * item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Laporan Penjualan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="exportRange">Rentang Waktu</Label>
              <Select value={exportRange} onValueChange={setExportRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rentang waktu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thisMonth">Bulan Ini</SelectItem>
                  <SelectItem value="last3Months">3 Bulan Terakhir</SelectItem>
                  <SelectItem value="last6Months">6 Bulan Terakhir</SelectItem>
                  <SelectItem value="thisYear">Tahun Ini</SelectItem>
                  <SelectItem value="allTime">Semua Waktu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Format Export</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  variant={exportFormat === 'excel' ? 'default' : 'outline'}
                  onClick={() => setExportFormat('excel')}
                  className="flex items-center justify-center"
                >
                  <Table className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button
                  variant={exportFormat === 'csv' ? 'default' : 'outline'}
                  onClick={() => setExportFormat('csv')}
                  className="flex items-center justify-center"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button
                  variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                  onClick={() => setExportFormat('pdf')}
                  className="flex items-center justify-center"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowExportDialog(false)}
                disabled={isExporting}
              >
                Batal
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}