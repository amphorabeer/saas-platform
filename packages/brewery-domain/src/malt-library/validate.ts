/**
 * Malt Library Validation
 * Uses AJV for JSON Schema validation
 */

import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { MaltLibrary } from './types'

// Import JSON schema - using require for JSON files
// eslint-disable-next-line @typescript-eslint/no-var-requires
const maltSchema = require('./malt.schema.json')

const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)

const validate = ajv.compile(maltSchema)

export interface ValidationResult {
  ok: boolean
  errors?: string[]
}

/**
 * Validate malt library data against JSON schema
 */
export function validateMaltLibrary(data: unknown): ValidationResult {
  const valid = validate(data)
  
  if (valid) {
    return { ok: true }
  }
  
  const errors = validate.errors?.map(err => {
    const path = err.instancePath || err.schemaPath
    return `${path}: ${err.message}`
  }) || ['Unknown validation error']
  
  return {
    ok: false,
    errors,
  }
}

/**
 * Validate and type-check malt library
 */
export function validateAndParseMaltLibrary(data: unknown): {
  ok: boolean
  data?: MaltLibrary
  errors?: string[]
} {
  const result = validateMaltLibrary(data)
  
  if (!result.ok) {
    return result
  }
  
  // Type assertion after validation
  return {
    ok: true,
    data: data as MaltLibrary,
  }
}



















