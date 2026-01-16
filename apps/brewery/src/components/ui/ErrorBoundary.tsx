'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
    // Here you could send to Sentry or other error tracking
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center p-8 bg-slate-800 rounded-xl max-w-md">
            <div className="text-4xl mb-4">😕</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              რაღაც შეცდომა მოხდა
            </h2>
            <p className="text-slate-400 mb-4">
              გვერდის ჩატვირთვისას პრობლემა წარმოიქმნა
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              გვერდის განახლება
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}









