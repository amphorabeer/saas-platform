'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Alert {
  level: string
  message: string
}

export function BrewMasterAIButton() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [pendingAction, setPendingAction] = useState<{
    type: string
    data: Record<string, unknown>
    summary: string
  } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load alerts on open
  useEffect(() => {
    if (open && alerts.length === 0) {
      fetch('/api/haccp/alerts')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.alerts) setAlerts(data.alerts)
          // Auto-greet with context
          if (messages.length === 0) {
            const criticalCount = data?.counts?.critical || 0
            const warningCount = data?.counts?.warning || 0
            let greeting = 'გამარჯობა! მე ვარ BrewMaster AI — თქვენი სასმელის წარმოების ასისტენტი. '
            if (criticalCount > 0) {
              greeting += `⚠️ დღეს გაქვთ ${criticalCount} კრიტიკული გაფრთხილება. როგორ დაგეხმაროთ?`
            } else if (warningCount > 0) {
              greeting += `ℹ️ დღეს გაქვთ ${warningCount} გაფრთხილება. როგორ დაგეხმაროთ?`
            } else {
              greeting += 'ყველაფერი წესრიგშია! რით შემიძლია დაგეხმაროთ?'
            }
            setMessages([{ role: 'assistant', content: greeting }])
          }
        })
        .catch(() => {})
    }
  }, [open])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user' as const, content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          alerts,
        }),
      })

      const data = await response.json()

      if (data.pendingAction) {
        setPendingAction(data.pendingAction)
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: `შევავსო ახლა? 👇\n📋 ${data.pendingAction.summary}`,
          },
        ])
      } else {
        const assistantMsg = data.text || data.error || 'პასუხი ვერ მივიღე'
        setMessages([...newMessages, { role: 'assistant', content: assistantMsg }])
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'შეცდომა მოხდა. გთხოვთ სცადოთ თავიდან.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Quick action buttons
  const quickActions = [
    { label: '📋 HACCP სტატუსი', msg: 'რა HACCP გაფრთხილებები მაქვს დღეს?' },
    { label: '🌡️ ტემპ. ნორმები', msg: 'რა ტემპერატურის ნორმები უნდა დავიცვა?' },
    { label: '🧹 სანიტაცია', msg: 'სანიტაციის შევსება როგორ ხდება?' },
    { label: '🍺 წარმოება', msg: 'ახლა რა პარტიები მიდის?' },
  ]

  const autoFillAll = async () => {
    setLoading(true)
    const results: string[] = []
    const now = new Date().toISOString()
    const today = new Date()
    const weekNum = ['I', 'II', 'III', 'IV'][Math.floor((today.getDate() - 1) / 7)] || 'I'

    const post = async (type: string, data: Record<string, unknown>, label: string) => {
      try {
        const res = await fetch('/api/haccp/journals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, data: { ...data, source: 'auto-ai' }, recordedAt: now }),
        })
        results.push(res.ok ? `✅ ${label}` : `⚠️ ${label}: შეცდომა`)
      } catch {
        results.push(`❌ ${label}: ვერ შეივსო`)
      }
    }

    const postSop = async (sopType: string, label: string) => {
      try {
        const res = await fetch('/api/haccp/sop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sopType, notes: 'AI ავტო შევსება' }),
        })
        results.push(res.ok ? `✅ ${label}` : `⚠️ ${label}: შეცდომა`)
      } catch {
        results.push(`❌ ${label}: ვერ შეივსო`)
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant' as const,
        content: '🤖 ავტო რეჟიმი ჩართულია! ვავსებ ყველა ფორმას...',
      },
    ])

    // 1. SOP — ყველა 7
    await postSop('CLEANING', 'SOP-01 რეცხვა-დეზინფ.')
    await postSop('CALIBRATION', 'SOP-02 დაკალიბრება')
    await postSop('PERSONNEL_HYGIENE', 'SOP-03 პერს. ჰიგიენა')
    await postSop('HAND_WASHING', 'SOP-04 ხელის დაბანა')
    await postSop('WASTE', 'SOP-05 ნარჩენები')
    await postSop('PEST', 'SOP-06 მავნებლები')
    await postSop('CHEMICALS', 'SOP-07 ქიმიური საშ.')

    // 2. სანიტაცია — ყველა ზონა
    const sanitationZones = [
      'თაროები',
      'სავენტილაციო არხები',
      'ნათურები',
      'იატაკი',
      'ჭერი',
      'კედლები',
      'ფანჯრები',
      'ნარჩენები',
      'სატვირთო ინვენტარი',
      'დეზინფექცია',
    ]
    for (const area of sanitationZones) {
      await post('SANITATION', { area }, `სანიტაცია: ${area}`)
    }

    // 3. ტემპერატურა — ყველა ზონა
    const tempZones = [
      { area: 'სამლუდეო სახელოსნო', temperature: 20, humidity: 50 },
      { area: 'საფერმენტაციო ოთახი', temperature: 20, humidity: 55 },
      { area: 'კონდიციონირების ოთახი', temperature: 2, humidity: 60 },
      { area: 'საწყობი (მშრალი)', temperature: 15, humidity: 45 },
      { area: 'საწყობი (გამაცივებელი)', temperature: 4, humidity: 60 },
      { area: 'შეფუთვის ზონა', temperature: 18, humidity: 50 },
      { area: 'ლაბორატორია', temperature: 20, humidity: 50 },
    ]
    for (const z of tempZones) {
      await post('TEMPERATURE', z, `ტემპ: ${z.area} ${z.temperature}°C`)
    }

    // 4. საწყობის კონტროლი — ყველა ზონა
    const storageZones = [
      { storage: 'მშრალი საწყობი №1', temperature: 15, humidity: 45 },
      { storage: 'მშრალი საწყობი №2', temperature: 15, humidity: 45 },
      { storage: 'გამაცივებელი საწყობი', temperature: 4, humidity: 60 },
      { storage: 'ნედლეულის საწყობი', temperature: 15, humidity: 50 },
      { storage: 'მზა პროდუქტის საწყობი', temperature: 4, humidity: 55 },
      { storage: 'ქიმიკატების სათავსო', temperature: 18, humidity: 40 },
    ]
    for (const z of storageZones) {
      await post('STORAGE_CONTROL', z, `საწყობი: ${z.storage}`)
    }

    // 5. პერსონალის ჯანმრთელობა
    await post(
      'HEALTH_CHECK',
      {
        name: 'პერსონალი',
        status: 'ჯანმრთელი',
      },
      'პერს. ჯანმრთელობა'
    )

    // 6. ნარჩენები (ხარშვის შემდეგ)
    const wastes = [
      { wasteType: 'ორგანული ნარჩენი (ლუდის ნარჩ.)', managementMethod: 'კომპოსტირება' },
      { wasteType: 'შეფუთვის მასალა (მუყაო, პლასტმასი)', managementMethod: 'გადამუშავება' },
      { wasteType: 'სველი მარცვალი (დრაბი)', managementMethod: 'კომპოსტირება' },
    ]
    for (const w of wastes) {
      await post('WASTE_MANAGEMENT', w, `ნარჩენი: ${w.wasteType.substring(0, 20)}...`)
    }

    // 7. მავნებლების კონტროლი
    await post(
      'PEST_CONTROL',
      {
        procedure: 'ხაფანგების შემოწმება',
        pest: 'მღრღნელები',
        area: 'ყველა ზონა',
        result: 'გამოვლენა არ მომხდარა',
      },
      'მავნებლების კონტ.'
    )

    // 8. სათაგურების შემოწმება
    const traps = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, true]))
    await post(
      'RODENT_TRAP',
      {
        week: weekNum,
        traps,
        checkedCount: 10,
      },
      `სათაგურები ${weekNum} კვირა`
    )

    // 9. ჟურნალების გადამოწმება
    await post(
      'JOURNAL_VERIFICATION',
      {
        leader: 'HACCP ლიდერი',
        notes: 'ყველა ჟურნალი შემოწმდა — AI ავტო შევსება',
      },
      'ჟ. გადამოწმება'
    )

    // 10. HACCP აუდიტი
    await post(
      'AUDIT',
      {
        auditor: 'HACCP ლიდერი',
        items: { 0: 'yes', 1: 'yes', 2: 'yes', 3: 'yes', 4: 'yes', 5: 'yes' },
        notes: 'ყოველწლიური შიდა აუდიტი — AI',
      },
      'HACCP აუდიტი'
    )

    // 11. ტრენინგი — ყველა თემა
    const trainings = [
      'HACCP სისტემა — ზოგადი',
      'პირადი ჰიგიენა',
      'რეცხვა-დეზინფექცია',
      'მავნებლების კონტროლი',
      'ნარჩენების მართვა',
      'ქიმიური საშუ. უსაფრთხოება',
      'სახანძრო უსაფრთხოება',
    ]
    for (const topic of trainings) {
      await post(
        'TRAINING',
        {
          trainee: 'პერსონალი',
          topic,
          trainer: 'HACCP ლიდერი',
        },
        `ტრენინგი: ${topic.substring(0, 20)}`
      )
    }

    const successCount = results.filter((r) => r.startsWith('✅')).length
    const total = results.length

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant' as const,
        content: `🎉 ავტო შევსება დასრულდა!\n\n${results.join('\n')}\n\n📊 შედეგი: ${successCount}/${total} წარმატებით შეივსო`,
      },
    ])

    setLoading(false)
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 
                   px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 
                   text-white rounded-2xl shadow-lg shadow-amber-500/30
                   hover:shadow-amber-500/50 hover:scale-105 
                   transition-all duration-200 print:hidden"
      >
        <span className="text-xl">🤖</span>
        <span className="text-sm font-semibold">BrewMaster AI</span>
        {alerts.filter((a) => a.level === 'critical').length > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 
                           rounded-full text-xs flex items-center justify-center"
          >
            {alerts.filter((a) => a.level === 'critical').length}
          </span>
        )}
      </button>

      {/* Chat modal */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center 
                     justify-end p-4 print:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-bg-secondary border border-border rounded-2xl w-full 
                       max-w-md shadow-2xl overflow-hidden flex flex-col"
            style={{ height: '600px', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b border-border
                           bg-gradient-to-r from-amber-500/10 to-orange-500/10 shrink-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <h2 className="font-bold text-text-primary">BrewMaster AI</h2>
                  <p className="text-xs text-text-muted">
                    {alerts.filter((a) => a.level === 'critical').length > 0
                      ? `⚠️ ${alerts.filter((a) => a.level === 'critical').length} კრიტიკული`
                      : '● ონლაინ'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-text-muted hover:text-text-primary text-xl"
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-amber-500 text-white rounded-br-sm'
                        : 'bg-bg-tertiary text-text-primary rounded-bl-sm border border-border'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-bg-tertiary border border-border px-3 py-2 rounded-xl rounded-bl-sm">
                    <span className="text-text-muted text-sm">
                      <span className="animate-pulse">●●●</span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick actions */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {quickActions.map((qa, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setInput(qa.msg)
                    }}
                    className="text-xs px-2.5 py-1.5 bg-bg-tertiary border border-border 
                               text-text-muted hover:text-text-primary rounded-xl transition-colors"
                  >
                    {qa.label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void autoFillAll()}
                  className="text-xs px-2.5 py-1.5 bg-amber-500/15 border border-amber-500/40 text-amber-200 hover:bg-amber-500/25 rounded-xl transition-colors disabled:opacity-50"
                >
                  🤖 ავტო შევსება
                </button>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border shrink-0">
              {pendingAction && (
                <div className="px-0 pb-2 shrink-0">
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    <p className="text-xs text-amber-400 font-medium mb-2">📋 {pendingAction.summary}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex-1 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium"
                        onClick={async () => {
                          const action = pendingAction
                          setPendingAction(null)
                          setLoading(true)
                          try {
                            const res = await fetch('/api/ai/chat', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action }),
                            })
                            const data = await res.json()
                            setMessages((prev) => [
                              ...prev,
                              {
                                role: 'assistant',
                                content: data.text || '✅ შესრულდა!',
                              },
                            ])
                          } finally {
                            setLoading(false)
                          }
                        }}
                      >
                        ✅ კი, შეავსე
                      </button>
                      <button
                        type="button"
                        className="flex-1 py-1.5 bg-bg-tertiary border border-border text-text-muted rounded-lg text-xs"
                        onClick={() => {
                          setPendingAction(null)
                          setMessages((prev) => [
                            ...prev,
                            {
                              role: 'assistant',
                              content: 'გასაგებია, გაუქმებულია.',
                            },
                          ])
                        }}
                      >
                        ❌ გაუქმება
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="შეტყობინება..."
                  className="flex-1 px-3 py-2 bg-bg-card border border-border rounded-xl 
                             text-sm text-text-primary placeholder:text-text-muted outline-none
                             focus:border-amber-500/50"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium
                             hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
