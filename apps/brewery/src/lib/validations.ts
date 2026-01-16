import { z } from 'zod'

export const createBatchSchema = z.object({
  recipeId: z.string().min(1, 'Recipe is required'),
  // ❌ tankId აღარ არის სავალდებულო - მინიჭება ხდება StartFermentationModalV2-ით
  volume: z.number().positive('Volume must be positive'),
  plannedDate: z.string().transform(s => new Date(s)),
  notes: z.string().optional(),
})

export const startBrewingSchema = z.object({
  originalGravity: z.number().positive().optional(),
})

export const startFermentationSchema = z.object({
  tankId: z.string().optional(),
})

export const transferSchema = z.object({
  newTankId: z.string().optional(),
})

export const markReadySchema = z.object({
  finalGravity: z.number().positive().optional(),
})

export const cancelBatchSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
})

export const gravityReadingSchema = z.object({
  gravity: z.number().positive(),
  temperature: z.number(),
  notes: z.string().optional(),
})

export const packagingSchema = z.object({
  packageType: z.enum([
    'KEG_50', 'KEG_30', 'KEG_20',
    'BOTTLE_750', 'BOTTLE_500', 'BOTTLE_330',
    'CAN_500', 'CAN_330'
  ]),
  quantity: z.number().int().positive(),
  lotNumber: z.string().optional(),
  notes: z.string().optional(),
})








