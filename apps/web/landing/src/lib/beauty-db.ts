import { Pool } from 'pg'

let beautyPool: Pool | null = null

export function getBeautyPool(): Pool {
  if (!beautyPool) {
    beautyPool = new Pool({
      connectionString: process.env.BEAUTY_DATABASE_URL,
      max: 3,
    })
  }
  return beautyPool
}
