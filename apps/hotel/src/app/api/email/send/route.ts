import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject, body: emailBody, attachments } = body
    
    // Validate required fields
    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { error: 'Recipients (to) are required' },
        { status: 400 }
      )
    }
    
    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: 'Subject and body are required' },
        { status: 400 }
      )
    }
    
    // Check if email is configured
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpFrom = process.env.SMTP_FROM || smtpUser || 'noreply@hotel.com'
    
    // If SMTP not configured, use demo mode (save to localStorage via client)
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('⚠️ SMTP not configured. Email will be queued for manual sending.')
      
      // Return success but indicate it's queued
      return NextResponse.json({
        success: true,
        queued: true,
        message: 'Email queued (SMTP not configured)',
        emailData: {
          to,
          subject,
          body: emailBody,
          attachments
        }
      })
    }
    
    // Configure transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || '587'),
      secure: smtpPort === '465', // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      // For development/testing
      ...(process.env.NODE_ENV === 'development' && {
        tls: {
          rejectUnauthorized: false
        }
      })
    })
    
    // Verify connection
    try {
      await transporter.verify()
      console.log('✅ SMTP server connection verified')
    } catch (error) {
      console.error('❌ SMTP verification failed:', error)
      return NextResponse.json(
        { error: 'SMTP server connection failed', details: String(error) },
        { status: 500 }
      )
    }
    
    // Prepare attachments
    const emailAttachments = attachments?.map((att: any) => ({
      filename: att.filename,
      content: att.content,
      encoding: 'base64' as const
    })) || []
    
    // Send email
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: to.join(', '),
      subject,
      html: emailBody,
      attachments: emailAttachments
    })
    
    console.log('✅ Email sent successfully:', info.messageId)
    
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully'
    })
    
  } catch (error: any) {
    console.error('❌ Email send error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        details: error.message || String(error)
      },
      { status: 500 }
    )
  }
}

// GET endpoint for testing email configuration
export async function GET() {
  const smtpHost = process.env.SMTP_HOST
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  
  return NextResponse.json({
    configured: !!(smtpHost && smtpUser && smtpPass),
    hasHost: !!smtpHost,
    hasUser: !!smtpUser,
    hasPass: !!smtpPass,
    message: smtpHost && smtpUser && smtpPass
      ? 'Email service is configured'
      : 'Email service is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.'
  })
}



