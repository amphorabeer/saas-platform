/**
 * Hop Library Validation
 * Uses AJV for JSON Schema validation
 */

import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { HopLibrary } from './types'

// Import JSON schema - using require for JSON files
// eslint-disable-next-line @typescript-eslint/no-var-requires
const hopSchema = require('./hop.schema.json')

const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)

const validate = ajv.compile(hopSchema)

/**
 * Validate hop library data against JSON schema
 */
export function validateHopLibrary(data: unknown): { ok: boolean; errors?: string[] } {
  const valid = validate(data)
  
  if (valid) {
    return { ok: true }
  }
  
  const errors = validate.errors?.map(err => {
    const path = err.instancePath || err.schemaPath
    return `${path} ${err.message}`
  }) || []
  
  return { ok: false, errors }
}

/**
 * Validate and parse hop library
 */
export function validateAndParseHopLibrary(data: unknown): { 
  ok: boolean
  data?: HopLibrary
  errors?: string[]
} {
  const result = validateHopLibrary(data)
  
  if (!result.ok) {
    return result
  }
  
  return {
    ok: true,
    data: data as HopLibrary,
  }
}



















