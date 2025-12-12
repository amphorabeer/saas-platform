'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { RecipeCard } from '@/components/recipes/RecipeCard'
import { RecipeDetailModal } from '@/components/recipes/RecipeDetailModal'
import { NewRecipeModal } from '@/components/recipes/NewRecipeModal'
import { recipes as centralRecipes, batches } from '@/data/centralData'

export interface Ingredient {
  id: string
  name: string
  type: 'grain' | 'hop' | 'yeast' | 'adjunct' | 'water'
  amount: number
  unit: string
  percentage?: number
  addTime?: string
  notes?: string
}

export interface BrewingStep {
  id: string
  order: number
  name: string
  description: string
  duration: number
  temperature?: number
  notes?: string
}

export interface Recipe {
  id: string
  name: string
  style: string
  description: string
  targetOG: number
  targetFG: number
  targetABV: number
  ibu: number
  srm: number
  batchSize: number
  boilTime: number
  efficiency: number
  ingredients: Ingredient[]
  steps: BrewingStep[]
  notes: string
  createdAt: Date
  updatedAt: Date
  batchCount: number
  rating: number
  isFavorite: boolean
}

// Transform central recipes to page format
const mockRecipes: Recipe[] = centralRecipes.map((r, index) => ({
  id: r.id,
  name: r.name,
  style: r.style,
  description: `${r.style} სტილის ლუდი - ABV ${r.abv}%, IBU ${r.ibu}`,
  targetOG: r.og,
  targetFG: r.fg,
  targetABV: r.abv,
  ibu: r.ibu,
  srm: r.color,
  batchSize: r.batchSize,
  boilTime: r.boilTime,
  efficiency: 75,
  ingredients: r.ingredients.map((ing, i) => ({
    id: String(i + 1),
    name: ing.name,
    type: ing.category === 'malt' ? 'grain' : ing.category === 'hops' ? 'hop' : ing.category as 'yeast' | 'adjunct' | 'water',
    amount: ing.amount,
    unit: ing.unit,
    addTime: ing.additionTime ? `${ing.additionTime} წთ` : undefined,
  })),
  steps: r.steps.map((step, i) => ({
    id: String(i + 1),
    order: i + 1,
    name: step.split(' ')[0],
    description: step,
    duration: 60,
  })),
  notes: r.notes || '',
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  batchCount: batches.filter(b => b.recipeId === r.id).length + Math.floor(Math.random() * 20),
  rating: 4.5 + Math.random() * 0.5,
  isFavorite: index < 2,
}))



export default function RecipesPage() {

  const [recipes, setRecipes] = useState(mockRecipes)

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)

  const [showNewRecipeModal, setShowNewRecipeModal] = useState(false)

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [filterStyle, setFilterStyle] = useState<string>('all')

  const [searchQuery, setSearchQuery] = useState('')

  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'batchCount' | 'updatedAt'>('updatedAt')



  const styles = ['all', ...new Set(recipes.map(r => r.style))]



  const filteredRecipes = recipes

    .filter(recipe => {

      if (filterStyle !== 'all' && recipe.style !== filterStyle) return false

      if (searchQuery && !recipe.name.toLowerCase().includes(searchQuery.toLowerCase())) return false

      return true

    })

    .sort((a, b) => {

      switch (sortBy) {

        case 'name': return a.name.localeCompare(b.name)

        case 'rating': return b.rating - a.rating

        case 'batchCount': return b.batchCount - a.batchCount

        case 'updatedAt': return b.updatedAt.getTime() - a.updatedAt.getTime()

        default: return 0

      }

    })



  const toggleFavorite = (id: string) => {

    setRecipes(prev => prev.map(r => 

      r.id === id ? { ...r, isFavorite: !r.isFavorite } : r

    ))

  }



  const stats = {

    total: recipes.length,

    favorites: recipes.filter(r => r.isFavorite).length,

    totalBatches: recipes.reduce((sum, r) => sum + r.batchCount, 0),

    avgRating: (recipes.reduce((sum, r) => sum + r.rating, 0) / recipes.length).toFixed(1),

  }



  return (

    <DashboardLayout title="რეცეპტები" breadcrumb="მთავარი / რეცეპტები">

      {/* Stats */}

      <div className="grid grid-cols-4 gap-4 mb-6">

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display text-copper-light">{stats.total}</p>

          <p className="text-xs text-text-muted">სულ რეცეპტი</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display text-amber-400">{stats.favorites}</p>

          <p className="text-xs text-text-muted">ფავორიტი</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display">{stats.totalBatches}</p>

          <p className="text-xs text-text-muted">სულ მოხარშული</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display text-green-400">⭐ {stats.avgRating}</p>

          <p className="text-xs text-text-muted">საშუალო შეფასება</p>

        </div>

      </div>



      {/* Filters & Actions */}

      <div className="flex justify-between items-center mb-6 gap-4">

        <div className="flex gap-3 flex-1">

          {/* Search */}

          <div className="relative">

            <input

              type="text"

              placeholder="ძიება..."

              value={searchQuery}

              onChange={(e) => setSearchQuery(e.target.value)}

              className="pl-10 pr-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm w-64 focus:border-copper focus:outline-none"

            />

            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">🔍</span>

          </div>



          {/* Style Filter */}

          <select

            value={filterStyle}

            onChange={(e) => setFilterStyle(e.target.value)}

            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm focus:border-copper focus:outline-none"

          >

            <option value="all">ყველა სტილი</option>

            {styles.filter(s => s !== 'all').map(style => (

              <option key={style} value={style}>{style}</option>

            ))}

          </select>



          {/* Sort */}

          <select

            value={sortBy}

            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}

            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm focus:border-copper focus:outline-none"

          >

            <option value="updatedAt">ბოლოს განახლებული</option>

            <option value="name">სახელით</option>

            <option value="rating">შეფასებით</option>

            <option value="batchCount">პოპულარობით</option>

          </select>

        </div>



        <div className="flex gap-2">

          <button

            onClick={() => setViewMode('grid')}

            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-copper text-white' : 'bg-bg-tertiary'}`}

          >

            ▦

          </button>

          <button

            onClick={() => setViewMode('list')}

            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-copper text-white' : 'bg-bg-tertiary'}`}

          >

            ☰

          </button>

          <Button variant="primary" onClick={() => setShowNewRecipeModal(true)}>

            + ახალი რეცეპტი

          </Button>

        </div>

      </div>



      {/* Recipes Grid/List */}

      <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-6' : 'space-y-4'}>

        {filteredRecipes.map(recipe => (

          <RecipeCard

            key={recipe.id}

            recipe={recipe}

            viewMode={viewMode}

            onClick={() => setSelectedRecipe(recipe)}

            onToggleFavorite={() => toggleFavorite(recipe.id)}

          />

        ))}

      </div>



      {filteredRecipes.length === 0 && (

        <div className="text-center py-12 text-text-muted">

          <p className="text-4xl mb-4">📋</p>

          <p>რეცეპტები ვერ მოიძებნა</p>

        </div>

      )}



      {/* Recipe Detail Modal */}

      {selectedRecipe && (

        <RecipeDetailModal

          recipe={selectedRecipe}

          onClose={() => setSelectedRecipe(null)}

          onStartBatch={() => {

            // TODO: Navigate to new batch with recipe

            setSelectedRecipe(null)

          }}

        />

      )}



      {/* New Recipe Modal */}

      {showNewRecipeModal && (

        <NewRecipeModal

          onClose={() => setShowNewRecipeModal(false)}

          onSave={(recipe) => {

            setRecipes(prev => [...prev, { ...recipe, id: Date.now().toString() }])

            setShowNewRecipeModal(false)

          }}

        />

      )}

    </DashboardLayout>

  )

}



