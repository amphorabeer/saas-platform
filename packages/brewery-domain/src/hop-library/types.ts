/**
 * Brewfather-style Hop Library Types
 * Framework-agnostic, reusable hop specification system
 */

export type HopType = "aroma" | "bittering" | "dual";

export interface HopSpec {
  id: string;                    // stable slug UUID-like or deterministic slug
  name: string;                   // display name
  type: HopType;

  producer?: string;              // Hopsteiner, Yakima Chief, Barth-Haas, etc.
  country?: string;               // US, DE, CZ, UK, NZ, AU...
  supplier?: string;              // optional: same as producer or distributor

  alphaAcidPercent: {
    min: number;
    max: number;
    typical?: number;             // optional typical value
  };

  betaAcidPercent?: {
    min?: number;
    max?: number;
    typical?: number;
  };

  cohumulonePercent?: {
    min?: number;
    max?: number;
    typical?: number;
  };

  oilProfile?: {
    totalOils?: {
      min?: number;               // ml/100g
      max?: number;
      typical?: number;
    };
    myrcene?: {
      min?: number;               // %
      max?: number;
      typical?: number;
    };
    humulene?: {
      min?: number;               // %
      max?: number;
      typical?: number;
    };
    caryophyllene?: {
      min?: number;               // %
      max?: number;
      typical?: number;
    };
    farnesene?: {
      min?: number;               // %
      max?: number;
      typical?: number;
    };
  };

  storageIndex?: number;          // HSI (Hop Storage Index) - stability indicator

  aromaNotes?: string[];          // ["citrus", "pine", "floral", "spicy", "herbal", ...]
  forms?: string[];               // ["T90 pellets", "cones", "T45 pellets", "cryo", "extract"]
  
  usage?: {
    bittering?: boolean;
    aroma?: boolean;
    dryHop?: boolean;
    whirlpool?: boolean;
  };

  styles?: string[];             // ["IPA", "Pale Ale", "Lager", ...]
  tags?: string[];                // ["noble", "new world", "citrus", ...]
  keywords?: string[];            // searchable keywords

  metadata?: {
    version: string;              // library version
    source?: string;              // "manufacturer spec sheet", "internal", etc.
    updatedAt: string;            // ISO date
  };
}

export interface HopLibrary {
  library: {
    name: string;
    version: string;
    generatedAt: string;
    defaults?: {
      forms?: string[];
    };
  };
  items: HopSpec[];
}



















