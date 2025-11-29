// src/app/page.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  DollarSign,
  Users,
  AlertCircle
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { supabase } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    todaySales: 0,
    todayTransactions: 0,
    debtTransactions: 0
  })
  const [chartData, setChartData] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Get today's date
      const today = new Date().toISOString().split('T')[0]
      
      // Fetch stats
      const [
        totalSalesResult,
        totalTransactionsResult,
        totalProductsResult,
        todaySalesResult,
        todayTransactionsResult,
        debtTransactionsResult,
        recentTransactionsResult,
        lowStockResult
      ] = await Promise.all([
        // Total sales
        supabase
          .from('transactions')
          .select('total_amount')
          .eq('type', 'OUT'),
        
        // Total transactions
        supabase
          .from('transactions')
          .select('id')
          .eq('type', 'OUT'),
        
        // Total products
        supabase
          .from('products')
          .select('id'),
        
        // Today's sales
        supabase
          .from('transactions')
          .select('total_amount')
          .eq('type', 'OUT')
          .eq('date', today),
        
        // Today's transactions
        supabase
          .from('transactions')
          .select('id')
          .eq('type', 'OUT')
          .eq('date', today),
        
        // Debt transactions
        supabase
          .from('transactions')
          .select('id, total_amount')
          .eq('type', 'OUT')
          .eq('status', 'DEBT'),
        
        // Recent transactions
        supabase
          .from('transactions')
          .select(`
            *,
            transaction_items (
              product_id,
              quantity,
              price,
              products (
                name
              )
            )
          `)
          .eq('type', 'OUT')
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Low stock products
        supabase
          .from('products')
          .select('id, name, stock, min_stock')
          .lt('stock', 'min_stock')
          .order('stock', { ascending: true })
          .limit(10)
      ])

      // Calculate stats
      const totalSales = totalSalesResult.data?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0
      const totalTransactions = totalTransactionsResult.data?.length || 0
      const totalProducts = totalProductsResult.data?.length || 0
      const todaySales = todaySalesResult.data?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0
      const todayTransactions = todayTransactionsResult.data?.length || 0
      const debtTransactions = debtTransactionsResult.data?.length || 0
      const lowStockProducts = lowStockResult.data?.length || 0

      setStats({
        totalSales,
        totalTransactions,
        totalProducts,
        lowStockProducts,
        todaySales,
        todayTransactions,
        debtTransactions
      })

      setRecentTransactions(recentTransactionsResult.data || [])
      setLowStockItems(lowStockResult.data || [])

      // Fetch chart data (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { data: chartResult } = await supabase
        .from('transactions')
        .select('date, total_amount')
        .eq('type', 'OUT')
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true })

      // Process chart data
      const dailySales = {}
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        dailySales[dateStr] = { date: formatDate(date, 'MMM dd'), sales: 0 }
      }

      chartResult?.forEach(transaction => {
        if (dailySales[transaction.date]) {
          dailySales[transaction.date].sales += transaction.total_amount || 0
        }
      })

      setChartData(Object.values(dailySales))

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your business performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              All time revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todaySales)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayTransactions} transactions today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.lowStockProducts} low in stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Debt</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.debtTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Unpaid transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ fill: '#2563eb' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {recentTransactions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No transactions yet</p>
              ) : (
                recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium truncate">{transaction.customer_name || 'Cash Customer'}</p>
                        <Badge variant={transaction.status === 'PAID' ? 'default' : 'secondary'} className="flex-shrink-0">
                          {transaction.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="font-medium">{formatCurrency(transaction.total_amount)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <span className="font-medium text-sm truncate">{item.name}</span>
                  <Badge variant="destructive" className="flex-shrink-0">
                    Stock: {item.stock}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}