'use client'



import { useMemo } from 'react'

import type { Recipe } from '@/app/recipes/page'

import { formatDate } from '@/lib/utils'

import { useBreweryStore } from '@/store'



interface RecipeCardProps {

  recipe: Recipe

  viewMode: 'grid' | 'list'

  onClick: () => void

  onToggleFavorite: () => void

}



// Utility function to get beer color from SRM
const getBeerColor = (srm: number): string => {
  // Clamp SRM to valid range
  const clampedSrm = Math.max(1, Math.min(40, srm || 5))
  
  // SRM to RGB approximation (SRM color chart)
  const colors: [number, string][] = [
    [1, '#FFE699'],   // Very Light
    [2, '#FFD878'],   // Light
    [3, '#FFCA5A'],   // Pale
    [4, '#FFBF42'],   // Gold
    [5, '#FBB123'],   // Deep Gold
    [6, '#F8A600'],   // Amber
    [7, '#F39C00'],   // Medium Amber
    [8, '#EA8F00'],   // Deep Amber
    [9, '#E58500'],   // Copper
    [10, '#DE7C00'],  // Deep Copper
    [12, '#CF6900'],  // Brown
    [14, '#C35900'],  // Very Dark Brown
    [17, '#A34200'],  // Dark Brown
    [20, '#8D4000'],  // Black
    [25, '#5A2800'],  // Deep Black
    [30, '#261716'],  // Opaque Black
    [40, '#0F0B0A'],  // Pitch Black
  ]
  
  // Find closest SRM value
  for (let i = colors.length - 1; i >= 0; i--) {
    if (clampedSrm >= colors[i][0]) {
      return colors[i][1]
    }
  }
  
  return colors[0][1]
}

const STYLE_COLORS: Record<string, string> = {

  'Amber Lager': 'bg-amber-600',

  'American IPA': 'bg-orange-500',

  'Dry Stout': 'bg-stone-800',

  'Hefeweizen': 'bg-yellow-400',

  'Czech Pilsner': 'bg-yellow-500',

  'Baltic Porter': 'bg-stone-700',

}



export function RecipeCard({ recipe, viewMode, onClick, onToggleFavorite }: RecipeCardProps) {

  const styleColor = STYLE_COLORS[recipe.style] || 'bg-copper'

  // Get real batch count from Zustand store
  const batches = useBreweryStore(state => state.batches)
  const realBatchCount = useMemo(() => {
    return batches.filter(b => b.recipeId === recipe.id).length
  }, [batches, recipe.id])



  if (viewMode === 'list') {

    return (

      <div 

        onClick={onClick}

        className="bg-bg-card border border-border rounded-xl p-4 hover:border-copper/50 cursor-pointer transition-all flex items-center gap-6"

      >

        {/* Beer color indicator */}
        <div 
          className="w-2 h-16 rounded-full"
          style={{ backgroundColor: getBeerColor(recipe.srm || 5) }}
        />

        

        {/* Info */}

        <div className="flex-1">

          <div className="flex items-center gap-2">

            <h3 className="font-display font-semibold text-lg">{recipe.name}</h3>

            {recipe.isFavorite && <span className="text-amber-400">★</span>}

          </div>

          <p className="text-sm text-text-muted">{recipe.style}</p>

        </div>



        {/* Stats */}

        <div className="grid grid-cols-4 gap-8 text-center">

          <div>

            <p className="font-mono text-copper-light">{recipe.targetABV}%</p>

            <p className="text-xs text-text-muted">ABV</p>

          </div>

          <div>

            <p className="font-mono">{recipe.ibu}</p>

            <p className="text-xs text-text-muted">IBU</p>

          </div>

          <div>

            <p className="font-mono">{realBatchCount}</p>

            <p className="text-xs text-text-muted">პარტია</p>

          </div>

          <div>

            <p className="font-mono text-amber-400">⭐ {recipe.rating}</p>

            <p className="text-xs text-text-muted">შეფასება</p>

          </div>

        </div>



        {/* Favorite button */}

        <button

          onClick={(e) => {

            e.stopPropagation()

            onToggleFavorite()

          }}

          className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"

        >

          {recipe.isFavorite ? '★' : '☆'}

        </button>

      </div>

    )

  }



  return (

    <div 

      onClick={onClick}

      className="bg-bg-card border border-border rounded-2xl overflow-hidden hover:border-copper/50 cursor-pointer transition-all group"

    >

      {/* Header with beer color */}
      <div 
        className="h-24 relative"
        style={{ 
          backgroundColor: getBeerColor(recipe.srm || 5)
        }}
      >

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <button

          onClick={(e) => {

            e.stopPropagation()

            onToggleFavorite()

          }}

          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition-colors"

        >

          <span className={recipe.isFavorite ? 'text-amber-400' : 'text-white/60'}>

            {recipe.isFavorite ? '★' : '☆'}

          </span>

        </button>

        <div className="absolute bottom-3 left-4">

          <span className="px-2 py-1 bg-black/40 rounded text-xs text-white">

            {recipe.style}

          </span>

        </div>

      </div>



      {/* Content */}

      <div className="p-4">

        <h3 className="font-display font-semibold text-lg mb-1">{recipe.name}</h3>

        <p className="text-sm text-text-muted line-clamp-2 mb-4">{recipe.description}</p>



        {/* Stats Grid */}

        <div className="grid grid-cols-4 gap-2 text-center mb-4">

          <div className="bg-bg-tertiary rounded-lg p-2">

            <p className="font-mono text-sm text-copper-light">{recipe.targetABV}%</p>

            <p className="text-[10px] text-text-muted">ABV</p>

          </div>

          <div className="bg-bg-tertiary rounded-lg p-2">

            <p className="font-mono text-sm">{recipe.ibu}</p>

            <p className="text-[10px] text-text-muted">IBU</p>

          </div>

          <div className="bg-bg-tertiary rounded-lg p-2 flex items-center justify-center gap-1.5">
            <div 
              className="w-4 h-4 rounded-full border border-border"
              style={{ backgroundColor: getBeerColor(recipe.srm || 5) }}
            />
            <div>
              <p className="font-mono text-sm">{recipe.srm}</p>
              <p className="text-[10px] text-text-muted">SRM</p>
            </div>
          </div>

          <div className="bg-bg-tertiary rounded-lg p-2">

            <p className="font-mono text-sm">{recipe.batchSize}L</p>

            <p className="text-[10px] text-text-muted">მოცულობა</p>

          </div>

        </div>



        {/* Footer */}

        <div className="flex justify-between items-center pt-3 border-t border-border">

          <div className="flex items-center gap-2">

            <span className="text-amber-400">⭐</span>

            <span className="text-sm">{recipe.rating}</span>

            <span className="text-text-muted text-sm">• {realBatchCount} პარტია</span>

          </div>

          <span className="text-xs text-text-muted">

            {formatDate(recipe.updatedAt)}

          </span>

        </div>

      </div>

    </div>

  )

}



