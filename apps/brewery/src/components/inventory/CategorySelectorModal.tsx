'use client'

export type IngredientCategoryType = 'MALT' | 'HOPS' | 'YEAST' | 'ADJUNCT' | 'WATER_CHEMISTRY'

interface CategorySelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectCategory: (category: IngredientCategoryType) => void
}

const CATEGORY_CONFIG: Record<IngredientCategoryType, { label: string; icon: string; description: string }> = {
  MALT: { 
    label: 'მარცვლეული', 
    icon: '🌾',
    description: 'ალაო და მარცვლეული'
  },
  HOPS: { 
    label: 'სვია', 
    icon: '🌿',
    description: 'სვია და ჰოპები'
  },
  YEAST: { 
    label: 'საფუარი', 
    icon: '🧪',
    description: 'საფუარი და ფერმენტაცია'
  },
  ADJUNCT: { 
    label: 'დანამატები', 
    icon: '🧫',
    description: 'დანამატები და სპეციალური ინგრედიენტები'
  },
  WATER_CHEMISTRY: { 
    label: 'წყლის ქიმია', 
    icon: '💧',
    description: 'წყლის მომზადება და ქიმიკატები'
  },
}

export function CategorySelectorModal({ isOpen, onClose, onSelectCategory }: CategorySelectorModalProps) {
  if (!isOpen) return null

  const handleSelectCategory = (category: IngredientCategoryType) => {
    onSelectCategory(category)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">აირჩიე კატეგორია</h2>
              <p className="text-sm text-slate-400 mt-1">აირჩიე ინგრედიენტის კატეგორია</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.entries(CATEGORY_CONFIG) as [IngredientCategoryType, typeof CATEGORY_CONFIG[IngredientCategoryType]][]).map(([category, config]) => (
              <button
                key={category}
                onClick={() => handleSelectCategory(category)}
                className="p-6 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 hover:border-copper transition-all duration-200 text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{config.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{config.label}</h3>
                    <p className="text-sm text-slate-400">{config.description}</p>
                  </div>
                  <div className="text-slate-400 group-hover:text-copper transition-colors">
                    →
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            დახურვა
          </button>
        </div>
      </div>
    </div>
  )
}
