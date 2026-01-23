import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID is required' })
  }
  
  // GET - ერთი request
  if (req.method === 'GET') {
    try {
      const request = await prisma.contactRequest.findUnique({
        where: { id }
      })
      
      if (!request) {
        return res.status(404).json({ error: 'Request not found' })
      }
      
      return res.status(200).json(request)
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  }
  
  // PUT - სტატუსის/შენიშვნის განახლება
  if (req.method === 'PUT') {
    try {
      const { status, notes } = req.body
      
      const updateData: any = {}
      if (status) {
        updateData.status = status
        if (status === 'REPLIED') {
          updateData.repliedAt = new Date()
        }
      }
      if (notes !== undefined) updateData.notes = notes
      
      const request = await prisma.contactRequest.update({
        where: { id },
        data: updateData
      })
      
      return res.status(200).json({ success: true, request })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  }
  
  // DELETE
  if (req.method === 'DELETE') {
    try {
      await prisma.contactRequest.delete({
        where: { id }
      })
      
      return res.status(200).json({ success: true })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}
