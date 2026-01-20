'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'

interface Section {
  id: string
  title: string
  icon: string
  link?: string
  content: React.ReactNode
}

function AccordionSection({ section, isOpen, onToggle, onNavigate }: { 
  section: Section
  isOpen: boolean
  onToggle: () => void
  onNavigate: (link: string) => void
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-bg-card hover:bg-bg-tertiary transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{section.icon}</span>
          <span className="font-semibold text-text-primary">{section.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {section.link && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onNavigate(section.link!)
              }}
              className="p-1 hover:bg-copper/20 rounded text-copper"
              title="გადასვლა"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          {isOpen ? <ChevronDown className="w-5 h-5 text-text-muted" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
        </div>
      </button>
      {isOpen && (
        <div className="p-4 bg-bg-secondary border-t border-border">
          {section.content}
          {section.link && (
            <button
              onClick={() => onNavigate(section.link!)}
              className="mt-4 flex items-center gap-2 text-copper hover:underline text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              გადასვლა {section.title} გვერდზე
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const router = useRouter()
  const [openSections, setOpenSections] = useState<string[]>(['quick-start'])

  const toggleSection = (id: string) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const navigateTo = (link: string) => {
    router.push(link)
  }

  const sections: Section[] = [
    {
      id: 'quick-start',
      title: 'სწრაფი დაწყება',
      icon: '🚀',
      content: (
        <div className="space-y-4 text-text-primary">
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>დაამატეთ აღჭურვილობა</strong> - ავზი, ლუდსახარში ქვაბი (⚙️ აღჭურვილობა)</li>
            <li><strong>შეიყვანეთ მარაგები</strong> - ალაო, სვია, საფუარი (📦 მარაგები)</li>
            <li><strong>შექმენით რეცეპტი</strong> - თქვენი ლუდის ფორმულა (📝 რეცეპტები)</li>
            <li><strong>დაიწყეთ პარტია</strong> - წარმოების პროცესი (🍺 წარმოება)</li>
          </ol>
        </div>
      )
    },
    {
      id: 'equipment',
      title: 'აღჭურვილობა',
      icon: '⚙️',
      link: '/equipment',
      content: (
        <div className="space-y-4 text-text-primary text-sm">
          <h4 className="font-semibold text-base">ახალი აღჭურვილობის დამატება:</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>გადადით "⚙️ აღჭურვილობა" მენიუში</li>
            <li>დააჭირეთ "ახალი აღჭურვილობა"</li>
            <li>შეავსეთ: სახელი, ტიპი, მოცულობა, მდგომარეობა, ლოკაცია</li>
            <li>დააჭირეთ "შენახვა"</li>
          </ol>
          
          <h4 className="font-semibold text-base mt-6">აღჭურვილობის ტიპები:</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>ფერმენტაციის ავზი</li>
            <li>სახარში ქვაბი</li>
            <li>შესანახი ავზი</li>
            <li>ფილტრი</li>
            <li>გამაცივებელი</li>
          </ul>
          
          <h4 className="font-semibold text-base mt-6">CIP (რეცხვა):</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>აირჩიეთ აღჭურვილობა</li>
            <li>დააჭირეთ "CIP" ღილაკს</li>
            <li>შეიყვანეთ რეცხვის დეტალები</li>
            <li>ჩააწერეთ რეცხვის ლოგი</li>
          </ol>
        </div>
      )
    },
    {
      id: 'inventory',
      title: 'მარაგები',
      icon: '📦',
      link: '/inventory',
      content: (
        <div className="space-y-4 text-text-primary text-sm">
          <h4 className="font-semibold text-base">ინგრედიენტების კატეგორიები:</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>🌾 ალაო (Malt/Grain)</li>
            <li>🍺 საფუარი (Yeast)</li>
            <li>🌿 სვია (Hops)</li>
            <li>🛢️ კეგები (Kegs)</li>
            <li>📦 შესაფუთი მასალები</li>
            <li>🧹 რეცხვის საშუალებები</li>
          </ul>
          
          <h4 className="font-semibold text-base mt-6">ინგრედიენტის დამატება:</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>გადადით "📦 მარაგები" მენიუში</li>
            <li>დააჭირეთ "ახალი ინგრედიენტი"</li>
            <li>შეავსეთ: SKU, სახელი, კატეგორია, ერთეული</li>
            <li>დააჭირეთ "შენახვა"</li>
          </ol>
          
          <h4 className="font-semibold text-base mt-6">შეძენა:</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>აირჩიეთ ინგრედიენტი</li>
            <li>დააჭირეთ "შეძენა"</li>
            <li>შეიყვანეთ რაოდენობა, ფასი, მომწოდებელი</li>
            <li>დააჭირეთ "დადასტურება"</li>
          </ol>
        </div>
      )
    },
    {
      id: 'recipes',
      title: 'რეცეპტები',
      icon: '📝',
      link: '/recipes',
      content: (
        <div className="space-y-4 text-text-primary text-sm">
          <h4 className="font-semibold text-base">ახალი რეცეპტის შექმნა:</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>გადადით "📝 რეცეპტები" მენიუში</li>
            <li>დააჭირეთ "ახალი რეცეპტი"</li>
            <li>შეავსეთ ძირითადი ინფორმაცია:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>სახელი, სტილი</li>
                <li>ABV, IBU, ფერი</li>
                <li>OG, FG</li>
                <li>პარტიის რაოდენობა, დუღილის დრო</li>
              </ul>
            </li>
            <li>დაამატეთ ინგრედიენტები (ალაო, ჰოპი, საფუარი)</li>
            <li>დააჭირეთ "შენახვა"</li>
          </ol>
          
          <div className="bg-copper/10 border border-copper/30 rounded-lg p-3 mt-4">
            <p className="text-copper text-sm">💡 რეცეპტი გამოიყენება ახალი პარტიის შექმნისას - სისტემა ავტომატურად შეავსებს ინგრედიენტებს.</p>
          </div>
        </div>
      )
    },
    {
      id: 'production',
      title: 'წარმოება',
      icon: '🍺',
      link: '/production',
      content: (
        <div className="space-y-4 text-text-primary text-sm">
          <h4 className="font-semibold text-base">ახალი პარტიის შექმნა:</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>გადადით "🍺 წარმოება" მენიუში</li>
            <li>დააჭირეთ "ახალი პარტია"</li>
            <li>აირჩიეთ რეცეპტი, მოცულობა, თარიღი</li>
            <li>დააჭირეთ "შექმნა"</li>
          </ol>
          
          <h4 className="font-semibold text-base mt-6">წარმოების ციკლი:</h4>
          <div className="flex flex-wrap items-center gap-2 my-4">
            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs">1. ხარშვა</span>
            <span className="text-text-muted">→</span>
            <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs">2. ფერმენტაცია</span>
            <span className="text-text-muted">→</span>
            <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs">3. კონდიცირება</span>
            <span className="text-text-muted">→</span>
            <span className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-xs">4. მზადა</span>
            <span className="text-text-muted">→</span>
            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">5. დაფასოება</span>
          </div>
          
          <div className="space-y-3">
            <div className="bg-bg-tertiary rounded-lg p-3">
              <h5 className="font-medium text-blue-400">1️⃣ ხარშვა</h5>
              <p className="text-text-muted text-xs mt-1">დაიწყეთ ხარშვა → დაამატეთ OG → ჩაწერეთ შენიშვნები → დაასრულეთ</p>
            </div>
            <div className="bg-bg-tertiary rounded-lg p-3">
              <h5 className="font-medium text-orange-400">2️⃣ ფერმენტაცია</h5>
              <p className="text-text-muted text-xs mt-1">აირჩიეთ ავზი → დაამატეთ გრავიტი რეგულარულად → აკონტროლეთ ტემპერატურა</p>
            </div>
            <div className="bg-bg-tertiary rounded-lg p-3">
              <h5 className="font-medium text-purple-400">3️⃣ კონდიცირება</h5>
              <p className="text-text-muted text-xs mt-1">გადაიტანეთ ავზში → დაამატეთ FG → გამოთვალეთ ABV</p>
            </div>
            <div className="bg-bg-tertiary rounded-lg p-3">
              <h5 className="font-medium text-cyan-400">4️⃣ მზადა</h5>
              <p className="text-text-muted text-xs mt-1">შეამოწმეთ ხარისხის ტესტები → მონიშნეთ მზადყოფნა</p>
            </div>
            <div className="bg-bg-tertiary rounded-lg p-3">
              <h5 className="font-medium text-green-400">5️⃣ დაფასოება</h5>
              <p className="text-text-muted text-xs mt-1">აირჩიეთ ტიპი (კეგი/ბოთლი) → შეიყვანეთ რაოდენობა → დაასრულეთ</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'calendar',
      title: 'კალენდარი',
      icon: '📅',
      link: '/calendar',
      content: (
        <div className="space-y-4 text-text-primary text-sm">
          <h4 className="font-semibold text-base">კალენდრის გამოყენება:</h4>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>ხედავთ ყველა პარტიას და მათ სტატუსს</li>
            <li>ავზების განრიგი - რომელი როდის დაკავებულია</li>
            <li>შეკვეთები - როდის უნდა მომზადდეს</li>
          </ul>
          
          <h4 className="font-semibold text-base mt-6">ახალი მოვლენის დამატება:</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>დააჭირეთ თარიღზე ან "ახალი მოვლენა"</li>
            <li>შეავსეთ: სახელი, თარიღი, ტიპი, ავზი</li>
            <li>დააჭირეთ "შენახვა"</li>
          </ol>
        </div>
      )
    },
    {
      id: 'sales',
      title: 'გაყიდვები',
      icon: '💰',
      link: '/sales',
      content: (
        <div className="space-y-4 text-text-primary text-sm">
          <h4 className="font-semibold text-base">კლიენტის დამატება:</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>გადადით "💰 გაყიდვები" → "👥 კლიენტები"</li>
            <li>დააჭირეთ "ახალი კლიენტი"</li>
            <li>შეავსეთ: სახელი, კონტაქტი, ელ-ფოსტა, ტელეფონი</li>
            <li>დააჭირეთ "შენახვა"</li>
          </ol>
          
          <h4 className="font-semibold text-base mt-6">შეკვეთის შექმნა:</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>გადადით "📋 შეკვეთები"</li>
            <li>დააჭირეთ "ახალი შეკვეთა"</li>
            <li>აირჩიეთ კლიენტი</li>
            <li>დაამატეთ პროდუქტები და რაოდენობა</li>
            <li>დააჭირეთ "შენახვა"</li>
          </ol>
          
          <h4 className="font-semibold text-base mt-6">კეგების მართვა:</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>შევსება</strong> - დააკავშირეთ პარტიასთან</li>
            <li><strong>გაგზავნა</strong> - დააკავშირეთ კლიენტთან</li>
            <li><strong>დაბრუნება</strong> - როცა კეგი ბრუნდება</li>
            <li><strong>CIP</strong> - რეცხვა</li>
          </ul>
        </div>
      )
    },
    {
      id: 'quality',
      title: 'ხარისხის კონტროლი',
      icon: '✅',
      link: '/quality',
      content: (
        <div className="space-y-4 text-text-primary text-sm">
          <h4 className="font-semibold text-base">ტესტების ტიპები:</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>ABV - ალკოჰოლის პროცენტი</li>
            <li>Gravity - OG/FG</li>
            <li>pH</li>
            <li>IBU - სიმწარე</li>
            <li>ფერი, გემო, სუნი</li>
          </ul>
          
          <h4 className="font-semibold text-base mt-6">ტესტის დამატება:</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>გადადით "✅ ხარისხი" მენიუში</li>
            <li>აირჩიეთ პარტია</li>
            <li>დააჭირეთ "ახალი ტესტი"</li>
            <li>შეავსეთ: ტესტის ტიპი, შედეგი, თარიღი</li>
            <li>დააჭირეთ "შენახვა"</li>
          </ol>
        </div>
      )
    },
    {
      id: 'reports',
      title: 'რეპორტები',
      icon: '📊',
      link: '/reports',
      content: (
        <div className="space-y-4 text-text-primary text-sm">
          <h4 className="font-semibold text-base">რეპორტების ტიპები:</h4>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>📦 მარაგების რეპორტი</strong> - რა არის, რამდენი დარჩა</li>
            <li><strong>🍺 წარმოების რეპორტი</strong> - პარტიები, ეფექტურობა</li>
            <li><strong>💰 გაყიდვების რეპორტი</strong> - გაყიდვები, შემოსავალი</li>
            <li><strong>✅ ხარისხის რეპორტი</strong> - ტესტები, სტატისტიკა</li>
          </ul>
          
          <h4 className="font-semibold text-base mt-6">რეპორტის გენერირება:</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>აირჩიეთ რეპორტის ტიპი</li>
            <li>აირჩიეთ პერიოდი</li>
            <li>დააჭირეთ "გენერირება"</li>
            <li>გადმოწერეთ PDF ან Excel</li>
          </ol>
        </div>
      )
    },
    {
      id: 'finances',
      title: 'ფინანსები',
      icon: '💵',
      link: '/finances',
      content: (
        <div className="space-y-4 text-text-primary text-sm">
          <h4 className="font-semibold text-base">მოდულები:</h4>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>💰 შემოსავალი</strong> - ინვოისები, გადახდები</li>
            <li><strong>💸 ხარჯები</strong> - შეძენები, ხარჯები</li>
            <li><strong>📊 ბიუჯეტი</strong> - დაგეგმვა და კონტროლი</li>
          </ul>
          
          <h4 className="font-semibold text-base mt-6">ინვოისის შექმნა:</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>გადადით "📄 ინვოისები"</li>
            <li>დააჭირეთ "ახალი ინვოისი"</li>
            <li>აირჩიეთ კლიენტი, თარიღი</li>
            <li>დაამატეთ პროდუქტები</li>
            <li>დააჭირეთ "შენახვა"</li>
          </ol>
        </div>
      )
    },
    {
      id: 'settings',
      title: 'პარამეტრები',
      icon: '⚙️',
      link: '/settings',
      content: (
        <div className="space-y-4 text-text-primary text-sm">
          <h4 className="font-semibold text-base">პარამეტრების სექციები:</h4>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>კომპანია</strong> - კომპანიის ინფორმაცია</li>
            <li><strong>მომხმარებლები</strong> - მომხმარებლების მართვა</li>
            <li><strong>გარეგნობა</strong> - თემა, ფერები</li>
            <li><strong>წარმოება</strong> - ფაზების ფერები, ერთეულები</li>
            <li><strong>უსაფრთხოება</strong> - პაროლის შეცვლა</li>
          </ul>
        </div>
      )
    },
    {
      id: 'contact',
      title: 'კონტაქტი',
      icon: '📞',
      content: (
        <div className="space-y-4 text-text-primary text-sm">
          <h4 className="font-semibold text-base">დაგვიკავშირდით:</h4>
          <ul className="space-y-3 ml-4">
            <li className="flex items-center gap-3">
              <span>📧</span>
              <span>Email: <a href="mailto:zzedginidze@gmail.com" className="text-copper hover:underline">zzedginidze@gmail.com</a></span>
            </li>
            <li className="flex items-center gap-3">
              <span>📱</span>
              <span>ტელეფონი: +995 599946500</span>
            </li>
            <li className="flex items-center gap-3">
              <span>🕐</span>
              <span>სამუშაო საათები: ორშ-პარ, 09:00-18:00</span>
            </li>
          </ul>
          
          <div className="bg-copper/10 border border-copper/30 rounded-lg p-4 mt-6">
            <p className="text-copper font-semibold">გმადლობთ რომ აირჩიეთ BrewMaster PRO! 🍺</p>
          </div>
        </div>
      )
    },
  ]

  return (
    <DashboardLayout title="❓ დახმარება" breadcrumb="მთავარი / დახმარება">
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-text-primary">📚 მომხმარებლის სახელმძღვანელო</h1>
            <p className="text-text-muted">BrewMaster PRO-ს სრული დოკუმენტაცია</p>
          </CardHeader>
          <CardBody>
            <p className="text-text-muted mb-4">დააკლიკეთ სექციაზე დეტალური ინფორმაციის სანახავად. ისრის ღილაკით გადახვალთ შესაბამის გვერდზე.</p>
            <div className="space-y-2">
              {sections.map(section => (
                <AccordionSection
                  key={section.id}
                  section={section}
                  isOpen={openSections.includes(section.id)}
                  onToggle={() => toggleSection(section.id)}
                  onNavigate={navigateTo}
                />
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  )
}
