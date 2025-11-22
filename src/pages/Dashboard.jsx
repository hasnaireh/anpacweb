// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  DollarSign, 
  Package, 
  TrendingUp, 
  ShoppingCart,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const Dashboard = () => {
  const [stats, setStats] = useState({
    todaySales: 0,
    totalStock: 0,
    profit: 0,
    totalTransactions: 0
  })
  const [salesData, setSalesData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Get today's date
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()

      // Fetch today's sales
      const { data: todaySalesData, error: todaySalesError } = await supabase
        .from('transactions')
        .select('total_amount')
        .gte('date', todayISO)
        .eq('type', 'OUT')

      if (todaySalesError) throw todaySalesError

      const todaySales = todaySalesData?.reduce((sum, item) => sum + parseFloat(item.total_amount), 0) || 0

      // Fetch total stock
      const { data: stockData, error: stockError } = await supabase
        .from('products')
        .select('stock')

      if (stockError) throw stockError

      const totalStock = stockData?.reduce((sum, item) => sum + item.stock, 0) || 0

      // Fetch profit calculation
      const { data: profitData, error: profitError } = await supabase
        .from('transaction_items')
        .select(`
          quantity,
          price,
          products!inner(buy_price)
        `)
        .gte('created_at', todayISO)

      if (profitError) throw profitError

      const profit = profitData?.reduce((sum, item) => {
        const sellPrice = parseFloat(item.price)
        const buyPrice = parseFloat(item.products.buy_price)
        return sum + ((sellPrice - buyPrice) * item.quantity)
      }, 0) || 0

      // Fetch total transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('id')
        .gte('date', todayISO)

      if (transactionError) throw transactionError

      const totalTransactions = transactionData?.length || 0

      // Fetch last 7 days sales data
      const last7Days = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        last7Days.push(date.toISOString())
      }

      const { data: weeklySalesData, error: weeklySalesError } = await supabase
        .from('transactions')
        .select('date, total_amount')
        .gte('date', last7Days[0])
        .eq('type', 'OUT')
        .order('date', { ascending: true })

      if (weeklySalesError) throw weeklySalesError

      // Group sales by date
      const salesByDate = {}
      last7Days.forEach(date => {
        const dateStr = new Date(date).toLocaleDateString('id-ID', { weekday: 'short' })
        salesByDate[dateStr] = 0
      })

      weeklySalesData?.forEach(item => {
        const dateStr = new Date(item.date).toLocaleDateString('id-ID', { weekday: 'short' })
        if (salesByDate.hasOwnProperty(dateStr)) {
          salesByDate[dateStr] += parseFloat(item.total_amount)
        }
      })

      const chartData = Object.entries(salesByDate).map(([date, amount]) => ({
        date,
        sales: amount
      }))

      setStats({
        todaySales,
        totalStock,
        profit,
        totalTransactions
      })
      setSalesData(chartData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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

  const StatCard = ({ title, value, icon: Icon, trend, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trend > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend > 0 ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your business performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(stats.todaySales)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Total Stock"
          value={stats.totalStock.toLocaleString()}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Today's Profit"
          value={formatCurrency(stats.profit)}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Transactions"
          value={stats.totalTransactions}
          icon={ShoppingCart}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line 
                type="monotone" 
                dataKey="sales" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Average Sale</span>
              <span className="font-semibold">
                {stats.totalTransactions > 0 
                  ? formatCurrency(stats.todaySales / stats.totalTransactions)
                  : formatCurrency(0)
                }
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Profit Margin</span>
              <span className="font-semibold">
                {stats.todaySales > 0 
                  ? `${((stats.profit / stats.todaySales) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Date</span>
              <span className="font-semibold">
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard