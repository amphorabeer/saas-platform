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

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const planFromUrl = (searchParams.get('plan')?.toUpperCase() || 'STARTER') as PlanType
  const validPlan = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(planFromUrl) ? planFromUrl : 'STARTER'

  const [formData, setFormData] = useState({
    // პირადი ინფორმაცია
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // ლუდსახარშის ინფორმაცია
    breweryName: '',
    company: '',
    taxId: '',
    phone: '',
    address: '',
    city: '',
    country: 'Georgia',
    website: '',
    // საბანკო ინფორმაცია
    bankName: '',
    bankAccount: '',
    bankSwift: '',
    // პაკეტი
    plan: validPlan,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ tenantCode: string; breweryName: string } | null>(null)

  // Update plan when URL changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, plan: validPlan }))
  }, [validPlan])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
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

    const requiredFields = ['name', 'email', 'breweryName', 'company', 'taxId', 'address', 'city', 'phone']
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        setError('შეავსეთ ყველა სავალდებულო ველი')
        setLoading(false)
        return
      }
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'რეგისტრაცია ვერ მოხერხდა')
        setLoading(false)
        return
      }

      setSuccess({
        tenantCode: data.tenant.code,
        breweryName: data.tenant.name,
      })
    } catch (err: any) {
      setError('სისტემური შეცდომა. სცადეთ თავიდან.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-white mb-2">რეგისტრაცია წარმატებულია!</h1>
          <p className="text-slate-400 mt-2">თქვენი ლუდსახარშის სისტემა მზადაა</p>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6 my-6">
            <p className="text-sm text-slate-300 mb-2">ლუდსახარში:</p>
            <p className="text-lg font-semibold text-white">{success.breweryName}</p>
            
            <p className="text-sm text-slate-300 mb-2 mt-4">თქვენი კოდი:</p>
            <div className="bg-slate-900 rounded-lg p-4 text-center">
              <p className="text-4xl font-mono font-bold text-amber-400 tracking-widest">
                {success.tenantCode}
              </p>
            </div>
            
            <p className="text-xs text-amber-300 mt-4">
              ⚠️ შეინახეთ ეს კოდი! ის დაგჭირდებათ შესვლისას
            </p>
          </div>

          <Link
            href="/login"
            className="block w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all text-center"
          >
            შესვლა სისტემაში
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🍺</div>
          <h1 className="text-2xl font-bold text-white">შექმენით თქვენი ლუდსახარშის ანგარიში</h1>
          <p className="text-slate-400 mt-2">წარმოების, ინვენტარისა და გაყიდვების მართვა</p>
        </div>

        {/* არჩეული პაკეტის ჩვენება */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">არჩეული პაკეტი:</p>
              <p className="text-lg font-semibold text-amber-400">{planNames[formData.plan as PlanType]}</p>
            </div>
            <Link 
              href="/modules/brewery/pricing"
              className="text-sm text-amber-400 hover:text-amber-300 underline"
            >
              შეცვლა
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* პირადი ინფორმაცია */}
          <div className="bg-slate-700/50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4">👤 პირადი ინფორმაცია</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">სახელი და გვარი *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  placeholder="გიორგი მეღვინე"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">ელ-ფოსტა *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">პაროლი *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  placeholder="მინიმუმ 6 სიმბოლო"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">გაიმეორეთ პაროლი *</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  placeholder="პაროლის დადასტურება"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* ლუდსახარშის ინფორმაცია */}
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4">🏭 ლუდსახარშის ინფორმაცია</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">ლუდსახარშის სახელი *</label>
                <input
                  type="text"
                  value={formData.breweryName}
                  onChange={(e) => setFormData({...formData, breweryName: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  placeholder="ჩემი ლუდსახარში"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">კომპანიის სახელი *</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  placeholder="შპს ლუდსახარში"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">საიდენტიფიკაციო კოდი *</label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  placeholder="123456789"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">ტელეფონი *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  placeholder="+995 XXX XXX XXX"
                  required
                  disabled={loading}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">მისამართი *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  placeholder="ქუჩა, ნომერი"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">ქალაქი *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  placeholder="თბილისი"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">ქვეყანა</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  disabled={loading}
                >
                  <option value="Georgia">საქართველო</option>
                  <option value="Azerbaijan">აზერბაიჯანი</option>
                  <option value="Armenia">სომხეთი</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">ვებსაიტი</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  placeholder="https://www.brewery.ge"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* საბანკო ინფორმაცია */}
          <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4">🏦 საბანკო ინფორმაცია</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">ბანკის სახელი</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  placeholder="საქართველოს ბანკი"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">საბანკო ანგარიში (IBAN)</label>
                <input
                  type="text"
                  value={formData.bankAccount}
                  onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  placeholder="GE00TB0000000000000000"
                  disabled={loading}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">SWIFT კოდი</label>
                <input
                  type="text"
                  value={formData.bankSwift}
                  onChange={(e) => setFormData({...formData, bankSwift: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  placeholder="TBCBGE22"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50"
          >
            {loading ? 'იტვირთება...' : '🚀 რეგისტრაცია'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          <p>უკვე გაქვთ ანგარიში?</p>
          <Link href="/login" className="text-amber-400 hover:underline font-medium">
            შედით აქ
          </Link>
        </div>
      </div>
    </div>
  )
}