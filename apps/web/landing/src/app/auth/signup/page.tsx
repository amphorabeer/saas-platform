'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const module = searchParams.get('module') || 'hotel'
  const plan = searchParams.get('plan') || 'STARTER'
  
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
  const [success, setSuccess] = useState<{ hotelCode: string } | null>(null)
  
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
    
    try {
      const response = await fetch('/api/auth/register', {
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">რეგისტრაცია წარმატებულია!</h1>
          <p className="text-gray-600 mb-6">თქვენი სასტუმროს სისტემა მზადაა</p>
          
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-sm text-blue-600 mb-2">თქვენი სასტუმროს კოდი:</p>
            <div className="text-5xl font-mono font-bold text-blue-700 tracking-widest">
              {success.hotelCode}
            </div>
            <p className="text-xs text-blue-500 mt-2">შეინახეთ ეს კოდი</p>
          </div>
          
          <a
            href="http://localhost:3010/login"
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
          <h1 className="text-2xl font-bold text-gray-800">რეგისტრაცია</h1>
          <p className="text-gray-500 mt-1">შექმენით თქვენი სასტუმროს ანგარიში</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">პირადი ინფორმაცია</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">სახელი და გვარი *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="სახელი გვარი" required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ელ-ფოსტა *</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="your@email.com" required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">პაროლი *</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="მინიმუმ 6 სიმბოლო" required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">გაიმეორეთ პაროლი *</label>
                <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="პაროლის დადასტურება" required disabled={loading} />
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">სასტუმროს ინფორმაცია</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">სასტუმროს სახელი *</label>
                <input type="text" value={formData.hotelName} onChange={(e) => setFormData({...formData, hotelName: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="Hotel Tbilisi" required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">კომპანიის სახელი *</label>
                <input type="text" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="შპს სასტუმრო" required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">საიდენტიფიკაციო კოდი *</label>
                <input type="text" value={formData.taxId} onChange={(e) => setFormData({...formData, taxId: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="123456789" required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ტელეფონი *</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="+995 XXX XXX XXX" required disabled={loading} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">მისამართი *</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="ქუჩა, ნომერი" required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ქალაქი *</label>
                <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="თბილისი" required disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ქვეყანა</label>
                <select value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full px-4 py-2 border rounded-lg" disabled={loading}>
                  <option value="Georgia">საქართველო</option>
                  <option value="Azerbaijan">აზერბაიჯანი</option>
                  <option value="Armenia">სომხეთი</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ვებსაიტი</label>
                <input type="url" value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="https://www.hotel.ge" disabled={loading} />
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">საბანკო ინფორმაცია</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ბანკის სახელი</label>
                <input type="text" value={formData.bankName} onChange={(e) => setFormData({...formData, bankName: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="საქართველოს ბანკი" disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">საბანკო ანგარიში</label>
                <input type="text" value={formData.bankAccount} onChange={(e) => setFormData({...formData, bankAccount: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="GE00TB0000000000000000" disabled={loading} />
              </div>
            </div>
          </div>
          
          {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{error}</div>}
          
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium">
            {loading ? 'იტვირთება...' : 'რეგისტრაცია'}
          </button>
        </form>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          უკვე გაქვთ ანგარიში? <a href="http://localhost:3010/login" className="text-blue-600 hover:underline">შესვლა</a>
        </div>
      </div>
    </div>
  )
}
