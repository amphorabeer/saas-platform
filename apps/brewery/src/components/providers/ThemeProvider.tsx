'use client'

import { useEffect } from 'react'
import { useSettingsStore } from '@/store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { appearanceSettings } = useSettingsStore()
  const theme = appearanceSettings?.theme || 'dark'

  useEffect(() => {
    const root = document.documentElement
    
    // წაშალე ძველი კლასები
    root.classList.remove('light', 'dark')
    
    if (theme === 'system') {
      // სისტემის პრეფერენციის შემოწმება
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.add(systemPrefersDark ? 'dark' : 'light')
      
      // მოუსმინე სისტემის ცვლილებას
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove('light', 'dark')
        root.classList.add(e.matches ? 'dark' : 'light')
      }
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  return <>{children}</>
}


