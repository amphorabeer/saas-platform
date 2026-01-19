/**
 * Brewfather-style Malt Library Types
 * Framework-agnostic, reusable malt specification system
 */

export type MaltType = "base" | "caramel" | "roasted" | "specialty" | "adjunct"

/**
 * Malt Category - Classification for grain/malt fermentables only
 * Used when FermentableType === "grain"
 */
export type MaltCategory =
  | "base"
  | "caramel"
  | "roasted"
  | "specialty"
  | "smoked"
  | "acidulated";

export interface MaltSpec {
  id: string;                    // stable slug UUID-like or deterministic slug
  name: string;                  // display name
  type: MaltType;

  producer?: string;             // Weyermann, BestMalz, Castle, Crisp, Viking, ...
  country?: string;              // DE, BE, UK, FI...
  supplier?: string;             // optional: same as producer or distributor

  color: { 
    ebc: { 
      typical: number; 
      min?: number; 
      max?: number 
    } 
  };

  extract?: { 
    fgdbPercent?: number;         // fine grind dry basis %
  };
  yield?: { 
    percent?: number;              // alias if you prefer (optional)
  };

  diastaticPower?: { 
    wk?: number; 
    lintner?: number 
  };
  moisturePercent?: number;
  proteinPercent?: number;

  maxUsagePercent?: number;       // recommended max
  recommendedUsage?: { 
    min?: number; 
    max?: number 
  };

  flavorNotes?: string[];
  styles?: string[];
  tags?: string[];
  keywords?: string[];

  allergens?: { 
    gluten: boolean 
  };
  metadata?: {
    version: string;              // library version
    source?: string;              // "manufacturer spec sheet", "internal", etc.
    updatedAt: string;            // ISO date
  };
}

export interface MaltLibrary {
  library: {
    name: string;
    version: string;
    generatedAt: string;
    defaults?: {
      allergens?: {
        gluten?: boolean;
      };
    };
  };
  items: MaltSpec[];
}



















