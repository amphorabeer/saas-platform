/**
 * UI Labels for Fermentable Types and Malt Categories
 * Supports both English and Georgian
 */

import { FermentableType } from "./types";
import { MaltCategory } from "../malt-library/types";

export const FERMENTABLE_TYPE_LABELS = {
  en: {
    grain: "Grain (Malt)",
    sugar: "Sugar",
    liquid_extract: "Liquid Extract",
    dry_extract: "Dry Extract",
    adjunct: "Adjunct",
    other: "Other",
  },
  ka: {
    grain: "მარცვლოვანი (ალაო)",
    sugar: "შაქარი",
    liquid_extract: "თხევადი ალაოს ექსტრაქტი",
    dry_extract: "მშრალი ალაოს ექსტრაქტი",
    adjunct: "დამატებითი ინგრედიენტი",
    other: "სხვა",
  },
} satisfies Record<"en" | "ka", Record<FermentableType, string>>;

export const MALT_CATEGORY_LABELS = {
  en: {
    base: "Base Malt",
    caramel: "Caramel / Crystal",
    roasted: "Roasted",
    specialty: "Specialty",
    smoked: "Smoked",
    acidulated: "Acidulated",
  },
  ka: {
    base: "საბაზო",
    caramel: "კარამელის",
    roasted: "შემწვარი",
    specialty: "სპეციალური",
    smoked: "შებოლილი",
    acidulated: "მჟავიანი",
  },
} satisfies Record<"en" | "ka", Record<MaltCategory, string>>;

/**
 * Get label for fermentable type
 */
export function getFermentableTypeLabel(
  type: FermentableType,
  locale: "en" | "ka" = "ka"
): string {
  return FERMENTABLE_TYPE_LABELS[locale][type];
}

/**
 * Get label for malt category
 */
export function getMaltCategoryLabel(
  category: MaltCategory,
  locale: "en" | "ka" = "ka"
): string {
  return MALT_CATEGORY_LABELS[locale][category];
}



















