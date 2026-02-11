'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { CompanyService, TourCompany } from '../services/CompanyService'
import { InvoiceService, Invoice } from '../services/InvoiceService'

export default function TourCompaniesSettings({ showOnlyCompanies = false }: { showOnlyCompanies?: boolean }) {
  const [companies, setCompanies] = useState<TourCompany[]>([])
  const [activeTab, setActiveTab] = useState<'companies' | 'receivables' | 'invoices'>('companies')
  
  // Company modal
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Partial<TourCompany> | null>(null)
  
  // Receivables
  const [receivables, setReceivables] = useState<any[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentData, setPaymentData] = useState<{
    receivableId: string
    companyName: string
    amount: number
    maxAmount: number
    method: string
  } | null>(null)
  
  // Load data
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    // Fetch from API
    const companiesData = await CompanyService.fetchAll()
    setCompanies(companiesData)
    
    const receivablesData = await CompanyService.fetchReceivables()
    setReceivables(receivablesData)
    
    const invoicesData = await InvoiceService.fetchAll()
    setInvoices(invoicesData)
  }
  
  // Save company
  const saveCompany = () => {
    if (!editingCompany?.name) {
      alert('შეიყვანეთ კომპანიის სახელი')
      return
    }
    
    if (editingCompany.id) {
      CompanyService.update(editingCompany.id, editingCompany)
    } else {
      CompanyService.create(editingCompany as any)
    }
    
    loadData()
    setShowCompanyModal(false)
    setEditingCompany(null)
  }
  
  // Delete company
  const deleteCompany = (id: string) => {
    if (!confirm('წაშალოთ კომპანია?')) return
    CompanyService.delete(id)
    loadData()
  }
  
  // Record payment
  const recordPayment = () => {
    if (!paymentData) return
    
    const success = CompanyService.recordPayment(
      paymentData.receivableId,
      paymentData.amount,
      paymentData.method
    )
    
    if (success) {
      loadData()
      setShowPaymentModal(false)
      setPaymentData(null)
    } else {
      alert('გადახდის ჩაწერა ვერ მოხერხდა')
    }
  }
  
  // Statistics
  const totalOutstanding = CompanyService.getTotalOutstanding()
  const totalOverdue = CompanyService.getTotalOverdue()
  const invoiceStats = InvoiceService.getStatistics()
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        {/* Header - simplified for settings */}
        {!showOnlyCompanies && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏢</span>
            <div>
              <h2 className="text-xl font-bold">ტურისტული კომპანიები</h2>
              <p className="text-sm text-gray-500">კომპანიები, კრედიტი, ინვოისები</p>
            </div>
          </div>
        </div>
        )}

        {/* Stats - hide for settings */}
        {!showOnlyCompanies && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-600">{companies.filter(c => c.isActive).length}</div>
            <div className="text-sm text-gray-600">აქტიური კომპანია</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-amber-600">₾{(totalOutstanding || 0).toFixed(0)}</div>
            <div className="text-sm text-gray-600">მოსაღები თანხა</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-red-600">₾{(totalOverdue || 0).toFixed(0)}</div>
            <div className="text-sm text-gray-600">ვადაგადაცილებული</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-600">{invoiceStats.paid}</div>
            <div className="text-sm text-gray-600">გადახდილი ინვოისი</div>
          </div>
        </div>
        )}

        {/* Tabs - hide when showOnlyCompanies */}
        {!showOnlyCompanies && (
        <div className="flex gap-2 border-b pb-4 mb-6">
          {[
            { id: 'companies', label: '🏢 კომპანიები', count: companies.length },
            { id: 'receivables', label: '💰 დებიტორები', count: receivables.filter(r => r.status !== 'paid').length },
            { id: 'invoices', label: '📄 ინვოისები', count: invoices.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white text-blue-500' : 'bg-gray-200'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div>
            <div className="flex justify-between mb-4">
              <h3 className="font-medium">რეგისტრირებული კომპანიები</h3>
              <button
                onClick={() => {
                  setEditingCompany({
                    name: '',
                    contactPerson: '',
                    email: '',
                    phone: '',
                    taxId: '',
                    legalAddress: '',
                    creditLimit: 0,
                    paymentTerms: 30
                  })
                  setShowCompanyModal(true)
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg"
              >
                + კომპანიის დამატება
              </button>
            </div>
            
            {companies.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">🏢</div>
                <p>კომპანიები არ არის რეგისტრირებული</p>
              </div>
            ) : (
              <div className="space-y-3">
                {companies.filter(c => c.isActive !== false).map(company => {
                  const stats = CompanyService.getStatistics(company.id)
                  return (
                    <div key={company.id} className="p-4 bg-gray-50 rounded-xl border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{company.name}</span>
                            {company.nameEn && <span className="text-sm text-gray-500">({company.nameEn})</span>}
                          </div>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-sm">
                            <div><span className="text-gray-500">საკონტაქტო:</span> {company.contactPerson}</div>
                            <div><span className="text-gray-500">ტელ:</span> {company.phone}</div>
                            <div><span className="text-gray-500">ელ-ფოსტა:</span> {company.email}</div>
                            <div><span className="text-gray-500">ს/კ:</span> {company.taxId}</div>
                          </div>
                          <div className="flex gap-4 mt-3 pt-3 border-t text-sm">
                            <div>
                              <span className="text-gray-500">კრედიტის ლიმიტი:</span>{' '}
                              <span className="font-medium">{company.creditLimit ? `₾${company.creditLimit}` : 'შეუზღუდავი'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">გადახდის ვადა:</span>{' '}
                              <span className="font-medium">{company.paymentTerms} დღე</span>
                            </div>
                            <div>
                              <span className="text-gray-500">ბალანსი:</span>{' '}
                              <span className={`font-bold ${stats.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ₾{(stats?.outstandingBalance || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingCompany(company); setShowCompanyModal(true) }}
                            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteCompany(company.id)}
                            className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Receivables Tab */}
        {activeTab === 'receivables' && (
          <div>
            <h3 className="font-medium mb-4">დებიტორული დავალიანება</h3>
            
            {receivables.filter(r => r.status !== 'paid').length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <p>ყველა თანხა გადახდილია</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receivables.filter(r => r.status !== 'paid').map(ar => {
                  const isOverdue = moment(ar.dueDate).isBefore(moment(), 'day')
                  const remaining = ar.amount - (ar.paidAmount || 0)
                  
                  return (
                    <div 
                      key={ar.transactionId} 
                      className={`p-4 rounded-xl border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold">{ar.companyName}</div>
                          <div className="text-sm text-gray-500">
                            თარიღი: {moment(ar.createdAt).format('DD/MM/YYYY')} | 
                            ვადა: {moment(ar.dueDate).format('DD/MM/YYYY')}
                            {isOverdue && <span className="text-red-600 ml-2">⚠️ ვადაგადაცილებული</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600">₾{(remaining || 0).toFixed(2)}</div>
                          {ar.paidAmount > 0 && (
                            <div className="text-xs text-gray-500">
                              სულ: ₾{ar.amount} | გადახდილი: ₾{ar.paidAmount}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setPaymentData({
                              receivableId: ar.transactionId,
                              companyName: ar.companyName,
                              amount: remaining,
                              maxAmount: remaining,
                              method: 'bank'
                            })
                            setShowPaymentModal(true)
                          }}
                          className="ml-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          💳 გადახდა
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div>
            <h3 className="font-medium mb-4">ინვოისები</h3>
            
            {invoices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">📄</div>
                <p>ინვოისები არ არის</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">ნომერი</th>
                      <th className="px-4 py-2 text-left">კომპანია</th>
                      <th className="px-4 py-2 text-left">თარიღი</th>
                      <th className="px-4 py-2 text-left">ვადა</th>
                      <th className="px-4 py-2 text-right">თანხა</th>
                      <th className="px-4 py-2 text-center">სტატუსი</th>
                      <th className="px-4 py-2 text-center">მოქმედება</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono">{inv.number}</td>
                        <td className="px-4 py-3">{inv.companyName}</td>
                        <td className="px-4 py-3">{moment(inv.issueDate).format('DD/MM/YY')}</td>
                        <td className="px-4 py-3">{moment(inv.dueDate).format('DD/MM/YY')}</td>
                        <td className="px-4 py-3 text-right font-bold">₾{(Number(inv.total) || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                            inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                            inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {inv.status === 'paid' ? 'გადახდილი' :
                             inv.status === 'overdue' ? 'ვადაგადაცილ.' :
                             inv.status === 'sent' ? 'გაგზავნილი' :
                             inv.status === 'cancelled' ? 'გაუქმებული' : 'მომლოდინე'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => InvoiceService.printInvoice(inv.id)}
                              className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                              title="ბეჭდვა"
                            >
                              🖨️
                            </button>
                            <button
                              onClick={() => InvoiceService.downloadInvoice(inv.id)}
                              className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                              title="ჩამოტვირთვა"
                            >
                              📥
                            </button>
                            {inv.companyEmail && inv.status !== 'paid' && (
                              <button
                                onClick={() => InvoiceService.sendEmail(inv.id)}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                                title="ელ-ფოსტით გაგზავნა"
                              >
                                📧
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Company Modal */}
      {showCompanyModal && editingCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              {editingCompany.id ? '✏️ კომპანიის რედაქტირება' : '➕ ახალი კომპანია'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">სახელი *</label>
                  <input
                    type="text"
                    value={editingCompany.name || ''}
                    onChange={e => setEditingCompany({ ...editingCompany, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="კომპანიის სახელი"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">სახელი (Eng)</label>
                  <input
                    type="text"
                    value={editingCompany.nameEn || ''}
                    onChange={e => setEditingCompany({ ...editingCompany, nameEn: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Company Name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">საკონტაქტო პირი</label>
                  <input
                    type="text"
                    value={editingCompany.contactPerson || ''}
                    onChange={e => setEditingCompany({ ...editingCompany, contactPerson: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ტელეფონი</label>
                  <input
                    type="text"
                    value={editingCompany.phone || ''}
                    onChange={e => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">ელ-ფოსტა</label>
                <input
                  type="email"
                  value={editingCompany.email || ''}
                  onChange={e => setEditingCompany({ ...editingCompany, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">საიდენტიფიკაციო კოდი</label>
                  <input
                    type="text"
                    value={editingCompany.taxId || ''}
                    onChange={e => setEditingCompany({ ...editingCompany, taxId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">გადახდის ვადა (დღე)</label>
                  <input
                    type="number"
                    value={editingCompany.paymentTerms || 30}
                    onChange={e => setEditingCompany({ ...editingCompany, paymentTerms: Number(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">იურიდიული მისამართი</label>
                <input
                  type="text"
                  value={editingCompany.legalAddress || ''}
                  onChange={e => setEditingCompany({ ...editingCompany, legalAddress: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">საკრედიტო ლიმიტი (₾)</label>
                <input
                  type="number"
                  value={editingCompany.creditLimit || 0}
                  onChange={e => setEditingCompany({ ...editingCompany, creditLimit: Number(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="0 = შეუზღუდავი"
                />
                <p className="text-xs text-gray-500 mt-1">0 = შეუზღუდავი კრედიტი</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCompanyModal(false); setEditingCompany(null) }}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg"
              >
                გაუქმება
              </button>
              <button
                onClick={saveCompany}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg"
              >
                შენახვა
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">💳 გადახდის ჩაწერა</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="font-medium">{paymentData.companyName}</div>
              <div className="text-2xl font-bold text-red-600">₾{(paymentData?.maxAmount || 0).toFixed(2)}</div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">გადახდის თანხა</label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={e => setPaymentData({ 
                    ...paymentData, 
                    amount: Math.min(Number(e.target.value), paymentData.maxAmount) 
                  })}
                  max={paymentData.maxAmount}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">გადახდის მეთოდი</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bank', label: '🏦 ბანკი' },
                    { id: 'cash', label: '💵 ნაღდი' },
                    { id: 'card', label: '💳 ბარათი' }
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentData({ ...paymentData, method: method.id })}
                      className={`p-3 rounded-lg border-2 ${
                        paymentData.method === method.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentData(null) }}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg"
              >
                გაუქმება
              </button>
              <button
                onClick={recordPayment}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg"
              >
                ✅ ჩაწერა
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}