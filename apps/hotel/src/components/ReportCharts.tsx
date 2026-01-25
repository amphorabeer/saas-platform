'use client'

import React from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// Color palette
const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16']

interface ChartDataPoint {
  name: string
  value: number
  [key: string]: any
}

// Revenue Line/Area Chart
export function RevenueChart({ data, type = 'area' }: { data: ChartDataPoint[]; type?: 'line' | 'area' | 'bar' }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      {type === 'bar' ? (
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
          <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" tickFormatter={(v) => `₾${v}`} />
          <Tooltip 
            formatter={(value: number) => [`₾${value.toLocaleString()}`, 'შემოსავალი']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
          />
          <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : type === 'line' ? (
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
          <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" tickFormatter={(v) => `₾${v}`} />
          <Tooltip 
            formatter={(value: number) => [`₾${value.toLocaleString()}`, 'შემოსავალი']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
          />
          <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
        </LineChart>
      ) : (
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
          <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" tickFormatter={(v) => `₾${v}`} />
          <Tooltip 
            formatter={(value: number) => [`₾${value.toLocaleString()}`, 'შემოსავალი']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
          />
          <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} fill="url(#revenueGradient)" />
        </AreaChart>
      )}
    </ResponsiveContainer>
  )
}

// Occupancy Chart
export function OccupancyChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
        <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip 
          formatter={(value: number) => [`${value}%`, 'დაკავებულობა']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
        <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#occupancyGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Combined Revenue & Occupancy Chart
export function CombinedChart({ data }: { data: { name: string; revenue: number; occupancy: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="occupancyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#10B981" tickFormatter={(v) => `₾${v}`} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#3B82F6" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip 
          formatter={(value: number, name: string) => [
            name === 'revenue' ? `₾${value.toLocaleString()}` : `${value}%`,
            name === 'revenue' ? 'შემოსავალი' : 'დაკავებულობა'
          ]}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
        <Legend formatter={(value) => value === 'revenue' ? 'შემოსავალი' : 'დაკავებულობა'} />
        <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fill="url(#revenueGrad)" />
        <Area yAxisId="right" type="monotone" dataKey="occupancy" stroke="#3B82F6" strokeWidth={2} fill="url(#occupancyGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Pie Chart for Sources/Categories
export function SourcePieChart({ data }: { data: ChartDataPoint[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number, name: string) => [`₾${value.toLocaleString()} (${((value/total)*100).toFixed(1)}%)`, name]}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Horizontal Bar Chart for Categories
export function CategoryBarChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" tickFormatter={(v) => `₾${v}`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" width={80} />
        <Tooltip 
          formatter={(value: number) => [`₾${value.toLocaleString()}`, 'თანხა']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
        <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Payment Methods Pie Chart
export function PaymentsPieChart({ data }: { data: ChartDataPoint[] }) {
  const paymentColors: { [key: string]: string } = {
    cash: '#10B981',
    card: '#3B82F6',
    bank: '#8B5CF6',
    online: '#F59E0B',
    company: '#EF4444',
    debit: '#EC4899',
    voucher: '#06B6D4',
    deposit: '#84CC16'
  }
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data.filter(d => d.value > 0)}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
        >
          {data.filter(d => d.value > 0).map((entry, index) => (
            <Cell key={`cell-${index}`} fill={paymentColors[entry.name.toLowerCase()] || COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => [`₾${value.toLocaleString()}`, 'თანხა']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Comparison Bar Chart (This Month vs Last Month)
export function ComparisonChart({ data }: { data: { name: string; current: number; previous: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
        <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" tickFormatter={(v) => `₾${v}`} />
        <Tooltip 
          formatter={(value: number, name: string) => [
            `₾${value.toLocaleString()}`,
            name === 'current' ? 'ამ თვე' : 'წინა თვე'
          ]}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
        <Legend formatter={(value) => value === 'current' ? 'ამ თვე' : 'წინა თვე'} />
        <Bar dataKey="previous" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
        <Bar dataKey="current" fill="#10B981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Mini Sparkline for Dashboard
export function SparklineChart({ data, color = '#10B981' }: { data: number[]; color?: string }) {
  const chartData = data.map((value, index) => ({ value, index }))
  
  return (
    <ResponsiveContainer width="100%" height={50}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id={`sparkGradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={2} 
          fill={`url(#sparkGradient-${color.replace('#', '')})`} 
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// KPI Card with Trend
interface KPICardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon: string
  sparklineData?: number[]
  color?: 'green' | 'blue' | 'purple' | 'orange' | 'red'
}

export function KPICard({ title, value, change, trend, icon, sparklineData, color = 'blue' }: KPICardProps) {
  const colorClasses = {
    green: 'from-green-50 to-green-100 text-green-600',
    blue: 'from-blue-50 to-blue-100 text-blue-600',
    purple: 'from-purple-50 to-purple-100 text-purple-600',
    orange: 'from-orange-50 to-orange-100 text-orange-600',
    red: 'from-red-50 to-red-100 text-red-600'
  }
  
  const sparkColors = {
    green: '#10B981',
    blue: '#3B82F6',
    purple: '#8B5CF6',
    orange: '#F59E0B',
    red: '#EF4444'
  }
  
  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {change !== undefined && (
          <span className={`text-sm font-medium flex items-center gap-1 ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="text-sm font-medium opacity-80">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-2">
          <SparklineChart data={sparklineData} color={sparkColors[color]} />
        </div>
      )}
    </div>
  )
}