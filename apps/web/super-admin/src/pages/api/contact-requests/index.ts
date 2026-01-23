import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET - ყველა contact request
  if (req.method === 'GET') {
    try {
      const { status, module } = req.query
      
      const where: any = {}
      if (status && status !== 'ALL') where.status = status
      if (module) where.module = module
      
      const requests = await prisma.contactRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      })
      
      return res.status(200).json(requests)
    } catch (error: any) {
      console.error('Error fetching contact requests:', error)
      return res.status(500).json({ error: error.message })
    }
  }
  
  // POST - ახალი contact request (Landing-დან)
  if (req.method === 'POST') {
    try {
      const { name, email, phone, message, module } = req.body
      
      if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email and message are required' })
      }
      
      const request = await prisma.contactRequest.create({
        data: {
          name,
          email,
          phone: phone || null,
          message,
          module: module || null,
          status: 'NEW'
        }
      })
      
      console.log(`[Contact Request] New request from ${email} for module: ${module || 'general'}`)
      
      return res.status(201).json({ success: true, request })
    } catch (error: any) {
      console.error('Error creating contact request:', error)
      return res.status(500).json({ error: error.message })
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}
