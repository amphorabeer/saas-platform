'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type PlanType = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

const planNames: Record<PlanType, string> = {
  STARTER: 'Starter (საცდელი)',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
}

const moduleConfig: Record<string, { icon: string; title: string; subtitle: string; bizLabel: string; bizPlaceholder: string; bizSectionTitle: string; successTitle: string; successSubtitle: string; loginUrl: string }> = {
  hotel: {
    icon: '🏨',
    title: 'რეგისტრაცია',
    subtitle: 'შექმენით თქვენი სასტუმროს ანგარიში',
    bizLabel: 'სასტუმროს სახელი *',
    bizPlaceholder: 'Hotel Tbilisi',
    bizSectionTitle: 'სასტუმროს ინფორმაცია',
    successTitle: 'რეგისტრაცია წარმატებულია!',
    successSubtitle: 'თქვენი სასტუმროს სისტემა მზადაა',
    loginUrl: process.env.NEXT_PUBLIC_HOTEL_URL || 'https://saas-hotel.vercel.app',
  },
  shop: {
    icon: '🛍️',
    title: 'რეგისტრაცია',
    subtitle: 'შექმენით თქვენი მაღაზიის ანგარიში',
    bizLabel: 'მაღაზიის სახელი *',
    bizPlaceholder: 'ჩემი მაღაზია',
    bizSectionTitle: 'მაღაზიის ინფორმაცია',
    successTitle: 'რეგისტრაცია წარმატებულია!',
    successSubtitle: 'თქვენი POS სისტემა მზადაა',
    loginUrl: process.env.NEXT_PUBLIC_STORE_URL || 'https://store.saas-platform.ge',
  },
}

const defaultConfig = moduleConfig.hotel

export default function SignupContent() {
  const searchParams = useSearchParams()
  
  const moduleFromUrl = searchParams?.get('module') || 'hotel'
  const planFromUrl = (searchParams?.get('plan')?.toUpperCase() || 'STARTER') as PlanType
  const validPlan = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(planFromUrl) ? planFromUrl : 'STARTER'
  
  const [module, setModule] = useState(moduleFromUrl)
  const [plan, setPlan] = useState(validPlan)
  
  const config = moduleConfig[module] || defaultConfig
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    hotelName: '',
    company: '',
    taxId: '',
    address: '',
    city: '',
    country: 'Georgia',
    phone: '',
    website: '',
    bankName: '',
    bankAccount: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ hotelCode?: string } | null>(null)
  
  useEffect(() => {
    setModule(moduleFromUrl)
    setPlan(validPlan)
  }, [moduleFromUrl, validPlan])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    if (formData.password !== formData.confirmPassword) {
      setError('პაროლები არ ემთხვევა')
      setLoading(false)
      return
    }
    
    if (formData.password.length < 6) {
      setError('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო')
      setLoading(false)
      return
    }
    
    const requiredFields = ['name', 'email', 'hotelName', 'company', 'taxId', 'address', 'city', 'phone']
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        setError('შეავსეთ ყველა სავალდებულო ველი')
        setLoading(false)
        return
      }
    }
    
    const apiUrl = module === 'shop' ? '/api/store/register' : '/api/register'
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          organizationName: formData.hotelName,
          module,
          plan,
          company: formData.company,
          taxId: formData.taxId,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          phone: formData.phone,
          website: formData.website,
          bankName: formData.bankName,
          bankAccount: formData.bankAccount,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'რეგისტრაციის შეცდომა')
        setLoading(false)
        return
      }
      
      setSuccess({ hotelCode: data.hotelCode })
      
    } catch (err) {
      setError('სისტემური შეცდომა. სცადეთ თავიდან.')
      setLoading(false)
    }
  }
  
  if (success) {
    const isShop = module === 'shop'
    const loginBase = isShop ? config.loginUrl : (process.env.NEXT_PUBLIC_HOTEL_URL || 'https://saas-hotel.vercel.app')
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{config.successTitle}</h1>
          <p className="text-gray-600 mb-6">{config.successSubtitle}</p>
          
          {success.hotelCode && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
              <p className="text-sm text-blue-600 mb-2">თქვენი კოდი:</p>
              <div className="text-5xl font-mono font-bold text-blue-700 tracking-widest">
                {success.hotelCode}
              </div>
              <p className="text-xs text-blue-500 mt-2">შეინახეთ ეს კოდი</p>
            </div>
          )}
          
          <a
            href={`${loginBase}/login`}
            className="block w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            შესვლა სისტემაში
          </a>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">{config.icon}</div>
          <h1 className="text-2xl font-bold text-gray-800">{config.title}</h1>
          <p className="text-gray-500 mt-1">{config.subtitle}</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">არჩეული პაკეტი:</p>
              <p className="text-lg font-semibold text-blue-600">{planNames[plan as PlanType]}</p>
            </div>
            <Link 
              href={`/modules/${module}/pricing`}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              შეცვლა
            </Link>
          </div>
        </div>
        
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">👤 პირადი ინფორმაცია</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">სახელი და გვარი *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="სახელი გვარი" required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ელ-ფოსტა *</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="your@email.com" required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">პაროლი *</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="მინიმუმ 6 სიმბოლო" required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">გაიმეორეთ პაროლი *</label>
                <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="პაროლის დადასტურება" required disabled={loading} />
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">{config.icon} {config.bizSectionTitle}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{config.bizLabel}</label>
                <input type="text" value={formData.hotelName} onChange={(e) => setFormData({...formData, hotelName: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder={config.bizPlaceholder} required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">კომპანიის სახელი *</label>
                <input type="text" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder={module === 'shop' ? 'შპს ჩემი მაღაზია' : 'შპს სასტუმრო'} required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">საიდენტიფიკაციო კოდი *</label>
                <input type="text" value={formData.taxId} onChange={(e) => setFormData({...formData, taxId: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="123456789" required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ტელეფონი *</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="+995 XXX XXX XXX" required disabled={loading} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">მისამართი *</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="ქუჩა, ნომერი" required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ქალაქი *</label>
                <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="თბილისი" required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ქვეყანა</label>
                <select value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" disabled={loading}>
                  <option value="Georgia">საქართველო</option>
                  <option value="Azerbaijan">აზერბაიჯანი</option>
                  <option value="Armenia">სომხეთი</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ვებსაიტი</label>
                <input type="url" value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="https://" disabled={loading} />
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">🏦 საბანკო ინფორმაცია</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ბანკის სახელი</label>
                <input type="text" value={formData.bankName} onChange={(e) => setFormData({...formData, bankName: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="საქართველოს ბანკი" disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">საბანკო ანგარიში</label>
                <input type="text" value={formData.bankAccount} onChange={(e) => setFormData({...formData, bankAccount: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="GE00TB0000000000000000" disabled={loading} />
              </div>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium">
            {loading ? 'იტვირთება...' : 'რეგისტრაცია'}
          </button>
        </form>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          უკვე გაქვთ ანგარიში? <a href={`${config.loginUrl}/login`} className="text-blue-600 hover:underline">შესვლა</a>
        </div>
      </div>
    </div>
  )
}
