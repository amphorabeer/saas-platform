'use client'

import { Card, CardBody } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ExpenseCategory } from '@/data/financeData'
import { expenseCategoryConfig } from '@/data/financeData'
import { formatCurrency } from '@/lib/utils'

interface ExpenseCardProps {
  category: ExpenseCategory
  amount: number
  budget: number
  percentage: number
  trend?: number
}

export function ExpenseCard({ category, amount, budget, percentage, trend }: ExpenseCardProps) {
  const config = expenseCategoryConfig[category]
  const isOverBudget = amount > budget
  const difference = amount - budget
  const budgetPercentage = Math.min((amount / budget) * 100, 100)

  const getProgressColor = () => {
    if (budgetPercentage < 80) return 'bg-green-500'
    if (budgetPercentage <= 100) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <Card className="border border-border hover:border-copper/50 transition-colors">
      <CardBody className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{config.icon}</span>
            <h3 className="font-semibold text-text-primary">{config.name}</h3>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-2xl font-bold text-text-primary mb-1">
            {formatCurrency(amount)}
          </div>
          <div className="text-sm text-text-muted">
            ბიუჯეტი: {formatCurrency(budget)}
          </div>
        </div>

        <div className="mb-2">
          <ProgressBar
            value={budgetPercentage}
            max={100}
            className={getProgressColor()}
          />
          <div className="flex items-center justify-between mt-1 text-xs text-text-muted">
            <span>{budgetPercentage.toFixed(0)}%</span>
            {isOverBudget && (
              <span className="text-red-400 font-medium">
                ⚠️ {formatCurrency(Math.abs(difference))} გადაცილება
              </span>
            )}
            {!isOverBudget && difference < 0 && (
              <span className="text-green-400 font-medium">
                ✅ {formatCurrency(Math.abs(difference))} დაზოგვა
              </span>
            )}
          </div>
        </div>

        {trend !== undefined && (
          <div className="text-xs text-text-muted">
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}% vs წინა თვე
          </div>
        )}
      </CardBody>
    </Card>
  )
}

