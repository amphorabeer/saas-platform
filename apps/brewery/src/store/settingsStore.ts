import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PhaseColors, PhaseColorKey, DEFAULT_PHASE_COLORS, CompanySettings, AppearanceSettings, ProductionSettings, mockProductionSettings } from '@/data/settingsData'

interface SettingsState {
  phaseColors: PhaseColors
  setPhaseColor: (phase: keyof PhaseColors, color: PhaseColorKey) => void
  setPhaseColors: (colors: PhaseColors) => void
  resetPhaseColors: () => void
  companySettings: CompanySettings
  setCompanySettings: (settings: Partial<CompanySettings>) => void
  resetCompanySettings: () => void
  appearanceSettings: AppearanceSettings
  setAppearanceSettings: (settings: Partial<AppearanceSettings>) => void
  resetAppearanceSettings: () => void
  productionSettings: ProductionSettings
  setProductionSettings: (settings: Partial<ProductionSettings>) => void
  resetProductionSettings: () => void
}

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: 'BrewMaster',
  legalName: 'შპს ბრიუმასტერი',
  taxId: '123456789',
  address: 'თბილისი, საქართველო',
  phone: '+995 555 123 456',
  email: 'info@brewmaster.ge',
  website: 'https://brewmaster.ge',
}

const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: 'dark',
  accentColor: 'copper',
  language: 'ka',
  dateFormat: 'DD.MM.YYYY',
  currency: 'GEL',
  numberFormat: '1,234.56',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      phaseColors: DEFAULT_PHASE_COLORS,
      setPhaseColor: (phase, color) =>
        set((state) => ({
          phaseColors: { ...state.phaseColors, [phase]: color },
        })),
      setPhaseColors: (colors) => set({ phaseColors: colors }),
      resetPhaseColors: () => set({ phaseColors: DEFAULT_PHASE_COLORS }),
      companySettings: DEFAULT_COMPANY_SETTINGS,
      setCompanySettings: (settings) =>
        set((state) => ({
          companySettings: { ...state.companySettings, ...settings },
        })),
      resetCompanySettings: () => set({ companySettings: DEFAULT_COMPANY_SETTINGS }),
      appearanceSettings: DEFAULT_APPEARANCE_SETTINGS,
      setAppearanceSettings: (settings) =>
        set((state) => ({
          appearanceSettings: { ...state.appearanceSettings, ...settings },
        })),
      resetAppearanceSettings: () => set({ appearanceSettings: DEFAULT_APPEARANCE_SETTINGS }),
      productionSettings: mockProductionSettings,
      setProductionSettings: (settings) =>
        set((state) => ({
          productionSettings: { ...state.productionSettings, ...settings },
        })),
      resetProductionSettings: () => set({ productionSettings: mockProductionSettings }),
    }),
    {
      name: 'brewery-settings',
      onRehydrateStorage: () => (state) => {
        if (state?.companySettings) {
          console.log('Settings hydrated:', state.companySettings)
        }
      },
    }
  )
)

