/**
 * Validation rules for Fermentables
 * Enforces that maltCategory is only allowed when type === "grain"
 */

import { FermentableType } from "./types";
import { MaltCategory } from "../malt-library/types";

export interface FermentableValidationError {
  code: string;
  message: string;
}

/**
 * Validate fermentable type and malt category combination
 * 
 * Rules:
 * - If type === "grain", maltCategory is required
 * - If type !== "grain", maltCategory must be null/undefined
 * 
 * @param type - Fermentable type
 * @param maltCategory - Optional malt category (only valid for grain)
 * @throws Error if validation fails
 */
export function validateFermentable(
  type: FermentableType,
  maltCategory?: MaltCategory | null
): void {
  if (type === "grain" && !maltCategory) {
    throw new Error(
      "Malt category is required when fermentable type is grain"
    );
  }

  if (type !== "grain" && maltCategory) {
    throw new Error(
      "Malt category is only allowed for grain fermentables"
    );
  }
}

/**
 * Validate and return sanitized fermentable data
 * 
 * @param type - Fermentable type
 * @param maltCategory - Optional malt category
 * @returns Sanitized object with type and maltCategory (null if not grain)
 */
export function validateAndSanitizeFermentable(
  type: FermentableType,
  maltCategory?: MaltCategory | null
): { type: FermentableType; maltCategory: MaltCategory | null } {
  validateFermentable(type, maltCategory);

  return {
    type,
    maltCategory: type === "grain" ? (maltCategory || null) : null,
  };
}



















